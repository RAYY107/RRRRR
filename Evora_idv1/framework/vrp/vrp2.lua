--[[
    Evora ID — adapter: vRP 2 (ImagicTheCat, extension based)
    vRP 2 exposes its API as Lua objects inside the vRP resource, so a
    small extension (framework/vrp/vrp2_ext.lua) is loaded into vRP with
    vRP.loadScript. It publishes a proxy interface "evora_vrp2" that this
    adapter calls, and registers the BuilderMenu entries.
]]

local Adapter = { name = 'vrp2', keyPrefix = 'vrp' }
EvoraAdapters.vrp2 = Adapter

local handlers = {}

function Adapter:detect()
    return EvoraVrp.running() and (EvoraVrp.hasFile('lib/Luaoop.lua') or EvoraVrp.hasFile('lib/luaoop.lua'))
end

function Adapter:init()
    local vRP, err = EvoraVrp.interface('vRP')
    if not vRP then return false, err end

    local ok, loadErr = pcall(vRP.loadScript, GetCurrentResourceName(), 'framework/vrp/vrp2_ext')
    if not ok then return false, 'vRP.loadScript failed: ' .. tostring(loadErr) end

    local bridge = EvoraVrp.interface('evora_vrp2')
    if not bridge then return false, 'evora_vrp2 interface unavailable' end
    self.bridge = bridge

    -- menu actions raised by the extension. AddEventHandler without
    -- RegisterNetEvent: clients cannot trigger this event.
    AddEventHandler('evora_id:vrp2:menu', function(src, kind)
        local fn = handlers[kind]
        if fn and tonumber(src) then fn(tonumber(src)) end
    end)
    return true
end

function Adapter:getUserId(src)
    local id = self.bridge.getUserId(src)
    return tonumber(id) and math.tointeger(tonumber(id)) or nil
end

function Adapter:hasPermission(src, perm)
    return self.bridge.hasPermission(src, perm) == true
end

function Adapter:getName(src)
    return self.bridge.getName(src)
end

function Adapter:registerMenus(h)
    handlers.self = h.openSelf
    handlers.manage = h.openManage
    local cfg = Config.BuilderMenu
    self.bridge.registerMenus({
        parent = cfg.Parent,
        manageParent = cfg.ManageParent or cfg.Parent,
        selfPerm = (Config.Permissions.Map and Config.Permissions.Map[Config.Permissions.Self]) or Config.Permissions.Self,
        managePerm = (Config.Permissions.Map and Config.Permissions.Map[Config.Permissions.Manage]) or Config.Permissions.Manage,
        selfLabel = cfg.SelfLabel,
        selfDesc = cfg.SelfDescription,
        manageLabel = cfg.ManageLabel,
        manageDesc = cfg.ManageDescription,
    })
end
