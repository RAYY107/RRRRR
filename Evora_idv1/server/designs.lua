--[[
    Evora ID — design service (server-authoritative)
    ------------------------------------------------------------------
    Every change to what players see goes through this file:
      * self saves (permission, lock, cooldown, validation, images)
      * manager edits (mode, expiry, lock, cooldown reset, presets)
      * expiry of temporary designs (in-memory check, no DB polling)
    The ID drawn is always the player's live server id; designs only
    describe its appearance.
]]

Designs = {}

local U = EvoraUtils
local PE = EvoraConst.PublicEvents

local function now() return os.time() end

---------------------------------------------------------------------------
-- Records
---------------------------------------------------------------------------

local function bool(v) return v == true or v == 1 or v == '1' end

local function rowToRecord(row)
    if not row then
        return { mode = 'permanent', locked = false, exists = false }
    end
    local design = row.design and EvoraSchema.fromJson(row.design) or nil
    return {
        design = design,
        hash = design and U.designHash(design) or nil,
        presetId = row.preset_id,
        mode = row.mode == 'temporary' and 'temporary' or 'permanent',
        expiresAt = tonumber(row.expires_at),
        locked = bool(row.locked),
        lastSelfSave = tonumber(row.last_self_save),
        updatedAt = tonumber(row.updated_at),
        displayName = row.display_name,
        exists = true,
    }
end

local function fetchRecord(owner)
    if not DB.available then return nil, 'db_unavailable' end
    local row, err = DB.single('SELECT * FROM `evora_id_designs` WHERE `owner` = ?', { owner })
    if err then return nil, 'db_error' end
    return rowToRecord(row)
end

-- Public summary of a record (sent to the NUI).
function Designs.summary(record, src)
    local t = now()
    local status = State.status(record, t)
    return {
        status = status,
        mode = record.mode,
        expiresAt = record.expiresAt,
        expiresIn = record.expiresAt and math.max(0, record.expiresAt - t) or nil,
        locked = record.locked == true,
        cooldown = State.cooldownRemaining(record, t),
        cooldownApplies = src and Perms.cooldownApplies(src) or nil,
        presetId = record.presetId,
        updatedAt = record.updatedAt,
        hasDesign = record.design ~= nil,
    }
end

---------------------------------------------------------------------------
-- Persistence
---------------------------------------------------------------------------

--[[
    Write the full record for `owner`. fields: design, presetId, mode,
    expiresAt, locked, lastSelfSave, displayName, updatedBy
]]
local function persist(owner, rec, updatedBy)
    if not DB.available then return false, 'db_unavailable' end
    local t = now()
    local designJson = rec.design and json.encode(rec.design) or nil
    local _, err = DB.update([[INSERT INTO `evora_id_designs`
        (`owner`, `display_name`, `design`, `design_hash`, `preset_id`, `mode`, `expires_at`, `locked`, `locked_by`, `last_self_save`, `updated_by`, `created_at`, `updated_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `display_name` = VALUES(`display_name`), `design` = VALUES(`design`), `design_hash` = VALUES(`design_hash`),
            `preset_id` = VALUES(`preset_id`), `mode` = VALUES(`mode`), `expires_at` = VALUES(`expires_at`), `locked` = VALUES(`locked`),
            `locked_by` = VALUES(`locked_by`), `last_self_save` = VALUES(`last_self_save`), `updated_by` = VALUES(`updated_by`),
            `updated_at` = VALUES(`updated_at`)]], {
        owner,
        rec.displayName and U.cleanText(rec.displayName, 64) or nil,
        designJson,
        rec.design and U.designHash(rec.design) or nil,
        rec.presetId,
        rec.mode or 'permanent',
        rec.expiresAt,
        rec.locked and 1 or 0,
        rec.locked and updatedBy or nil,
        rec.lastSelfSave,
        updatedBy,
        t,
        t,
    })
    if err then return false, 'db_error' end
    rec.updatedAt = t
    rec.exists = true
    rec.hash = rec.design and U.designHash(rec.design) or nil
    return true
end

-- Applies a new record for an owner (online or offline) and syncs.
local function commit(owner, rec, updatedBy)
    local ok, err = persist(owner, rec, updatedBy)
    if not ok then return false, err end
    local p, src = State.byOwner(owner)
    if p then
        p.record = rec
        State.refresh(src)
    end
    return true
end

---------------------------------------------------------------------------
-- Player lifecycle
---------------------------------------------------------------------------

function Designs.onPlayerReady(src)
    src = tonumber(src)
    if not src or not GetPlayerName(src) then return end
    local existing = State.players[src]
    if existing and existing.ready then
        State.sendSnapshot(src)
        return
    end
    if existing and existing.loading then return end
    State.players[src] = existing or { src = src, ready = false }
    State.players[src].loading = true

    CreateThread(function()
        -- vRP assigns the account id during connection; wait for it.
        local owner
        for _ = 1, 40 do
            if not GetPlayerName(src) then return end
            owner = Framework.ownerKey(src)
            if owner then break end
            Wait(1500)
        end
        if not owner then
            U.warn('Could not resolve an account for player %s; their design will not load.', src)
            if State.players[src] then State.players[src].loading = false end
            State.sendSnapshot(src)
            return
        end

        local record = DB.available and fetchRecord(owner) or rowToRecord(nil)
        record = record or rowToRecord(nil)
        local name = Framework.getName(src)

        local p = State.players[src]
        if not p then return end
        p.owner = owner
        p.name = name
        p.record = record
        p.ready = true
        p.loading = false
        State.ownerIndex[owner] = src

        -- keep the last known name for offline listings
        if DB.available and record.exists and record.displayName ~= name then
            DB.update('UPDATE `evora_id_designs` SET `display_name` = ? WHERE `owner` = ?', { U.cleanText(name or '', 64), owner })
            record.displayName = name
        end

        -- refresh Discord avatars that may have changed
        if record.design and record.design.image.on and record.design.image.kind == 'discord' then
            local age = now() - (record.updatedAt or 0)
            if age > (Config.Images.Discord.RefreshHours or 24) * 3600 and Images.refreshDiscord(record.design) then
                persist(owner, record, record.updatedBy)
            end
        end

        State.refresh(src)
        State.sendSnapshot(src)

        TriggerEvent(PE.DesignLoaded, {
            serverId = src,
            owner = owner,
            status = State.status(record),
            design = State.effective(record),
        })
    end)
end

function Designs.onPlayerDropped(src)
    State.remove(src)
end

---------------------------------------------------------------------------
-- Expiry (in memory, online players only)
---------------------------------------------------------------------------

CreateThread(function()
    while true do
        Wait((Config.Temporary.CheckInterval or 60) * 1000)
        local t = now()
        for src, p in pairs(State.players) do
            local rec = p.record
            if p.ready and rec and rec.design and rec.mode == 'temporary' and rec.expiresAt and rec.expiresAt <= t and State.active[src] then
                State.refresh(src)
                TriggerEvent(PE.DesignExpired, { serverId = src, owner = p.owner, presetId = rec.presetId, expiredAt = rec.expiresAt })
                U.debug('Temporary design of %s expired.', src)
            end
        end
    end
end)

---------------------------------------------------------------------------
-- Self service
---------------------------------------------------------------------------

--[[
    Save the active design of `src` from the self editor.
    Returns ok, result|errKey, extra
]]
function Designs.saveSelf(src, design)
    local p = State.bySource(src)
    if not p or not p.ready then return false, 'not_ready' end
    if not Perms.self(src) then return false, 'no_permission' end
    if not DB.available then return false, 'db_unavailable' end

    local rec = p.record
    if rec.locked and not Perms.manage(src) then return false, 'locked' end

    local t = now()
    if Perms.cooldownApplies(src) then
        local left = State.cooldownRemaining(rec, t)
        if left > 0 then return false, 'cooldown', { remaining = left } end
    end

    local lockedPreset = Presets.lockedMatch(design)
    if lockedPreset and not Perms.manage(src) then return false, 'preset_locked' end
    local metaPreset = design.meta and design.meta.preset ~= '' and Presets.get(design.meta.preset)
    if metaPreset and metaPreset.locked and not Perms.manage(src) then return false, 'preset_locked' end

    local okImg, imgErr = Images.checkDesign(design)
    if not okImg then return false, imgErr end

    local keep = rec.mode == 'temporary' and State.status(rec, t) == 'temporary' and Config.Temporary.SelfEditKeepsExpiry
    local nextRec = {
        design = design,
        presetId = metaPreset and metaPreset.id or nil,
        mode = keep and 'temporary' or 'permanent',
        expiresAt = keep and rec.expiresAt or nil,
        locked = rec.locked,
        lastSelfSave = t,              -- the cooldown starts only here, after a successful save
        displayName = p.name,
    }
    local ok, err = commit(p.owner, nextRec, p.owner)
    if not ok then return false, err end

    Audit.log('self_save', src, { owner = p.owner, name = p.name, serverId = src }, metaPreset and metaPreset.name or 'custom')
    TriggerEvent(PE.DesignSaved, { serverId = src, owner = p.owner, design = design, by = 'self' })
    if metaPreset then
        TriggerEvent(PE.PresetApplied, { serverId = src, owner = p.owner, presetId = metaPreset.id, by = 'self' })
    end
    return true, Designs.summary(p.record, src)
end

---------------------------------------------------------------------------
-- Slots / favourites
---------------------------------------------------------------------------

function Designs.slots(owner)
    if not DB.available then return {} end
    local rows = DB.query('SELECT `slot`, `name`, `design`, `updated_at` FROM `evora_id_slots` WHERE `owner` = ? ORDER BY `slot`', { owner }) or {}
    local out = {}
    for _, r in ipairs(rows) do
        local slot = tonumber(r.slot)
        if slot and slot >= 1 and slot <= Config.Slots.Count then
            local d = EvoraSchema.fromJson(r.design)
            if d then out[#out + 1] = { slot = slot, name = r.name, design = d, updatedAt = tonumber(r.updated_at) } end
        end
    end
    return out
end

function Designs.saveSlot(owner, slot, name, design)
    if not DB.available then return false, 'db_unavailable' end
    local _, err = DB.update([[INSERT INTO `evora_id_slots` (`owner`, `slot`, `name`, `design`, `updated_at`) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `design` = VALUES(`design`), `updated_at` = VALUES(`updated_at`)]],
        { owner, slot, name, json.encode(design), now() })
    if err then return false, 'db_error' end
    return true
end

function Designs.deleteSlot(owner, slot)
    if not DB.available then return false, 'db_unavailable' end
    local _, err = DB.update('DELETE FROM `evora_id_slots` WHERE `owner` = ? AND `slot` = ?', { owner, slot })
    if err then return false, 'db_error' end
    return true
end

function Designs.favorites(owner)
    if not DB.available then return {} end
    local rows = DB.query('SELECT `kind`, `ref` FROM `evora_id_favorites` WHERE `owner` = ? ORDER BY `created_at` DESC', { owner }) or {}
    local out = {}
    for _, r in ipairs(rows) do out[#out + 1] = { kind = r.kind, ref = r.ref } end
    return out
end

function Designs.toggleFavorite(owner, kind, ref)
    if not DB.available then return false, 'db_unavailable' end
    local exists = DB.scalar('SELECT 1 FROM `evora_id_favorites` WHERE `owner` = ? AND `kind` = ? AND `ref` = ?', { owner, kind, ref })
    if exists then
        DB.update('DELETE FROM `evora_id_favorites` WHERE `owner` = ? AND `kind` = ? AND `ref` = ?', { owner, kind, ref })
        return true, false
    end
    local count = tonumber(DB.scalar('SELECT COUNT(*) FROM `evora_id_favorites` WHERE `owner` = ?', { owner })) or 0
    if count >= (Config.Favorites.Max or 40) then return false, 'favorites_full' end
    local _, err = DB.update('INSERT INTO `evora_id_favorites` (`owner`, `kind`, `ref`, `created_at`) VALUES (?, ?, ?, ?)', { owner, kind, ref, now() })
    if err then return false, 'db_error' end
    return true, true
end

---------------------------------------------------------------------------
-- Management
---------------------------------------------------------------------------

-- Resolve a target owner. Only owners that are online or already have a
-- row can be managed (no arbitrary keys).
function Designs.resolveTarget(owner)
    if not EvoraValidate.ownerKey(owner) then return nil, 'invalid_target' end
    local p, src = State.byOwner(owner)
    if p and p.ready then
        return { owner = owner, src = src, name = p.name, record = p.record, online = true }
    end
    local rec, err = fetchRecord(owner)
    if not rec then return nil, err end
    if not rec.exists then return nil, 'target_not_found' end
    return { owner = owner, name = rec.displayName, record = rec, online = false }
end

local function targetInfo(t)
    return { owner = t.owner, name = t.name, serverId = t.src }
end

local function expiryFrom(opts, fallback)
    if opts.mode == 'temporary' then
        local seconds = tonumber(opts.seconds)
        if not seconds then
            -- keep the current expiry when none is given
            if fallback and fallback > now() then return 'temporary', fallback end
            seconds = Config.Temporary.DefaultSeconds
        end
        seconds = U.clamp(math.floor(seconds), 60, Config.Temporary.MaxSeconds)
        return 'temporary', now() + seconds
    end
    return 'permanent', nil
end

--[[
    Manager write. opts = { mode, seconds, lock, presetId, action, detail }
]]
function Designs.managerSet(actorSrc, owner, design, opts)
    local target, err = Designs.resolveTarget(owner)
    if not target then return false, err end
    opts = opts or {}

    local okImg, imgErr = Images.checkDesign(design)
    if not okImg then return false, imgErr end

    local rec = target.record
    local mode, expiresAt = expiryFrom({ mode = opts.mode or rec.mode, seconds = opts.seconds }, rec.expiresAt)
    local preset = opts.presetId and Presets.get(opts.presetId)
        or (design.meta and design.meta.preset ~= '' and Presets.get(design.meta.preset)) or nil

    local nextRec = {
        design = design,
        presetId = preset and preset.id or nil,
        mode = mode,
        expiresAt = expiresAt,
        locked = opts.lock == nil and rec.locked or opts.lock == true,
        lastSelfSave = rec.lastSelfSave,
        displayName = target.name or rec.displayName,
    }
    local actorOwner = Framework.ownerKey(actorSrc) or 'server'
    local ok, cerr = commit(owner, nextRec, actorOwner)
    if not ok then return false, cerr end

    Audit.log(opts.action or 'edit_design', actorSrc, targetInfo(target), opts.detail or (preset and preset.name) or 'custom')
    TriggerEvent(PE.DesignSaved, { serverId = target.src, owner = owner, design = design, by = 'manager' })
    if preset then
        TriggerEvent(PE.PresetApplied, { serverId = target.src, owner = owner, presetId = preset.id, by = 'manager' })
    end
    return true, Designs.summary(nextRec)
end

function Designs.managerClear(actorSrc, owner)
    local target, err = Designs.resolveTarget(owner)
    if not target then return false, err end
    local rec = target.record
    local nextRec = {
        design = nil, presetId = nil, mode = 'permanent', expiresAt = nil,
        locked = rec.locked, lastSelfSave = rec.lastSelfSave, displayName = target.name or rec.displayName,
    }
    local ok, cerr = commit(owner, nextRec, Framework.ownerKey(actorSrc) or 'server')
    if not ok then return false, cerr end
    Audit.log('delete_design', actorSrc, targetInfo(target))
    TriggerEvent(PE.DesignRemoved, { serverId = target.src, owner = owner, by = 'manager' })
    return true, Designs.summary(nextRec)
end

function Designs.managerExpiration(actorSrc, owner, mode, seconds)
    local target, err = Designs.resolveTarget(owner)
    if not target then return false, err end
    local rec = U.copy(target.record)
    if not rec.design then return false, 'no_design' end
    rec.mode, rec.expiresAt = expiryFrom({ mode = mode, seconds = seconds }, nil)
    rec.displayName = target.name or rec.displayName
    local ok, cerr = commit(owner, rec, Framework.ownerKey(actorSrc) or 'server')
    if not ok then return false, cerr end
    local detail = rec.mode == 'temporary' and ('temporary · ' .. U.formatDuration(rec.expiresAt - now())) or 'permanent'
    Audit.log('change_expiration', actorSrc, targetInfo(target), detail)
    return true, Designs.summary(rec)
end

function Designs.managerResetCooldown(actorSrc, owner)
    local target, err = Designs.resolveTarget(owner)
    if not target then return false, err end
    local rec = U.copy(target.record)
    rec.lastSelfSave = nil
    rec.displayName = target.name or rec.displayName
    local ok, cerr = commit(owner, rec, Framework.ownerKey(actorSrc) or 'server')
    if not ok then return false, cerr end
    Audit.log('reset_cooldown', actorSrc, targetInfo(target))
    return true, Designs.summary(rec)
end

function Designs.managerLock(actorSrc, owner, locked)
    local target, err = Designs.resolveTarget(owner)
    if not target then return false, err end
    local rec = U.copy(target.record)
    rec.locked = locked == true
    rec.displayName = target.name or rec.displayName
    local ok, cerr = commit(owner, rec, Framework.ownerKey(actorSrc) or 'server')
    if not ok then return false, cerr end
    Audit.log('lock_design', actorSrc, targetInfo(target), rec.locked and 'locked' or 'unlocked')
    return true, Designs.summary(rec)
end

function Designs.managerGet(owner)
    local target, err = Designs.resolveTarget(owner)
    if not target then return nil, err end
    local rec = target.record
    return {
        owner = owner,
        name = target.name or rec.displayName,
        serverId = target.src,
        online = target.online,
        design = rec.design,
        summary = Designs.summary(rec),
    }
end

-- Online players with their state. filter: all|permanent|temporary|expired|none|cooldown|locked
function Designs.listOnline(filter, search)
    local out, t = {}, now()
    search = search and U.trim(search):lower() or ''
    local searchId = tonumber(search)
    for src, p in pairs(State.players) do
        if p.ready then
            local st = State.status(p.record, t)
            local cd = State.cooldownRemaining(p.record, t)
            local keep = filter == 'all' or filter == nil or filter == st
                or (filter == 'cooldown' and cd > 0) or (filter == 'locked' and p.record.locked)
            if keep and search ~= '' then
                if searchId then
                    keep = src == searchId
                else
                    keep = (p.name or ''):lower():find(search, 1, true) ~= nil
                end
            end
            if keep then
                out[#out + 1] = {
                    serverId = src,
                    name = p.name,
                    owner = p.owner,
                    online = true,
                    status = st,
                    mode = p.record.mode,
                    expiresIn = p.record.expiresAt and math.max(0, p.record.expiresAt - t) or nil,
                    locked = p.record.locked,
                    cooldown = cd,
                    presetId = p.record.presetId,
                    design = p.record.design,
                }
            end
        end
    end
    table.sort(out, function(a, b) return a.serverId < b.serverId end)
    return out
end

-- Stored designs (online + offline), paged. filter: all|permanent|temporary|expired
function Designs.listStored(filter, search, page)
    if not DB.available then return { rows = {}, total = 0 } end
    local t = now()
    local where, params = { '`design` IS NOT NULL' }, {}
    if filter == 'permanent' then
        where[#where + 1] = "`mode` = 'permanent'"
    elseif filter == 'temporary' then
        where[#where + 1] = "`mode` = 'temporary' AND `expires_at` > ?"
        params[#params + 1] = t
    elseif filter == 'expired' then
        where[#where + 1] = "`mode` = 'temporary' AND `expires_at` <= ?"
        params[#params + 1] = t
    elseif filter == 'locked' then
        where[#where + 1] = '`locked` = 1'
    end
    search = search and U.cleanText(search, 48) or ''
    if search ~= '' then
        local asId = tonumber(search)
        local online = asId and State.players[asId]
        if online and online.owner then
            where[#where + 1] = '`owner` = ?'
            params[#params + 1] = online.owner
        else
            local escaped = search:gsub('[\\%%_]', '\\%0')
            where[#where + 1] = '(`display_name` LIKE ? OR `owner` = ?)'
            params[#params + 1] = '%' .. escaped .. '%'
            params[#params + 1] = search
        end
    end
    local whereSql = table.concat(where, ' AND ')
    local total = tonumber(DB.scalar('SELECT COUNT(*) FROM `evora_id_designs` WHERE ' .. whereSql, params)) or 0

    local pageSize = Config.Management.PageSize or 40
    page = math.max(1, math.floor(tonumber(page) or 1))
    local qp = U.copy(params)
    qp[#qp + 1] = pageSize
    qp[#qp + 1] = (page - 1) * pageSize
    local rows = DB.query('SELECT `owner`, `display_name`, `design`, `preset_id`, `mode`, `expires_at`, `locked`, `last_self_save`, `updated_at` FROM `evora_id_designs` WHERE '
        .. whereSql .. ' ORDER BY `updated_at` DESC LIMIT ? OFFSET ?', qp) or {}

    local out = {}
    for _, r in ipairs(rows) do
        local rec = rowToRecord(r)
        local p, src = State.byOwner(r.owner)
        out[#out + 1] = {
            owner = r.owner,
            name = (p and p.name) or r.display_name,
            serverId = src,
            online = p ~= nil,
            status = State.status(rec, t),
            mode = rec.mode,
            expiresIn = rec.expiresAt and math.max(0, rec.expiresAt - t) or nil,
            locked = rec.locked,
            cooldown = State.cooldownRemaining(rec, t),
            presetId = rec.presetId,
            design = rec.design,
            updatedAt = rec.updatedAt,
        }
    end
    return { rows = out, total = total, page = page, pageSize = pageSize }
end

function Designs.stats()
    local t = now()
    local s = { online = 0, permanent = 0, temporary = 0, expired = 0, none = 0 }
    for _, p in pairs(State.players) do
        if p.ready then
            s.online = s.online + 1
            local st = State.status(p.record, t)
            s[st] = (s[st] or 0) + 1
        end
    end
    if DB.available then
        local row = DB.single([[SELECT
            SUM(CASE WHEN `design` IS NOT NULL AND `mode` = 'permanent' THEN 1 ELSE 0 END) AS `permanent`,
            SUM(CASE WHEN `design` IS NOT NULL AND `mode` = 'temporary' AND `expires_at` > ? THEN 1 ELSE 0 END) AS `temporary`,
            SUM(CASE WHEN `design` IS NOT NULL AND `mode` = 'temporary' AND `expires_at` <= ? THEN 1 ELSE 0 END) AS `expired`
            FROM `evora_id_designs`]], { t, t })
        if row then
            s.storedPermanent = tonumber(row.permanent) or 0
            s.storedTemporary = tonumber(row.temporary) or 0
            s.storedExpired = tonumber(row.expired) or 0
        end
    end
    return s
end
