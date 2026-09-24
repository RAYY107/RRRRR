--[[
    Evora ID — overhead renderer
    ------------------------------------------------------------------
    Architecture: DUI atlas + runtime texture + UV sprites.

      * ONE off-screen browser (DUI) renders every visible ID design into
        a grid of 512x256 slots (html/render.html). Fonts, Arabic
        shaping, gradients, filters, CSS animations, SVG emblems and
        animated GIFs are all handled by Chromium.
      * The DUI is exposed as a runtime texture; each visible player is
        drawn every frame with one UV-mapped sprite at their head
        position (SetDrawOrigin + DrawSpriteUv). No per-frame NUI/DUI
        messages: the DUI only receives a message when a slot's content
        actually changes.
      * A slow scan (Config.Render.ScanInterval) decides who is visible
        and assigns slots nearest-first. Players beyond the atlas
        capacity, or any player if the DUI is unavailable, fall back to
        native text so an ID is always shown.

    The number rendered is always GetPlayerServerId(player) — the real
    FiveM server id. Designs only change how it looks.
]]

Renderer = {
    designs = {},       -- hash -> design
    players = {},       -- serverId -> { hash, seq }
    default = nil,      -- default design (players without a design)
    visible = {},       -- current draw list
    preview = nil,      -- { design, displayId } while the editor is open
    pinned = nil,       -- stable anchor for the local player while editing
    enabled = true,
}

local U = EvoraUtils
local R = Config.Render
local STAGE_W, STAGE_H = EvoraConst.StageW, EvoraConst.StageH
local COLS, ROWS = R.AtlasColumns or 4, R.AtlasRows or 4
local CAPACITY = COLS * ROWS
local ATLAS_W, ATLAS_H = COLS * STAGE_W, ROWS * STAGE_H
local TXD, TXN = 'evora_id_atlas', 'atlas'
local HEAD_BONE = 31086

local dui, duiReady = nil, false
local slots = {}          -- slot index (1..CAPACITY) -> { key, serverId }
local slotOf = {}         -- serverId -> slot index
local previewCounter = 0
local uvCache = {}
-- DRAW_SPRITE_ARX_WITH_UV (formerly DRAW_SPRITE_UV), available on every build
local drawUv = DrawSpriteArxWithUv or DrawSpriteUv or function(...)
    return Citizen.InvokeNative(0x95812F9B26074726, ...)
end

---------------------------------------------------------------------------
-- DUI host
---------------------------------------------------------------------------

local function duiSend(msg)
    if dui and duiReady then
        SendDuiMessage(dui, json.encode(msg))
    end
end

local function initMessage()
    local fonts = {}
    for _, f in ipairs(EvoraFonts.List) do
        fonts[#fonts + 1] = { id = f.id, label = f.label, files = f.files, numerals = f.numerals }
    end
    local assets = {}
    for _, a in ipairs(EvoraAssets.List) do
        assets[#assets + 1] = { id = a.id, file = a.file, shape = a.shape }
    end
    return {
        type = 'init',
        cols = COLS, rows = ROWS, slotW = STAGE_W, slotH = STAGE_H,
        fonts = fonts, fallback = EvoraFonts.Fallback, assets = assets,
        labels = EvoraFonts.Labels, defaultLabel = EvoraFonts.DefaultLabel,
    }
end

local function resendAll()
    duiSend(initMessage())
    for i, s in pairs(slots) do
        s.key = nil -- force a resend on the next scan
        slots[i] = s
    end
end

local function createAtlas()
    local url = ('nui://%s/html/render.html'):format(GetCurrentResourceName())
    dui = CreateDui(url, ATLAS_W, ATLAS_H)
    if not dui then
        U.warn('Could not create the DUI renderer; using native text for IDs.')
        return
    end
    local txd = CreateRuntimeTxd(TXD)
    CreateRuntimeTextureFromDuiHandle(txd, TXN, GetDuiHandle(dui))

    CreateThread(function()
        local waited = 0
        while not IsDuiAvailable(dui) and waited < 15000 do
            Wait(100)
            waited = waited + 100
        end
        if not IsDuiAvailable(dui) then
            U.warn('DUI renderer did not load; using native text for IDs.')
            DestroyDui(dui)
            dui = nil
            return
        end
        -- The page's module script may attach its listener slightly after the
        -- browser reports ready, and DUI pages cannot always call back. Re-send
        -- the state a few times; the host ignores duplicates.
        duiReady = true
        for _, delay in ipairs({ 250, 1000, 3000 }) do
            Wait(delay)
            if not dui then return end
            resendAll()
        end
    end)
end

-- The render page calls back once its scripts are loaded (covers a
-- reload of the DUI page as well).
RegisterNUICallback('renderHostReady', function(_, cb)
    cb(true)
    if dui then
        duiReady = true
        resendAll()
    end
end)

local function slotUv(i)
    local uv = uvCache[i]
    if uv then return uv end
    local col = (i - 1) % COLS
    local row = (i - 1) // COLS
    local hx, hy = 0.5 / ATLAS_W, 0.5 / ATLAS_H
    uv = {
        col * STAGE_W / ATLAS_W + hx, row * STAGE_H / ATLAS_H + hy,
        (col + 1) * STAGE_W / ATLAS_W - hx, (row + 1) * STAGE_H / ATLAS_H - hy,
    }
    uvCache[i] = uv
    return uv
end

---------------------------------------------------------------------------
-- Design store (fed by the server)
---------------------------------------------------------------------------

function Renderer.applySnapshot(snap)
    if type(snap) ~= 'table' then return end
    Renderer.default = snap.default
    for hash, design in pairs(snap.designs or {}) do
        Renderer.designs[hash] = design
    end
    local present = {}
    for _, entry in ipairs(snap.players or {}) do
        local id, hash, seq = entry[1], entry[2], entry[3]
        present[id] = true
        local cur = Renderer.players[id]
        if not cur or (cur.seq or 0) < seq then
            Renderer.players[id] = { hash = hash, seq = seq }
        end
    end
    -- players missing from the snapshot and not updated after it are gone
    for id, cur in pairs(Renderer.players) do
        if not present[id] and (cur.seq or 0) <= (snap.seq or 0) then
            Renderer.players[id] = nil
        end
    end
end

function Renderer.applyUpdate(serverId, seq, hash, design)
    if serverId == 0 and hash == 'default' then
        Renderer.default = design
        for _, s in pairs(slots) do s.key = nil end
        return
    end
    local cur = Renderer.players[serverId]
    if cur and (cur.seq or 0) >= seq then return end
    if hash and design then
        Renderer.designs[hash] = design
        Renderer.players[serverId] = { hash = hash, seq = seq }
    else
        Renderer.players[serverId] = { hash = nil, seq = seq }
    end
end

function Renderer.designFor(serverId)
    local p = Renderer.players[serverId]
    if p and p.hash then return Renderer.designs[p.hash], p.hash end
    return nil
end

-- Editor preview for the local player (nil to stop previewing).
function Renderer.setPreview(design, displayId)
    if design == nil and displayId == nil then
        Renderer.preview = nil
    else
        previewCounter = previewCounter + 1
        Renderer.preview = { design = design, displayId = displayId, key = 'p' .. previewCounter }
    end
end

-- Force the talking look on the editor preview (nil = real state).
function Renderer.setPreviewTalking(v)
    if Renderer.preview then Renderer.preview.talking = v end
end

function Renderer.pinAnchor(coords)
    Renderer.pinned = coords
end

---------------------------------------------------------------------------
-- Geometry
---------------------------------------------------------------------------

local function anchorOf(ped)
    local head = GetPedBoneCoords(ped, HEAD_BONE, 0.0, 0.0, 0.0)
    return vector3(head.x, head.y, head.z + R.HeightOffset)
end

-- On-screen height of the whole 512x256 stage for an anchor.
local function stageHeight(dist, fov)
    if not R.DistanceScaling then
        return 0.12 * (R.Scale or 1.0)
    end
    local h = (R.StageWorldHeight * (R.Scale or 1.0)) / (2.0 * math.max(dist, 0.1) * math.tan(math.rad(fov) * 0.5))
    return U.clamp(h, R.MinScreenHeight, R.MaxScreenHeight)
end

-- Exposed for the editor: anchor world position and on-screen size.
function Renderer.measure(ped)
    local anchor = Renderer.pinned or anchorOf(ped)
    local cam = GetFinalRenderedCamCoord()
    local fov = GetFinalRenderedCamFov()
    local dist = #(anchor - cam)
    local h = stageHeight(dist, fov)
    local w = h * (STAGE_W / STAGE_H) / GetAspectRatio(false)
    return anchor, w, h
end

---------------------------------------------------------------------------
-- Visibility scan (slow)
---------------------------------------------------------------------------

local showKeyActive = R.DisplayMode == 'always'

function Renderer.setKeyVisible(v)
    showKeyActive = v
end

function Renderer.toggleKeyVisible()
    showKeyActive = not showKeyActive
end

---------------------------------------------------------------------------
-- Voice: who is talking
---------------------------------------------------------------------------

local VOICE = Config.Voice or {}

local function isTalking(player)
    if not VOICE.Enabled or type(VOICE.IsTalking) ~= 'function' then return false end
    local ok, res = pcall(VOICE.IsTalking, player)
    return ok and res == true or (ok and res == 1)
end

local function talkingOf(e)
    if not (e.design and e.design.voice and e.design.voice.on) then return false end
    if e.isLocal and Renderer.preview and Renderer.preview.talking ~= nil then return Renderer.preview.talking end
    if not VOICE.Overhead then return false end
    return isTalking(e.player)
end

local function assignSlots(list)
    local wanted = {}
    for i = 1, math.min(#list, dui and duiReady and CAPACITY or 0) do
        wanted[list[i].serverId] = list[i]
    end

    -- release slots of players no longer wanted
    for i, s in pairs(slots) do
        if not wanted[s.serverId] then
            slots[i] = nil
            slotOf[s.serverId] = nil
            duiSend({ type = 'clear', slot = i })
        end
    end

    for id, entry in pairs(wanted) do
        local i = slotOf[id]
        if not i then
            for k = 1, CAPACITY do
                if not slots[k] then i = k break end
            end
            if i then
                slots[i] = { serverId = id }
                slotOf[id] = i
            end
        end
        if i then
            local s = slots[i]
            if s.key ~= entry.key then
                s.key = entry.key
                s.talking = talkingOf(entry)
                duiSend({ type = 'slot', slot = i, id = entry.displayId, key = entry.key, design = entry.design, talking = s.talking })
            end
            entry.slot = i
        end
    end
end

local function scan()
    local list = {}
    if not Renderer.enabled or (not showKeyActive and not Renderer.preview) then
        Renderer.visible = list
        assignSlots(list)
        return
    end

    local myPed = PlayerPedId()
    local camCoord = GetFinalRenderedCamCoord()
    local maxDist = R.MaxDistance
    local localId = GetPlayerServerId(PlayerId())

    for _, player in ipairs(GetActivePlayers()) do
        local ped = GetPlayerPed(player)
        local isLocal = ped == myPed
        if ped ~= 0 and DoesEntityExist(ped) and (not isLocal or R.ShowOwn or Renderer.preview) then
            local ok = IsEntityVisible(ped) and not (R.HideInVehicles and IsPedInAnyVehicle(ped, false))
            if isLocal and Renderer.preview then ok = true end
            if ok then
                local coords = GetEntityCoords(ped)
                local dist = #(coords - camCoord)
                if dist <= maxDist or (isLocal and Renderer.preview) then
                    if not isLocal and R.RequireLineOfSight and not HasEntityClearLosToEntity(myPed, ped, 17) then
                        ok = false
                    end
                    if ok then
                        local serverId = GetPlayerServerId(player)
                        local design, key, displayId = nil, nil, serverId
                        if isLocal and Renderer.preview then
                            design = Renderer.preview.design or Renderer.default
                            displayId = Renderer.preview.displayId or localId
                            key = Renderer.preview.key
                        else
                            local hash
                            design, hash = Renderer.designFor(serverId)
                            if design then
                                key = serverId .. ':' .. hash
                            elseif Renderer.default then
                                design = Renderer.default
                                key = serverId .. ':default'
                            end
                        end
                        list[#list + 1] = {
                            player = player,
                            serverId = serverId,
                            displayId = displayId,
                            ped = ped,
                            isLocal = isLocal,
                            dist = isLocal and Renderer.preview and 0 or dist,
                            design = design,
                            key = key,
                            fade = not design or design.transform == nil or design.transform.fade ~= false,
                        }
                    end
                end
            end
        end
    end

    table.sort(list, function(a, b) return a.dist < b.dist end)
    -- entries without a design use native text and do not need a slot
    local forAtlas = {}
    for _, e in ipairs(list) do
        if e.design then forAtlas[#forAtlas + 1] = e end
    end
    assignSlots(forAtlas)
    Renderer.visible = list
end

---------------------------------------------------------------------------
-- Drawing (every frame)
---------------------------------------------------------------------------

local function drawNative(anchor, id, h, alpha)
    SetDrawOrigin(anchor.x, anchor.y, anchor.z, 0)
    SetTextFont(4)
    SetTextScale(0.0, U.clamp(h * 2.2, 0.28, 0.75))
    SetTextColour(244, 245, 246, alpha)
    SetTextOutline()
    SetTextCentre(true)
    BeginTextCommandDisplayText('STRING')
    AddTextComponentSubstringPlayerName(tostring(id))
    EndTextCommandDisplayText(0.0, -0.012)
    ClearDrawOrigin()
end

local function drawFrame()
    local list = Renderer.visible
    if #list == 0 or IsPauseMenuActive() then return end
    local cam = GetFinalRenderedCamCoord()
    local fov = GetFinalRenderedCamFov()
    local aspect = GetAspectRatio(false)
    local maxDist, fadeStart = R.MaxDistance, R.FadeStart

    for i = 1, #list do
        local e = list[i]
        if DoesEntityExist(e.ped) then
            local anchor = (e.isLocal and Renderer.pinned) or anchorOf(e.ped)
            local dist = #(anchor - cam)
            local alpha = 255
            if e.fade and not (e.isLocal and Renderer.preview) and dist > fadeStart then
                alpha = math.floor(255 * U.clamp((maxDist - dist) / math.max(maxDist - fadeStart, 0.01), 0.0, 1.0))
            end
            if alpha > 2 then
                local h = stageHeight(dist, fov)
                if e.slot and duiReady then
                    local w = h * (STAGE_W / STAGE_H) / aspect
                    local uv = slotUv(e.slot)
                    SetDrawOrigin(anchor.x, anchor.y, anchor.z, 0)
                    drawUv(TXD, TXN, 0.0, 0.0, w, h, uv[1], uv[2], uv[3], uv[4], 0.0, 255, 255, 255, alpha, 0)
                    ClearDrawOrigin()
                else
                    drawNative(anchor, e.displayId, h, alpha)
                end
            end
        end
    end
end

---------------------------------------------------------------------------
-- Threads
---------------------------------------------------------------------------

function Renderer.start()
    createAtlas()

    CreateThread(function()
        while true do
            local ok, err = pcall(scan)
            if not ok then U.debug('scan error: %s', tostring(err)) end
            Wait(Renderer.preview and 100 or (R.ScanInterval or 250))
        end
    end)

    -- talking state: a class toggle in the DUI, only when it changes
    CreateThread(function()
        while true do
            if VOICE.Enabled then
                for _, e in ipairs(Renderer.visible) do
                    local s = e.slot and slots[e.slot]
                    if s and s.serverId == e.serverId then
                        local t = talkingOf(e)
                        if s.talking ~= t then
                            s.talking = t
                            duiSend({ type = 'talk', slot = e.slot, on = t })
                        end
                    end
                end
                Renderer.updateHud()
            end
            Wait(VOICE.CheckInterval or 100)
        end
    end)

    CreateThread(function()
        while true do
            if #Renderer.visible > 0 then
                drawFrame()
                Wait(0)
            else
                Wait(200)
            end
        end
    end)
end

---------------------------------------------------------------------------
-- On-screen HUD: your own "talking now" indicator (html/index.html #hud)
---------------------------------------------------------------------------

local hud = { key = nil, on = false, ready = false }

function Renderer.hudInit()
    local cfg = VOICE.Hud or {}
    hud.ready = true
    hud.key = nil
    hud.on = false
    SendNUIMessage({
        action = 'hudInit',
        data = {
            labels = EvoraFonts.Labels,
            defaultLabel = EvoraFonts.DefaultLabel,
            position = cfg.Position or 'bottom-center',
            offsetX = cfg.OffsetX or 0,
            offsetY = cfg.OffsetY or 120,
            scale = cfg.Scale or 1.0,
        },
    })
end

function Renderer.updateHud()
    local cfg = VOICE.Hud or {}
    if not hud.ready or not cfg.Enabled then return end
    local myId = GetPlayerServerId(PlayerId())
    local design, hash = Renderer.designFor(myId)
    if not design then design, hash = Renderer.default, 'default' end
    local key = design and design.voice and design.voice.on and hash or nil
    if key ~= hud.key then
        hud.key = key
        SendNUIMessage({ action = 'hudStyle', data = { design = key and design or nil } })
    end
    local on = key ~= nil and not (Editor and Editor.isOpen) and isTalking(PlayerId())
    if on ~= hud.on then
        hud.on = on
        SendNUIMessage({ action = 'hud', on = on })
    end
end

-- Force an immediate rescan (e.g. right after the preview changed).
function Renderer.rescan()
    pcall(scan)
end

AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end
    if dui then DestroyDui(dui) end
end)
