--[[
    Evora ID — framework adapter
    ------------------------------------------------------------------
    The rest of the resource never talks to vRP directly. It calls the
    small interface below, and one adapter (framework/vrp/*.lua or
    framework/standalone.lua) implements it for the installed framework.

    Interface every adapter implements:
      adapter:init()                    -> ok, err
      adapter:getUserId(src)            -> stable account id or nil (not loaded yet)
      adapter:hasPermission(src, perm)  -> boolean
      adapter:getName(src)              -> character / display name or nil
      adapter:registerMenus(handlers)   -> BuilderMenu integration (optional)

    Owner keys (database primary keys) are built here as '<prefix>:<id>',
    e.g. 'vrp:42' or 'license:ab12...'. They identify the ACCOUNT that
    owns a design. The number drawn above the head is always the live
    FiveM server id and is never taken from these keys.
]]

EvoraAdapters = EvoraAdapters or {}

Framework = {
    adapter = nil,
    name = 'none',
    ready = false,
}

local U = EvoraUtils

-- Adapters in detection order (most specific first).
local ORDER = { 'vrp2', 'vrp_creative', 'vrp_legacy', 'vrp_modern', 'standalone' }

local function pick()
    local forced = Config.Framework.Adapter
    if forced and forced ~= 'auto' then
        local a = EvoraAdapters[forced]
        if not a then
            U.error('Config.Framework.Adapter "%s" does not exist; falling back to auto detection.', forced)
        else
            return a
        end
    end
    for _, name in ipairs(ORDER) do
        local a = EvoraAdapters[name]
        if a and a.detect and a:detect() then return a end
    end
    return EvoraAdapters.standalone
end

function Framework.init()
    local res = Config.Framework.ResourceName
    -- give vRP time to start when it is listed after us
    if Config.Framework.Adapter ~= 'standalone' then
        local waited = 0
        while GetResourceState(res) == 'starting' and waited < (Config.Framework.StartTimeout * 1000) do
            Wait(250)
            waited = waited + 250
        end
    end

    local adapter = pick()
    local ok, err = adapter:init()
    if not ok then
        U.error('Framework adapter "%s" failed to initialise: %s. Using standalone mode.', adapter.name, tostring(err))
        adapter = EvoraAdapters.standalone
        adapter:init()
    end

    Framework.adapter = adapter
    Framework.name = adapter.name
    Framework.ready = true
    U.info('Framework adapter: ^2%s^7', adapter.name)
    return true
end

function Framework.ownerKey(src)
    local a = Framework.adapter
    if not a then return nil end
    local ok, id = pcall(a.getUserId, a, src)
    if not ok or id == nil then return nil end
    return (a.keyPrefix or 'vrp') .. ':' .. tostring(id)
end

-- Map one of our permission names to the framework's own name.
local function mapPerm(perm)
    local map = Config.Permissions.Map
    return (map and map[perm]) or perm
end

function Framework.hasPermission(src, perm)
    local a = Framework.adapter
    if a then
        local ok, res = pcall(a.hasPermission, a, src, mapPerm(perm))
        if ok and res then return true end
        if not ok then U.debug('permission check error: %s', tostring(res)) end
    end
    if Config.Permissions.AceFallback and IsPlayerAceAllowed(src, perm) then
        return true
    end
    return false
end

function Framework.getName(src)
    local a = Framework.adapter
    if a and a.getName then
        local ok, name = pcall(a.getName, a, src)
        if ok and type(name) == 'string' and name ~= '' then return name end
    end
    return GetPlayerName(src)
end

function Framework.registerMenus(handlers)
    if not Config.BuilderMenu.Enabled then return end
    local a = Framework.adapter
    if not a or not a.registerMenus then
        U.debug('BuilderMenu: adapter "%s" has no menu builder.', a and a.name or 'none')
        return
    end
    local ok, err = pcall(a.registerMenus, a, handlers)
    if not ok then U.warn('BuilderMenu registration failed: %s', tostring(err)) end
end
