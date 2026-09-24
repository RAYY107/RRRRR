--[[
    Evora ID — server exports (developer API)
    ------------------------------------------------------------------
    Read exports return copies (never live tables). Write exports run
    asynchronously (they touch the database and may validate an image
    over HTTP) and report back through an optional callback:
        cb(ok, resultOrErrorKey)
    Every design passed in is sanitized exactly like one from the editor.
    Full documentation: docs/README.md — "Developer API".
]]

local U = EvoraUtils

local function ownerOf(serverId)
    local p = State.bySource(serverId)
    if not p or not p.ready or not p.owner then return nil end
    return p.owner, p
end

local function async(cb, fn)
    CreateThread(function()
        local ok, a, b = pcall(fn)
        if not ok then
            U.error('export failed: %s', tostring(a))
            a, b = false, 'server_error'
        end
        if type(cb) == 'function' then
            local okCb, err = pcall(cb, a, b)
            if not okCb then U.error('export callback error: %s', tostring(err)) end
        end
    end)
    return true
end

-- GetPlayerDesign(serverId) -> { design, status, mode, expiresIn, locked, presetId } | nil
exports('GetPlayerDesign', function(serverId)
    local owner, p = ownerOf(tonumber(serverId))
    if not owner then return nil end
    local summary = Designs.summary(p.record)
    summary.design = U.copy(State.effective(p.record))
    summary.serverId = tonumber(serverId)
    return summary
end)

-- SetPlayerDesign(serverId, design, { mode = 'permanent'|'temporary', seconds = n, lock = bool }, cb)
exports('SetPlayerDesign', function(serverId, design, opts, cb)
    if type(opts) == 'function' then cb, opts = opts, nil end
    return async(cb, function()
        local owner = ownerOf(tonumber(serverId))
        if not owner then return false, 'player_not_ready' end
        local clean = EvoraSchema.sanitize(U.copy(design))
        if not clean then return false, 'invalid_design' end
        opts = type(opts) == 'table' and opts or {}
        local seconds = opts.seconds ~= nil and EvoraValidate.seconds(opts.seconds) or nil
        return Designs.managerSet(nil, owner, clean, {
            mode = EvoraValidate.mode(opts.mode), seconds = seconds,
            lock = opts.lock == nil and nil or opts.lock == true,
            action = 'edit_design', detail = 'export:' .. (GetInvokingResource() or '?'),
        })
    end)
end)

-- ClearPlayerDesign(serverId, cb)
exports('ClearPlayerDesign', function(serverId, cb)
    return async(cb, function()
        local owner = ownerOf(tonumber(serverId))
        if not owner then return false, 'player_not_ready' end
        return Designs.managerClear(nil, owner)
    end)
end)

-- ApplyPreset(serverId, presetId, { mode, seconds, lock }, cb)
exports('ApplyPreset', function(serverId, presetId, opts, cb)
    if type(opts) == 'function' then cb, opts = opts, nil end
    return async(cb, function()
        local owner = ownerOf(tonumber(serverId))
        if not owner then return false, 'player_not_ready' end
        local id = EvoraValidate.presetId(presetId)
        local design = id and Presets.designOf(id)
        if not design then return false, 'preset_not_found' end
        opts = type(opts) == 'table' and opts or {}
        return Designs.managerSet(nil, owner, design, {
            mode = EvoraValidate.mode(opts.mode),
            seconds = opts.seconds ~= nil and EvoraValidate.seconds(opts.seconds) or nil,
            lock = opts.lock == nil and nil or opts.lock == true,
            presetId = id, action = 'apply_preset', detail = id .. ' · export:' .. (GetInvokingResource() or '?'),
        })
    end)
end)

-- ResetCooldown(serverId, cb)
exports('ResetCooldown', function(serverId, cb)
    return async(cb, function()
        local owner = ownerOf(tonumber(serverId))
        if not owner then return false, 'player_not_ready' end
        return Designs.managerResetCooldown(nil, owner)
    end)
end)

-- GetPreset(presetId) -> { id, name, description, category, builtin, featured, locked, design } | nil
exports('GetPreset', function(presetId)
    local p = Presets.get(presetId)
    if not p then return nil end
    return U.copy({
        id = p.id, name = p.name, nameAr = p.nameAr, description = p.description, category = p.category,
        builtin = p.builtin, featured = p.featured, locked = p.locked, hidden = p.hidden, design = p.design,
    })
end)

-- GetPresets() -> list of presets visible to players (without designs)
exports('GetPresets', function()
    local out = {}
    for _, p in ipairs(Presets.list(false)) do
        out[#out + 1] = { id = p.id, name = p.name, nameAr = p.nameAr, category = p.category, featured = p.featured, locked = p.locked }
    end
    return out
end)

-- ValidateDesign(design) -> sanitizedDesign | nil
exports('ValidateDesign', function(design)
    return EvoraSchema.sanitize(U.copy(design))
end)
