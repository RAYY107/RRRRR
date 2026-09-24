--[[
    Evora ID — request router
    ------------------------------------------------------------------
    The client sends every action through ONE net event:
        TriggerServerEvent(Events.Request, requestId, action, payload)
    and receives exactly one Events.Response for it.

    For each action the router enforces, in order:
      1. known action
      2. rate limit (normal / heavy budget)
      3. permission tier: 'self' | 'manage'   (server-side, never client-side)
      4. payload validation inside the handler
    Handlers run in their own thread and are wrapped in pcall, so a bad
    request can never break the resource.
]]

local U = EvoraUtils
local V = EvoraValidate
local E = EvoraConst.Events

local Handlers = {}

local function handle(name, opts, fn)
    Handlers[name] = { perm = opts.perm, heavy = opts.heavy == true, large = opts.large == true, fn = fn }
end

local function respond(src, reqId, ok, data, large)
    if large then
        TriggerLatentClientEvent(E.Response, src, 512000, reqId, ok, data)
    else
        TriggerClientEvent(E.Response, src, reqId, ok, data)
    end
end

local lastLog = {}

-- Logged at most once per player/action every 30 seconds (no console flood).
local function reject(src, action, why)
    if not Config.Security.LogRejections then return end
    local key = tostring(src) .. ':' .. tostring(action)
    local now = GetGameTimer()
    if lastLog[key] and now - lastLog[key] < 30000 then return end
    lastLog[key] = now
    U.warn('Rejected "%s" from %s (%s): %s', tostring(action), GetPlayerName(src) or '?', src, why)
end

AddEventHandler('playerDropped', function()
    local prefix = tostring(source) .. ':'
    for k in pairs(lastLog) do
        if k:sub(1, #prefix) == prefix then lastLog[k] = nil end
    end
end)

RegisterNetEvent(E.Request, function(reqId, action, payload)
    local src = source
    if type(reqId) ~= 'number' or type(action) ~= 'string' or #action > 32 then return end
    if payload ~= nil and type(payload) ~= 'table' then return end

    local h = Handlers[action]
    if not h then
        reject(src, action, 'unknown action')
        return respond(src, reqId, false, 'unknown_action')
    end
    if not RateLimit.allow(src, h.heavy) then
        return respond(src, reqId, false, 'rate_limited')
    end
    if h.perm == 'self' and not Perms.self(src) then
        reject(src, action, 'missing ' .. Config.Permissions.Self)
        return respond(src, reqId, false, 'no_permission')
    end
    if h.perm == 'manage' and not Perms.manage(src) then
        reject(src, action, 'missing ' .. Config.Permissions.Manage)
        return respond(src, reqId, false, 'no_permission')
    end

    CreateThread(function()
        local ok, success, data, extra = pcall(h.fn, src, payload or {})
        if not ok then
            U.error('Handler "%s" failed: %s', action, tostring(success))
            return respond(src, reqId, false, 'server_error')
        end
        if success then
            respond(src, reqId, true, data, h.large)
        else
            respond(src, reqId, false, { error = data, extra = extra })
        end
    end)
end)

local function player(src)
    local p = State.bySource(src)
    if not p or not p.ready then return nil end
    return p
end

local function imageLimits()
    local I = Config.Images
    return {
        enabled = I.Enabled, allowUrl = I.AllowUrl, allowDiscord = I.AllowDiscord,
        allowAnyHost = I.AllowAnyHost, hosts = I.AllowedHosts, allowGif = I.AllowGif,
        maxBytes = I.MaxBytes, extensions = I.Extensions,
    }
end

---------------------------------------------------------------------------
-- Self editor
---------------------------------------------------------------------------

handle('editor.bootstrap', { perm = 'self', large = true }, function(src, data)
    local p = player(src)
    if not p then return false, 'not_ready' end
    local presetVersion = tonumber(data.presetVersion)
    return true, {
        serverId = src,
        name = p.name,
        perms = Perms.summary(src),
        -- the design everyone currently sees (an expired temporary design is not live)
        design = State.effective(p.record),
        record = Designs.summary(p.record, src),
        slots = Designs.slots(p.owner),
        favorites = Designs.favorites(p.owner),
        presetVersion = Presets.version,
        presets = presetVersion ~= Presets.version and Presets.list(false) or nil,
        limits = {
            cooldownSeconds = Config.Cooldown.Enabled and Config.Cooldown.Seconds or 0,
            slots = Config.Slots.Count,
            favorites = Config.Favorites.Max,
            images = imageLimits(),
        },
        dbAvailable = DB.available,
    }
end)

handle('editor.save', { perm = 'self', heavy = true }, function(src, data)
    local design = V.design(data.design)
    if not design then return false, 'invalid_design' end
    return Designs.saveSelf(src, design)
end)

handle('slot.save', { perm = 'self', heavy = true }, function(src, data)
    local p = player(src)
    if not p then return false, 'not_ready' end
    local slot = V.slot(data.slot)
    if not slot then return false, 'invalid_slot' end
    local design = V.design(data.design)
    if not design then return false, 'invalid_design' end
    local name = V.name(data.name) or ('Design ' .. slot)
    local ok, err = Designs.saveSlot(p.owner, slot, name, design)
    if not ok then return false, err end
    return true, { slots = Designs.slots(p.owner) }
end)

handle('slot.delete', { perm = 'self' }, function(src, data)
    local p = player(src)
    if not p then return false, 'not_ready' end
    local slot = V.slot(data.slot)
    if not slot then return false, 'invalid_slot' end
    local ok, err = Designs.deleteSlot(p.owner, slot)
    if not ok then return false, err end
    return true, { slots = Designs.slots(p.owner) }
end)

handle('favorite.toggle', { perm = 'self' }, function(src, data)
    local p = player(src)
    if not p then return false, 'not_ready' end
    local kind = V.oneOf(data.kind, { 'preset', 'slot' })
    if not kind then return false, 'invalid_favorite' end
    local ref
    if kind == 'preset' then
        ref = V.presetId(data.ref)
        if not ref or not Presets.get(ref) then return false, 'preset_not_found' end
    else
        local slot = V.slot(data.ref)
        if not slot then return false, 'invalid_slot' end
        ref = tostring(slot)
    end
    local ok, state = Designs.toggleFavorite(p.owner, kind, ref)
    if not ok then return false, state end
    return true, { favorites = Designs.favorites(p.owner), active = state }
end)

-- Image preview check: same validation as on save, answered early so
-- the editor can show a clear error before the user saves.
handle('image.validate', { perm = 'self', heavy = true }, function(src, data)
    local kind = V.oneOf(data.kind, { 'url', 'discord' })
    if kind == 'url' then
        if not Config.Images.AllowUrl then return false, 'url_disabled' end
        local url = type(data.url) == 'string' and U.trim(data.url) or ''
        local ok, info = Images.validateUrl(url, false)
        if not ok then return false, info end
        return true, { url = url, kind = info.kind, size = info.size }
    elseif kind == 'discord' then
        local url, err = Images.resolveDiscord(type(data.discord) == 'string' and U.trim(data.discord) or '')
        if not url then return false, err end
        local ok, info = Images.validateUrl(url, true)
        if not ok then return false, info end
        return true, { url = url, kind = info.kind, size = info.size }
    end
    return false, 'invalid_image'
end)

handle('presets.list', { perm = 'self', large = true }, function(src)
    return true, { presetVersion = Presets.version, presets = Presets.list(Perms.manage(src)) }
end)

---------------------------------------------------------------------------
-- Management
---------------------------------------------------------------------------

local FILTERS = { 'all', 'permanent', 'temporary', 'expired', 'none', 'cooldown', 'locked' }

handle('manager.bootstrap', { perm = 'manage', large = true }, function(src, data)
    Audit.log('open_manager', src)
    return true, {
        serverId = src,
        perms = Perms.summary(src),
        presetVersion = Presets.version,
        presets = Presets.list(true),
        stats = Designs.stats(),
        settings = {
            framework = Framework.name,
            database = DB.available,
            cooldownSeconds = Config.Cooldown.Enabled and Config.Cooldown.Seconds or 0,
            managersExempt = Config.Cooldown.ManagersExempt,
            durations = Config.Temporary.Durations,
            defaultSeconds = Config.Temporary.DefaultSeconds,
            maxSeconds = Config.Temporary.MaxSeconds,
            slots = Config.Slots.Count,
            webhook = Config.Webhook.Enabled and GetConvar(Config.Webhook.UrlConvar, '') ~= '',
            allowForce = Config.Management.AllowForce,
            images = imageLimits(),
            maxDistance = Config.Render.MaxDistance,
            displayMode = Config.Render.DisplayMode,
            defaultPreset = Config.DefaultPreset,
        },
    }
end)

handle('manager.stats', { perm = 'manage', large = true }, function(src, data)
    local presetVersion = tonumber(data.presetVersion)
    return true, {
        stats = Designs.stats(),
        presetVersion = Presets.version,
        presets = presetVersion ~= Presets.version and Presets.list(true) or nil,
    }
end)

handle('manager.players', { perm = 'manage', large = true }, function(src, data)
    local filter = V.oneOf(data.filter, FILTERS, 'all')
    return true, { rows = Designs.listOnline(filter, V.search(data.search)) }
end)

handle('manager.designs', { perm = 'manage', large = true }, function(src, data)
    local filter = V.oneOf(data.filter, FILTERS, 'all')
    return true, Designs.listStored(filter, V.search(data.search), V.page(data.page))
end)

handle('manager.get', { perm = 'manage' }, function(src, data)
    local res, err = Designs.managerGet(data.owner)
    if not res then return false, err end
    return true, res
end)

handle('manager.save', { perm = 'manage', heavy = true }, function(src, data)
    local design = V.design(data.design)
    if not design then return false, 'invalid_design' end
    local mode = V.mode(data.mode)
    local seconds = data.seconds ~= nil and V.seconds(data.seconds) or nil
    if data.seconds ~= nil and not seconds then return false, 'invalid_duration' end
    local lock = data.lock
    if lock ~= nil then lock = lock == true end
    return Designs.managerSet(src, data.owner, design, { mode = mode, seconds = seconds, lock = lock })
end)

handle('manager.applyPreset', { perm = 'manage', heavy = true }, function(src, data)
    local id = V.presetId(data.presetId)
    local design = id and Presets.designOf(id)
    if not design then return false, 'preset_not_found' end
    local mode = V.mode(data.mode)
    local seconds = data.seconds ~= nil and V.seconds(data.seconds) or nil
    return Designs.managerSet(src, data.owner, design, { mode = mode, seconds = seconds, presetId = id, action = 'apply_preset' })
end)

handle('manager.force', { perm = 'manage', heavy = true }, function(src, data)
    if not Config.Management.AllowForce then return false, 'force_disabled' end
    local design
    local id = V.presetId(data.presetId)
    if id then
        design = Presets.designOf(id)
        if not design then return false, 'preset_not_found' end
    else
        design = V.design(data.design)
        if not design then return false, 'invalid_design' end
    end
    return Designs.managerSet(src, data.owner, design, {
        mode = V.mode(data.mode), seconds = data.seconds ~= nil and V.seconds(data.seconds) or nil,
        lock = true, presetId = id, action = 'force_style',
    })
end)

handle('manager.delete', { perm = 'manage' }, function(src, data)
    return Designs.managerClear(src, data.owner)
end)

handle('manager.expiration', { perm = 'manage' }, function(src, data)
    local mode = V.mode(data.mode)
    if not mode then return false, 'invalid_mode' end
    local seconds
    if mode == 'temporary' then
        seconds = V.seconds(data.seconds)
        if not seconds then return false, 'invalid_duration' end
    end
    return Designs.managerExpiration(src, data.owner, mode, seconds)
end)

handle('manager.cooldown', { perm = 'manage' }, function(src, data)
    return Designs.managerResetCooldown(src, data.owner)
end)

handle('manager.lock', { perm = 'manage' }, function(src, data)
    return Designs.managerLock(src, data.owner, data.locked == true)
end)

handle('manager.audit', { perm = 'manage', large = true }, function(src, data)
    return true, { rows = Audit.recent(data.limit) }
end)

---------------------------------------------------------------------------
-- Preset management
---------------------------------------------------------------------------

local function presetResult(p)
    State.broadcastDefault()
    return true, { preset = p and p.id or nil, presetVersion = Presets.version, presets = Presets.list(true) }
end

handle('preset.create', { perm = 'manage', heavy = true, large = true }, function(src, data)
    local design = V.design(data.design)
    if not design then return false, 'invalid_design' end
    local name = V.name(data.name, 48)
    if not name then return false, 'invalid_name' end
    local okImg, imgErr = Images.checkDesign(design)
    if not okImg then return false, imgErr end
    local p, err = Presets.create({
        name = name,
        description = V.text(data.description),
        category = V.category(data.category),
        design = design,
        featured = data.featured == true,
        locked = data.locked == true,
        hidden = data.hidden == true,
    }, Framework.ownerKey(src))
    if not p then return false, err end
    Audit.log('preset_create', src, nil, p.name .. ' (' .. p.id .. ')')
    return presetResult(p)
end)

handle('preset.update', { perm = 'manage', heavy = true, large = true }, function(src, data)
    local id = V.presetId(data.id)
    if not id or not Presets.get(id) then return false, 'preset_not_found' end
    local patch = {}
    if data.design ~= nil then
        patch.design = V.design(data.design)
        if not patch.design then return false, 'invalid_design' end
        local okImg, imgErr = Images.checkDesign(patch.design)
        if not okImg then return false, imgErr end
    end
    if data.name ~= nil then
        patch.name = V.name(data.name, 48)
        if not patch.name then return false, 'invalid_name' end
    end
    if data.description ~= nil then patch.description = V.text(data.description) end
    if data.category ~= nil then patch.category = V.category(data.category) end
    if data.featured ~= nil then patch.featured = data.featured == true end
    if data.locked ~= nil then patch.locked = data.locked == true end
    if data.hidden ~= nil then patch.hidden = data.hidden == true end
    local p, err = Presets.update(id, patch, Framework.ownerKey(src))
    if not p then return false, err end
    Audit.log('preset_update', src, nil, p.name .. ' (' .. p.id .. ')')
    return presetResult(p)
end)

handle('preset.duplicate', { perm = 'manage', large = true }, function(src, data)
    local id = V.presetId(data.id)
    if not id then return false, 'preset_not_found' end
    local p, err = Presets.duplicate(id, Framework.ownerKey(src))
    if not p then return false, err end
    Audit.log('preset_create', src, nil, p.name .. ' (copy of ' .. id .. ')')
    return presetResult(p)
end)

handle('preset.delete', { perm = 'manage', large = true }, function(src, data)
    local id = V.presetId(data.id)
    if not id then return false, 'preset_not_found' end
    local p, err = Presets.delete(id)
    if not p then return false, err end
    Audit.log('preset_delete', src, nil, p.name .. ' (' .. p.id .. ')')
    return presetResult(nil)
end)

handle('preset.reorder', { perm = 'manage', large = true }, function(src, data)
    local ids = V.idList(data.ids)
    if not ids then return false, 'invalid_order' end
    local ok, err = Presets.reorder(ids, Framework.ownerKey(src))
    if not ok then return false, err end
    Audit.log('preset_update', src, nil, 'reordered presets')
    return presetResult(nil)
end)
