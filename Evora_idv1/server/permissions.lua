--[[
    Evora ID — permissions
    ------------------------------------------------------------------
    Exactly three permissions:
      evora.idname.self    edit own design
      evora.idname.manage  manage everyone, presets, audit
      evora.idname.bypass  skip the cooldown — ONLY when combined with self

    Every check is server-side. Results are cached for a few seconds to
    avoid hammering the framework, and dropped on disconnect.
]]

Perms = {}

local cache = {}

local function now()
    return GetGameTimer()
end

local function lookup(src, perm)
    src = tonumber(src)
    if not src or src <= 0 then return false end
    local entry = cache[src]
    if not entry then
        entry = {}
        cache[src] = entry
    end
    local hit = entry[perm]
    if hit and hit.exp > now() then return hit.value end
    local value = Framework.hasPermission(src, perm) == true
    entry[perm] = { value = value, exp = now() + (Config.Permissions.CacheSeconds or 10) * 1000 }
    return value
end

function Perms.self(src)
    return lookup(src, Config.Permissions.Self)
end

function Perms.manage(src)
    return lookup(src, Config.Permissions.Manage)
end

-- Bypass never grants anything on its own: it only matters for a player
-- who is allowed to edit their own design.
function Perms.bypassCooldown(src)
    if not Perms.self(src) then return false end
    return lookup(src, Config.Permissions.Bypass)
end

-- Can this player use the self editor at all?
function Perms.canOpenEditor(src)
    return Perms.self(src)
end

-- Cooldown applies to this player's self saves?
function Perms.cooldownApplies(src)
    if not Config.Cooldown.Enabled then return false end
    if Perms.bypassCooldown(src) then return false end
    if Config.Cooldown.ManagersExempt and Perms.manage(src) then return false end
    return true
end

function Perms.summary(src)
    return {
        self = Perms.self(src),
        manage = Perms.manage(src),
        bypass = Perms.bypassCooldown(src),
    }
end

function Perms.invalidate(src)
    cache[tonumber(src) or -1] = nil
end

AddEventHandler('playerDropped', function()
    cache[source] = nil
end)
