--[[
    Evora ID — adapter: Creative network vRP forks
      vRP.Passport(source)              (v5+)   / vRP.getUserId(source) (v4)
      vRP.HasPermission(Passport, perm) (v5+)   / vRP.hasPermission(...) (v4)
      vRP.HasGroup(Passport, group)             (group based forks)
      vRP.Identity(Passport)

    Creative has no menu builder, so BuilderMenu integration is skipped;
    use the commands instead. Creative permissions are usually group
    names ("Admin") — map them with Config.Permissions.Map.
]]

local Adapter = { name = 'vrp_creative', keyPrefix = 'vrp' }
EvoraAdapters.vrp_creative = Adapter

local names = {}

local CANDIDATE_FILES = {
    'modules/vrp.lua', 'modules/player.lua', 'modules/identity.lua', 'modules/groups.lua',
    'server/player.lua', 'server/vrp.lua', 'base.lua', 'modules/base.lua',
}

function Adapter:detect()
    if not EvoraVrp.running() then return false end
    return EvoraVrp.sourceContains(CANDIDATE_FILES, { 'function vRP.Passport(', 'vRP.Passport =', 'function vRP.HasPermission(' })
end

function Adapter:init()
    local vRP, err = EvoraVrp.interface('vRP')
    if not vRP then return false, err end
    self.vRP = vRP
    self.modern = EvoraVrp.sourceContains(CANDIDATE_FILES, { 'function vRP.Passport(', 'vRP.Passport =' })
    AddEventHandler('playerDropped', function() names[source] = nil end)
    return true
end

function Adapter:getUserId(src)
    local id
    if self.modern then id = self.vRP.Passport(src) else id = self.vRP.getUserId(src) end
    return tonumber(id) and math.tointeger(tonumber(id)) or nil
end

function Adapter:hasPermission(src, perm)
    local id = self:getUserId(src)
    if not id then return false end
    local vRP = self.vRP
    if self.modern then
        if vRP.HasPermission(id, perm) then return true end
        return vRP.HasGroup(id, perm) == true
    end
    return vRP.hasPermission(id, perm) == true
end

function Adapter:getName(src)
    if names[src] then return names[src] end
    local id = self:getUserId(src)
    if not id then return nil end
    local ok, identity
    if self.modern then
        ok, identity = pcall(self.vRP.Identity, id)
    else
        ok, identity = pcall(self.vRP.getUserIdentity, id)
    end
    local name = ok and EvoraVrp.nameFromIdentity(identity) or nil
    names[src] = name
    return name
end
