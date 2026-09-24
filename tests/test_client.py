"""Client logic smoke tests with mocked natives: sync ordering (snapshot vs
deltas), slot assignment in the DUI atlas, fallback drawing and the editor
preview sanitation."""
from harness import new_runtime, load_shared, load

MOCKS = r"""
threads = {}
function CreateThread(fn) local co = coroutine.create(fn); threads[#threads + 1] = co; local ok, err = coroutine.resume(co); if not ok then error(err, 0) end end
Citizen.CreateThread = CreateThread
function Wait() coroutine.yield() end
function SetTimeout() end
function vector3(x, y, z)
    return setmetatable({ x = x, y = y, z = z }, {
        __sub = function(a, b) return vector3(a.x - b.x, a.y - b.y, a.z - b.z) end,
        __add = function(a, b) return vector3(a.x + b.x, a.y + b.y, a.z + b.z) end,
        __mul = function(a, k) return vector3(a.x * k, a.y * k, a.z * k) end,
        __len = function(a) return math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) end,
        __unm = function(a) return vector3(-a.x, -a.y, -a.z) end,
    })
end
duiMessages, draws, texts = {}, 0, 0
function CreateDui() return 'dui' end
function GetDuiHandle() return 'h' end
function CreateRuntimeTxd() return 'txd' end
function CreateRuntimeTextureFromDuiHandle() end
function IsDuiAvailable() return true end
function SendDuiMessage(d, msg) duiMessages[#duiMessages + 1] = json.decode(msg) end
function DestroyDui() end
function RegisterNUICallback(name, fn) _G['nui_' .. name] = fn end
function AddEventHandler() end
function RegisterNetEvent() end
function RegisterCommand() end
function RegisterKeyMapping() end
function TriggerEvent() end
function TriggerServerEvent() end
function exports() end
function NetworkIsPlayerActive() return true end
players = { { id = 0, sid = 7, ped = 100, pos = vector3(0, 0, 0) }, { id = 1, sid = 12, ped = 101, pos = vector3(4, 0, 0) }, { id = 2, sid = 30, ped = 102, pos = vector3(60, 0, 0) } }
function PlayerId() return 0 end
function PlayerPedId() return 100 end
function GetActivePlayers() local t = {} for _, p in ipairs(players) do t[#t + 1] = p.id end return t end
local function byPed(ped) for _, p in ipairs(players) do if p.ped == ped then return p end end end
local function byId(id) for _, p in ipairs(players) do if p.id == id then return p end end end
function GetPlayerPed(id) return byId(id).ped end
function GetPlayerServerId(id) return byId(id).sid end
function DoesEntityExist() return true end
function IsEntityVisible() return true end
function IsPedInAnyVehicle() return false end
function GetEntityCoords(ped) return byPed(ped).pos end
function GetPedBoneCoords(ped) local p = byPed(ped).pos return vector3(p.x, p.y, p.z + 0.7) end
function HasEntityClearLosToEntity() return true end
function GetFinalRenderedCamCoord() return vector3(0, -3, 1) end
function GetFinalRenderedCamFov() return 50.0 end
function GetAspectRatio() return 16 / 9 end
function IsPauseMenuActive() return false end
function SetDrawOrigin() end
function ClearDrawOrigin() end
function DrawSpriteArxWithUv() draws = draws + 1 end
function SetTextFont() end function SetTextScale() end function SetTextColour() end function SetTextOutline() end function SetTextCentre() end
function BeginTextCommandDisplayText() end function AddTextComponentSubstringPlayerName() end
function EndTextCommandDisplayText() texts = texts + 1 end
function GetPlayerName() return 'x' end
talkingNow = {}
function NetworkIsPlayerTalking(p) return talkingNow[p] == true end
nuiMessages = {}
function SendNUIMessage(m) nuiMessages[#nuiMessages + 1] = m end
"""

TESTS = r"""
local function check(c, m) if not c then error('FAILED: ' .. m, 2) end end
local d7 = EvoraPresets.ById['aurora'].design
local d12 = EvoraPresets.ById['crimson-steel'].design

tick = function() for _, co in ipairs(threads) do if coroutine.status(co) == 'suspended' then local ok, e = coroutine.resume(co); if not ok then error(e, 0) end end end end
-- client/main.lua already started the renderer on load
tick() -- DUI becomes ready
Renderer.applySnapshot({ seq = 5, default = EvoraPresets.ById['evora-classic'].design, designs = { a = d7 }, players = { { 7, 'a', 3 } } })
check(Renderer.designFor(7) == d7, 'snapshot applied')
-- a newer delta wins over an older snapshot entry
Renderer.applyUpdate(12, 9, 'b', d12)
Renderer.applySnapshot({ seq = 6, default = EvoraPresets.ById['evora-classic'].design, designs = {}, players = {} })
check(Renderer.designFor(12) == d12, 'older snapshot does not remove newer update')
Renderer.applyUpdate(12, 8, nil, nil)
check(Renderer.designFor(12) == d12, 'stale delta ignored')
Renderer.applyUpdate(12, 10, nil, nil)
check(Renderer.designFor(12) == nil, 'removal applied')
Renderer.applyUpdate(12, 11, 'b', d12)

Renderer.rescan()
check(#Renderer.visible == 2, 'player beyond MaxDistance hidden')
local slotMsgs = 0
for _, m in ipairs(duiMessages) do if m.type == 'slot' then slotMsgs = slotMsgs + 1 end end
check(slotMsgs == 2, 'one DUI message per visible design')
check(duiMessages[1].type == 'init' and #duiMessages[1].fonts > 50, 'renderer initialised with fonts')
for _, m in ipairs(duiMessages) do if m.type == 'slot' then check(m.id == 7 or m.id == 12, 'real server id sent as the number') end end

-- nothing changed -> no new DUI traffic
local before = #duiMessages
Renderer.rescan(); Renderer.rescan()
check(#duiMessages == before, 'no DUI messages when nothing changes')

-- editor preview replaces the local player's slot content only
Renderer.setPreview(EvoraSchema.sanitize(json.decode(json.encode(d12))), 7)
Renderer.rescan()
check(#duiMessages == before + 1, 'preview sends exactly one update')

-- drawing: two sprites, no native fallback
draws, texts = 0, 0
tick()
check(draws == 2 and texts == 0, 'two UV sprites drawn per frame (got ' .. draws .. ')')

-- preview callback sanitizes NUI input
Editor.isOpen, Editor.stage = true, true
nui_preview({ design = { text = { size = 9999, font = '<script>' } }, displayId = 'abc' }, function() end)
check(Renderer.preview.design.text.size == 180 and Renderer.preview.design.text.font == 'cairo', 'preview design sanitized')
check(Renderer.preview.displayId == 7, 'invalid preview id falls back to the real id')
-- voice: DUI "talk" toggles only when the state changes
Renderer.setPreview(nil, nil)
for _ = 1, 4 do tick() end -- let the DUI start-up re-sends finish
Renderer.rescan()
local function talkMsgs() local n = 0 for _, m in ipairs(duiMessages) do if m.type == 'talk' then n = n + 1 end end return n end
local t0 = talkMsgs()
talkingNow[1] = true
tick()
check(talkMsgs() == t0 + 1, 'talk message when player 12 starts talking')
tick(); tick()
check(talkMsgs() == t0 + 1, 'no repeated talk messages while still talking')
talkingNow[1] = false
tick()
check(talkMsgs() == t0 + 2, 'talk message when player stops')

-- HUD for the local player
Editor.isOpen = false -- the HUD hides while the editor is open
Renderer.hudInit()
talkingNow[0] = true
tick()
local sawStyle, sawOn = false, false
for _, m in ipairs(nuiMessages) do
    if m.action == 'hudStyle' and m.data.design then sawStyle = true end
    if m.action == 'hud' and m.on then sawOn = true end
end
check(sawStyle and sawOn, 'HUD receives the style and shows while talking')
print('client tests passed')
"""


def run():
    L = new_runtime(server=False)
    L.execute(MOCKS)
    load_shared(L)
    for rel in ['client/renderer.lua', 'client/editor.lua', 'client/main.lua']:
        load(L, rel)
    L.execute(TESTS)


if __name__ == '__main__':
    run()
