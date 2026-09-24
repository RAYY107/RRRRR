--[[
    Evora ID — vRP bridge
    ------------------------------------------------------------------
    Loads vRP's Proxy library at runtime instead of through a hard
    '@vrp/lib/utils.lua' include, so the resource still starts (in
    standalone mode) when vRP is missing, renamed or broken.
    Also provides light source inspection used for flavour detection.
]]

EvoraVrp = {}

local U = EvoraUtils
local proxyCache

function EvoraVrp.resource()
    return Config.Framework.ResourceName
end

function EvoraVrp.running()
    return GetResourceState(EvoraVrp.resource()) == 'started'
end

function EvoraVrp.file(path)
    return LoadResourceFile(EvoraVrp.resource(), path)
end

function EvoraVrp.hasFile(path)
    return EvoraVrp.file(path) ~= nil
end

-- True when any of the candidate files contains one of the patterns.
function EvoraVrp.sourceContains(files, patterns)
    for _, f in ipairs(files) do
        local src = EvoraVrp.file(f)
        if src then
            for _, p in ipairs(patterns) do
                if src:find(p, 1, true) then return true end
            end
        end
    end
    return false
end

-- Returns Proxy, Tunnel (vRP libraries) or nil, err.
function EvoraVrp.libs()
    if proxyCache then return proxyCache.Proxy, proxyCache.Tunnel end
    if not EvoraVrp.running() then return nil, 'resource "' .. EvoraVrp.resource() .. '" is not started' end

    if type(module) ~= 'function' then
        local code = EvoraVrp.file('lib/utils.lua')
        if not code then return nil, 'lib/utils.lua not found in ' .. EvoraVrp.resource() end
        local chunk, err = load(code, '@@' .. EvoraVrp.resource() .. '/lib/utils.lua', 't', _ENV)
        if not chunk then return nil, err end
        local ok, runErr = pcall(chunk)
        if not ok then return nil, runErr end
        if type(module) ~= 'function' then return nil, 'vRP utils did not define module()' end
    end

    local okP, Proxy = pcall(module, EvoraVrp.resource(), 'lib/Proxy')
    if not okP or not Proxy then return nil, 'could not load lib/Proxy' end
    local okT, Tunnel = pcall(module, EvoraVrp.resource(), 'lib/Tunnel')
    proxyCache = { Proxy = Proxy, Tunnel = okT and Tunnel or nil }
    return Proxy, proxyCache.Tunnel
end

function EvoraVrp.interface(name)
    local Proxy, err = EvoraVrp.libs()
    if not Proxy then return nil, err end
    local ok, iface = pcall(Proxy.getInterface, name or 'vRP')
    if not ok or not iface then return nil, 'Proxy.getInterface failed' end
    return iface
end

-- Dunko-style proxies take one table of arguments plus an optional
-- callback. This detects it from the Proxy source.
function EvoraVrp.usesTableArgs()
    local src = EvoraVrp.file('lib/Proxy.lua') or ''
    return src:find('function(args,callback)', 1, true) ~= nil
        or src:find('function(args, callback)', 1, true) ~= nil
end

-- Calls a legacy (table argument) proxy function and returns its results
-- whether the proxy returns them directly or through the callback.
function EvoraVrp.legacyCall(fn, ...)
    local cbResult
    local direct = table.pack(fn({ ... }, function(...) cbResult = table.pack(...) end))
    if cbResult then return table.unpack(cbResult, 1, cbResult.n) end
    return table.unpack(direct, 1, direct.n)
end

-- Picks a readable name from the different identity layouts used by forks.
function EvoraVrp.nameFromIdentity(identity)
    if type(identity) ~= 'table' then return nil end
    local first = identity.firstname or identity.name2 or identity.Name or identity.first_name
    local last = identity.name or identity.Lastname or identity.lastname or identity.last_name
    if identity.Name and identity.Lastname then first, last = identity.Name, identity.Lastname end
    local full = U.trim(((first or '') .. ' ' .. (last or '')))
    if full == '' then return nil end
    return full
end
