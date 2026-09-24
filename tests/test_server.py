"""Server logic tests: runs the real server Lua (standalone adapter) with an
in-memory fake of the database, FiveM event plumbing and a controllable clock.

Covers: permissions (self / manage / bypass / none), cooldown start only after a
successful save, bypass only together with self, design lock, temporary expiry,
manager operations, hostile payloads, unknown actions and rate limiting."""
import os
from harness import new_runtime, load_shared, load

SERVER = [
    'framework/adapter.lua', 'framework/vrp/bridge.lua', 'framework/vrp/modern.lua', 'framework/vrp/legacy.lua',
    'framework/vrp/creative.lua', 'framework/vrp/vrp2.lua', 'framework/standalone.lua',
    'server/db.lua', 'server/ratelimit.lua', 'server/permissions.lua', 'server/webhook.lua', 'server/audit.lua',
    'server/images.lua', 'server/validation.lua', 'server/presets.lua', 'server/state.lua', 'server/designs.lua',
    'server/requests.lua', 'server/api.lua', 'server/main.lua',
]

MOCKS = r"""
NOW = 1700000000
os.time = function(t) if t then return 0 end return NOW end
local timer = 0
function GetGameTimer() timer = timer + 1 return timer end
threads = {}
function CreateThread(fn)
    local co = coroutine.create(fn)
    threads[#threads + 1] = co
    local ok, err = coroutine.resume(co)
    if not ok then error(err, 0) end
end
Citizen.CreateThread = CreateThread
function Wait() coroutine.yield() end
Citizen.Wait = Wait
function SetTimeout() end
function tick()
    for _, co in ipairs(threads) do
        if coroutine.status(co) == 'suspended' then
            local ok, err = coroutine.resume(co)
            if not ok then error(err, 0) end
        end
    end
end
promise = { new = function()
    local p = { done = false }
    function p:resolve(v) self.done = true; self.value = v end
    function p:reject(e) self.done = true; self.err = e end
    return p
end }
Citizen.Await = function(p) if p.err then error(p.err) end return p.value end

handlers, netEvents, sent = {}, {}, {}
function RegisterNetEvent(name, fn) netEvents[name] = true; if fn then AddEventHandler(name, fn) end end
function AddEventHandler(name, fn) handlers[name] = handlers[name] or {}; table.insert(handlers[name], fn) end
function TriggerEvent(name, ...) for _, fn in ipairs(handlers[name] or {}) do source = ''; fn(...) end end
function net(name, src, ...) assert(netEvents[name], 'not a net event: ' .. name); for _, fn in ipairs(handlers[name] or {}) do source = src; fn(...) end end
function TriggerClientEvent(name, target, ...) sent[#sent + 1] = { name = name, target = target, args = { ... } } end
function TriggerLatentClientEvent(name, target, bps, ...) sent[#sent + 1] = { name = name, target = target, args = { ... } } end
function exports(name, fn) _G['export_' .. name] = fn end
function GetInvokingResource() return 'tests' end
function GetResourceState() return 'missing' end
function LoadResourceFile() return nil end
function PerformHttpRequest(url, cb) cb(404, nil, {}) end
function RegisterCommand() end

names, aces = {}, {}
function GetPlayerName(src) return names[tonumber(src)] end
function GetPlayerIdentifierByType(src, t) if names[tonumber(src)] then return 'license:' .. string.format('%040x', tonumber(src)) end end
function IsPlayerAceAllowed(src, perm) return aces[tonumber(src) .. ':' .. perm] == true end
function IsDuplicityVersion() return true end
"""

FAKE_DB = r"""
FAKE = { designs = {}, audit = {}, presets = {} }
local function cols(sql) local list = sql:match('%(([^%)]*)%)%s*VALUES') local out = {} for c in list:gmatch('`([%w_]+)`') do out[#out + 1] = c end return out end
DB.available = true
DB.single = function(sql, p)
    if sql:find('FROM `evora_id_designs` WHERE `owner`') then
        local r = FAKE.designs[p[1]]
        if not r then return nil end
        local c = {} for k, v in pairs(r) do c[k] = v end
        return c
    end
    return nil
end
DB.update = function(sql, p)
    if sql:find('INSERT INTO `evora_id_designs`') then
        local row = {}
        for i, c in ipairs(cols(sql)) do row[c] = p[i] end
        local old = FAKE.designs[row.owner]
        if old then row.created_at = old.created_at end
        FAKE.designs[row.owner] = row
        return 1
    elseif sql:find('UPDATE `evora_id_designs` SET `display_name`') then
        if FAKE.designs[p[2]] then FAKE.designs[p[2]].display_name = p[1] end
        return 1
    elseif sql:find('INSERT INTO `evora_id_presets`') then
        local row = {}
        for i, c in ipairs(cols(sql)) do row[c] = p[i] end
        FAKE.presets[row.id] = row
        return 1
    end
    return 1
end
DB.insert = function(sql, p) if sql:find('evora_id_audit') then FAKE.audit[#FAKE.audit + 1] = p end return #FAKE.audit end
DB.query = function() return {} end
DB.scalar = function() return nil end

-- request helper: returns ok, data
local reqId = 0
function req(src, action, payload)
    reqId = reqId + 1
    local before = #sent
    net(EvoraConst.Events.Request, src, reqId, action, payload or {})
    for i = before + 1, #sent do
        local s = sent[i]
        if s.name == EvoraConst.Events.Response and s.args[1] == reqId then
            return s.args[2], s.args[3]
        end
    end
    return nil, 'no response'
end
function errOf(data) return type(data) == 'table' and data.error or data end
function join(src, name, perms)
    names[src] = name
    for _, p in ipairs(perms or {}) do aces[src .. ':evora.idname.' .. p] = true end
    net(EvoraConst.Events.Ready, src)
end
function designJson(presetId)
    local d = EvoraUtils.copy(EvoraPresets.ById[presetId].design)
    return json.encode(d)
end
function lastUpdateFor(src)
    for i = #sent, 1, -1 do
        local s = sent[i]
        if s.name == EvoraConst.Events.Update and s.args[1] == src then return s end
    end
end
"""

TESTS = r"""
local function check(cond, msg) if not cond then error('FAILED: ' .. msg, 2) end end

-- players: 1 self, 2 self+bypass, 3 bypass only, 4 manager, 5 nobody
join(1, 'Layla', { 'self' })
join(2, 'Omar', { 'self', 'bypass' })
join(3, 'Faris', { 'bypass' })
join(4, 'Admin', { 'manage' })
join(5, 'Guest', {})
check(State.players[1].ready and State.players[1].owner:match('^license:'), 'player 1 loaded')

-- permissions
local ok, data = req(5, 'editor.bootstrap', {})
check(not ok and errOf(data) == 'no_permission', 'no permission blocked')
ok, data = req(3, 'editor.bootstrap', {})
check(not ok and errOf(data) == 'no_permission', 'bypass alone cannot open the editor')
ok, data = req(1, 'manager.players', {})
check(not ok and errOf(data) == 'no_permission', 'self cannot manage')
ok, data = req(1, 'editor.bootstrap', {})
check(ok and data.serverId == 1 and data.perms.self and not data.perms.manage and not data.perms.bypass, 'self bootstrap')
check(data.record.status == 'none', 'fresh player has no design')

-- hostile / invalid payloads
ok, data = req(1, 'editor.save', { design = '{not json' })
check(not ok and errOf(data) == 'invalid_design', 'invalid json rejected')
ok, data = req(1, 'editor.save', { design = string.rep('x', 40000) })
check(not ok and errOf(data) == 'invalid_design', 'oversized payload rejected')
ok, data = req(1, 'editor.save', { design = json.encode({ version = 1, serverId = 999, text = { prefix = '99', size = 1e9 } }) })
check(ok, 'hostile but sanitizable design saved: ' .. tostring(errOf(data)))
local stored = json.decode(FAKE.designs[State.players[1].owner].design)
check(stored.serverId == nil and stored.text.prefix == '' and stored.text.size == 180, 'hostile fields stripped / clamped')
check(State.active[1] ~= nil, 'design is live for everyone')
local upd = lastUpdateFor(1)
check(upd and upd.target == -1 and upd.args[3] ~= nil, 'change broadcast to all clients')

-- cooldown: started only by the successful save above
local cdAt = FAKE.designs[State.players[1].owner].last_self_save
check(cdAt == NOW, 'cooldown timestamp set on successful save')
ok, data = req(1, 'editor.save', { design = designJson('crimson-steel') })
check(not ok and errOf(data) == 'cooldown' and data.extra.remaining > 0, 'second save blocked by cooldown')
check(FAKE.designs[State.players[1].owner].last_self_save == cdAt, 'failed save does not restart cooldown')

-- failed save (bad image) does not start a cooldown for a fresh player
ok, data = req(2, 'editor.save', { design = json.encode({ version = 1, image = { on = true, kind = 'url', url = 'https://evil.example.com/a.png' } }) })
check(not ok and errOf(data) == 'host_not_allowed', 'disallowed image host rejected: ' .. tostring(errOf(data)))
check(FAKE.designs[State.players[2].owner] == nil, 'no row / no cooldown after failed save')

-- bypass together with self skips the cooldown
ok = req(2, 'editor.save', { design = designJson('aurora') })
check(ok, 'bypass first save')
ok, data = req(2, 'editor.save', { design = designJson('chrome') })
check(ok, 'bypass+self second save allowed: ' .. tostring(errOf(data)))

-- manager: reset cooldown lets player 1 save again
local owner1 = State.players[1].owner
ok, data = req(4, 'manager.cooldown', { owner = owner1 })
check(ok and data.cooldown == 0, 'manager reset cooldown')
ok = req(1, 'editor.save', { design = designJson('crimson-steel') })
check(ok, 'save after cooldown reset')
check(State.players[1].record.presetId == 'crimson-steel', 'preset id recorded from meta')

-- lock
ok = req(4, 'manager.lock', { owner = owner1, locked = true })
check(ok, 'manager lock')
ok, data = req(4, 'manager.cooldown', { owner = owner1 })
ok, data = req(1, 'editor.save', { design = designJson('aurora') })
check(not ok and errOf(data) == 'locked', 'locked design cannot be changed by the player')
ok = req(4, 'manager.lock', { owner = owner1, locked = false })

-- manager targets must exist
ok, data = req(4, 'manager.delete', { owner = 'license:0000' })
check(not ok, 'unknown owner rejected')
ok, data = req(4, 'manager.delete', { owner = "vrp:1'; DROP TABLE x;--" })
check(not ok and errOf(data) == 'invalid_target', 'malformed owner rejected')

-- temporary design + expiry (in memory, no DB polling)
local owner5 = State.players[5].owner
ok, data = req(4, 'manager.applyPreset', { owner = owner5, presetId = 'neon-pulse', mode = 'temporary', seconds = 3600 })
check(ok and data.status == 'temporary' and State.active[5], 'online player without any row can receive a design')
ok, data = req(4, 'manager.applyPreset', { owner = State.players[2].owner, presetId = 'neon-pulse', mode = 'temporary', seconds = 3600 })
check(ok and data.status == 'temporary' and data.expiresIn == 3600, 'temporary preset applied')
check(State.active[2] and State.active[2].design.meta.preset == 'neon-pulse', 'temporary design live')
ok, data = req(4, 'manager.expiration', { owner = State.players[2].owner, mode = 'temporary', seconds = 5 })
check(not ok and errOf(data) == 'invalid_duration', 'duration below minimum rejected')
NOW = NOW + 3601
tick()
check(State.active[2] == nil, 'temporary design expired and removed from everyone')
check(State.status(State.players[2].record) == 'expired', 'status expired')
ok, data = req(4, 'manager.expiration', { owner = State.players[2].owner, mode = 'permanent' })
check(ok and data.status == 'permanent' and State.active[2] ~= nil, 'expired design converted to permanent and visible again')

-- delete
ok, data = req(4, 'manager.delete', { owner = State.players[2].owner })
check(ok and data.status == 'none' and State.active[2] == nil, 'design deleted')

-- locked presets are manager-only
ok = req(4, 'preset.update', { id = 'obsidian-crown', locked = true })
check(ok and Presets.get('obsidian-crown').locked, 'manager locked a preset')
NOW = NOW + 4 * 86400
ok, data = req(1, 'editor.save', { design = designJson('obsidian-crown') })
check(not ok and errOf(data) == 'preset_locked', 'locked preset refused for players')

-- manager preset creation is sanitized and audited
ok, data = req(4, 'preset.create', { name = 'Midnight', category = 'nope', design = designJson('aurora') })
check(ok and data.preset and Presets.get(data.preset).category == 'custom', 'preset created with safe category')
check(#FAKE.audit >= 5, 'admin actions audited')

-- unknown action and rate limiting
ok, data = req(1, 'drop.database', {})
check(not ok and data == 'unknown_action', 'unknown action rejected')
local limited = false
for i = 1, 60 do
    local o, d = req(5, 'presets.list', {})
    if d == 'rate_limited' then limited = true break end
end
check(limited, 'event spam is rate limited')

-- exports
local done = nil
export_ApplyPreset(1, 'aurora', { mode = 'temporary', seconds = 600 }, function(o, r) done = { o, r } end)
check(done and done[1] and done[2].status == 'temporary', 'export ApplyPreset')
local g = export_GetPlayerDesign(1)
check(g and g.design and g.design.meta.preset == 'aurora', 'export GetPlayerDesign')
check(export_GetPreset('nope') == nil and export_GetPreset('aurora').name == 'Aurora', 'export GetPreset')

-- the number drawn is never part of any stored design
for owner, row in pairs(FAKE.designs) do
    if row.design then check(not row.design:find('serverId'), 'no server id stored for ' .. owner) end
end

-- disconnect clears live state
TriggerEvent('playerDropped')
source = 1
for _, fn in ipairs(handlers['playerDropped']) do fn() end
check(State.players[1] == nil and State.active[1] == nil, 'player removed on drop')
print('server tests passed')
"""


def run():
    L = new_runtime(server=True)
    L.execute(MOCKS)
    load_shared(L)
    for rel in SERVER:
        load(L, rel)
    L.execute(FAKE_DB)
    L.execute(TESTS)


if __name__ == '__main__':
    run()
