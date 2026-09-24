--[[
    Evora ID — adapter: legacy vRP (Dunko / vRP 0.5 style proxy)
    Proxy functions take ONE table of arguments and an optional callback:
      vRP.getUserId({source})
      vRP.hasPermission({user_id, perm})
      vRP.registerMenuBuilder({name, function(add, data) ... end})
]]

local Adapter = { name = 'vrp_legacy', keyPrefix = 'vrp' }
EvoraAdapters.vrp_legacy = Adapter

local call = function(...) return EvoraVrp.legacyCall(...) end
local names = {}

function Adapter:detect()
    return EvoraVrp.running() and EvoraVrp.usesTableArgs()
end

function Adapter:init()
    local vRP, err = EvoraVrp.interface('vRP')
    if not vRP then return false, err end
    self.vRP = vRP
    AddEventHandler('playerDropped', function() names[source] = nil end)
    return true
end

function Adapter:getUserId(src)
    local id = call(self.vRP.getUserId, src)
    return tonumber(id) and math.tointeger(tonumber(id)) or nil
end

function Adapter:hasPermission(src, perm)
    local id = self:getUserId(src)
    if not id then return false end
    return call(self.vRP.hasPermission, id, perm) == true
end

function Adapter:getName(src)
    if names[src] then return names[src] end
    local id = self:getUserId(src)
    if not id then return nil end
    local ok, identity = pcall(call, self.vRP.getUserIdentity, id)
    local name = ok and EvoraVrp.nameFromIdentity(identity) or nil
    names[src] = name
    return name
end

function Adapter:registerMenus(handlers)
    local vRP = self.vRP
    local cfg = Config.BuilderMenu

    local function addBuilder(menu, perm, label, desc, open)
        call(vRP.registerMenuBuilder, menu, function(add, data)
            local player = data and data.player
            if not player then return end
            local choices = {}
            if Framework.hasPermission(player, perm) then
                choices[label] = { function(p)
                    if vRP.closeMenu then pcall(call, vRP.closeMenu, p) end
                    open(p)
                end, desc }
            end
            add(choices)
        end)
    end

    addBuilder(cfg.Parent, Config.Permissions.Self, cfg.SelfLabel, cfg.SelfDescription, handlers.openSelf)
    addBuilder(cfg.ManageParent or cfg.Parent, Config.Permissions.Manage, cfg.ManageLabel, cfg.ManageDescription, handlers.openManage)
end
