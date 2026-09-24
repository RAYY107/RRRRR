--[[
    Evora ID — vRP 2 extension
    This file runs INSIDE the vRP 2 resource (loaded with vRP.loadScript
    from framework/vrp/vrp2.lua). It only exposes read-only helpers and
    menu entries; all Evora logic stays in Evora_idv1.
]]

local Proxy = module('vrp', 'lib/Proxy')

local EvoraID = class('EvoraID', vRP.Extension)

function EvoraID:__construct()
    vRP.Extension.__construct(self)
    self.menuCfg = nil
end

local ext -- instance, set after registration

local function userBySource(src)
    return vRP.users_by_source[tonumber(src)]
end

local api = {}

function api.getUserId(src)
    local user = userBySource(src)
    return user and user.id or nil
end

function api.hasPermission(src, perm)
    local user = userBySource(src)
    return user ~= nil and user:hasPermission(perm) == true
end

function api.getName(src)
    local user = userBySource(src)
    if not user then return nil end
    local identity = user.identity
    if type(identity) == 'table' and identity.firstname then
        local full = ((identity.firstname or '') .. ' ' .. (identity.name or '')):gsub('^%s+', ''):gsub('%s+$', '')
        return full
    end
    return user.name
end

function api.registerMenus(cfg)
    if not vRP.EXT.GUI or ext.menuCfg then return end
    ext.menuCfg = cfg

    local function add(menuName, perm, label, desc, kind)
        vRP.EXT.GUI:registerMenuBuilder(menuName, function(menu)
            local user = menu.user
            if user and user:hasPermission(perm) then
                menu:addOption(label, function(m)
                    if m.user and m.user.closeMenu then m.user:closeMenu(m) end
                    TriggerEvent('evora_id:vrp2:menu', user.source, kind)
                end, desc)
            end
        end)
    end

    add(cfg.parent, cfg.selfPerm, cfg.selfLabel, cfg.selfDesc, 'self')
    add(cfg.manageParent, cfg.managePerm, cfg.manageLabel, cfg.manageDesc, 'manage')
end

vRP:registerExtension(EvoraID)
ext = vRP.EXT.EvoraID
Proxy.addInterface('evora_vrp2', api)
