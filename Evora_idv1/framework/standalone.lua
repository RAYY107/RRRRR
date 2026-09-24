--[[
    Evora ID — adapter: standalone
    Used when no vRP flavour is found (or when forced). Accounts are
    identified by their Rockstar license and permissions come from
    FiveM ACE:
        add_ace group.admin evora.idname.manage allow
        add_ace builtin.everyone evora.idname.self allow
]]

local Adapter = { name = 'standalone', keyPrefix = 'license' }
EvoraAdapters.standalone = Adapter

function Adapter:detect()
    return true
end

function Adapter:init()
    return true
end

function Adapter:getUserId(src)
    local license = GetPlayerIdentifierByType(tostring(src), 'license')
    if not license then return nil end
    return (license:gsub('^license:', ''))
end

function Adapter:hasPermission(src, perm)
    return IsPlayerAceAllowed(tostring(src), perm)
end

function Adapter:getName(src)
    return GetPlayerName(src)
end
