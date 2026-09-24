--[[
    Evora ID — editor host (live preview on the real character)
    ------------------------------------------------------------------
    The NUI is transparent in its centre. Behind it a scripted camera
    frames the player's actual ped, and the overhead renderer draws the
    DRAFT design above the real head through the same DUI pipeline as
    every other ID. What the player sees is exactly what others will see.

    Everything stays local until the NUI calls a save request; the
    server then validates and stores it.
]]

Editor = {
    isOpen = false,
    mode = nil,          -- 'self' | 'manage'
    stage = false,       -- camera + preview active
    presetVersion = nil,
}

local U = EvoraUtils
local CFG = Config.Editor

local cam
local baseHeading, pedHeading
local zoom = CFG.CameraDistance
local frame = { cx = 0.5, cy = 0.5 }
local booted = false
local lastAnchor = { x = -1, y = -1, w = -1, h = -1 }

---------------------------------------------------------------------------
-- NUI static data (sent once)
---------------------------------------------------------------------------

local function staticData()
    return {
        brand = { name = EvoraConst.Brand, credit = EvoraConst.Credit },
        stage = { w = EvoraConst.StageW, h = EvoraConst.StageH },
        schema = EvoraSchema.describe(),
        defaults = EvoraSchema.defaults(),
        fonts = EvoraFonts.List,
        fontFallback = EvoraFonts.Fallback,
        assets = EvoraAssets.List,
        effects = EvoraEffects.Types,
        effectPresets = EvoraEffects.Presets,
        easings = EvoraEffects.Easings,
        categories = EvoraPresets.Categories,
        affixes = EvoraConst.AffixSymbols,
        numerals = EvoraConst.Numerals,
        limits = EvoraConst.Limits,
        editor = { snap = CFG.SnapThreshold or 8, minZoom = CFG.MinZoom, maxZoom = CFG.MaxZoom },
    }
end

local function sendBoot()
    if booted then return end
    booted = true
    SendNUIMessage({ action = 'boot', data = staticData() })
end

---------------------------------------------------------------------------
-- Camera
---------------------------------------------------------------------------

local function headOf(ped)
    return GetPedBoneCoords(ped, 31086, 0.0, 0.0, 0.0)
end

local function placeCamera(instant)
    if not cam then return end
    local ped = PlayerPedId()
    local head = headOf(ped)
    local rad = math.rad(baseHeading)
    local fwd = vector3(-math.sin(rad), math.cos(rad), 0.0)
    local camDir = -fwd
    local right = vector3(camDir.y, -camDir.x, 0.0)

    local fov = CFG.CameraFov
    local tanV = math.tan(math.rad(fov) * 0.5)
    local tanH = tanV * GetAspectRatio(false)

    local focus = vector3(head.x, head.y, head.z + CFG.CameraHeight * 0.35)
    local lateral = (0.5 - frame.cx) * 2.0 * zoom * tanH
    local vertical = (frame.cy - 0.5) * 2.0 * zoom * tanV
    local shift = right * lateral + vector3(0.0, 0.0, vertical)

    local pos = focus + fwd * zoom + shift
    SetCamCoord(cam, pos.x, pos.y, pos.z)
    local target = focus + shift
    PointCamAtCoord(cam, target.x, target.y, target.z)
    SetCamFov(cam, fov)
    if instant then
        SetCamActive(cam, true)
    end

    Renderer.pinAnchor(vector3(head.x, head.y, head.z + Config.Render.HeightOffset))
end

local function startStage()
    if Editor.stage then return end
    local ped = PlayerPedId()
    Editor.stage = true
    baseHeading = GetEntityHeading(ped)
    pedHeading = baseHeading
    zoom = CFG.CameraDistance
    FreezeEntityPosition(ped, true)

    cam = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    placeCamera(true)
    RenderScriptCams(true, true, 450, true, true)
    -- start from the design currently visible; the NUI replaces it with the draft
    local myId = GetPlayerServerId(PlayerId())
    Renderer.setPreview(Renderer.designFor(myId), myId)
    Renderer.rescan()
end

local function stopStage()
    if not Editor.stage then return end
    Editor.stage = false
    local ped = PlayerPedId()
    if pedHeading and baseHeading then SetEntityHeading(ped, baseHeading) end
    FreezeEntityPosition(ped, false)
    RenderScriptCams(false, true, 350, true, true)
    if cam then
        DestroyCam(cam, false)
        cam = nil
    end
    Renderer.setPreview(nil, nil)
    Renderer.pinAnchor(nil)
    Renderer.rescan()
end

-- Screen position of the ID anchor, sent to the NUI whenever it moves,
-- so the NUI can place selection handles exactly over the real render.
local function pushAnchor(force)
    if not Editor.stage then return end
    local anchor, w, h = Renderer.measure(PlayerPedId())
    local onScreen, sx, sy = GetScreenCoordFromWorldCoord(anchor.x, anchor.y, anchor.z)
    if not onScreen then return end
    local rw, rh = GetActiveScreenResolution()
    local moved = math.abs(sx - lastAnchor.x) * rw > 0.75 or math.abs(sy - lastAnchor.y) * rh > 0.75
        or math.abs(h - lastAnchor.h) * rh > 0.75
    if force or moved then
        lastAnchor = { x = sx, y = sy, w = w, h = h }
        SendNUIMessage({ action = 'anchor', data = lastAnchor })
    end
end

---------------------------------------------------------------------------
-- Open / close
---------------------------------------------------------------------------

local function blocked()
    local ped = PlayerPedId()
    if IsEntityDead(ped) or IsPedRagdoll(ped) or IsPedFalling(ped) then return 'blocked_state' end
    if CFG.BlockInVehicle and IsPedInAnyVehicle(ped, false) then return 'blocked_vehicle' end
    return nil
end

function Editor.open(mode)
    if Editor.isOpen or Editor.opening then return end
    local why = blocked()
    if why then return EvoraClient.notify(why, 'error') end
    Editor.opening = true

    CreateThread(function()
        local action = mode == 'manage' and 'manager.bootstrap' or 'editor.bootstrap'
        local ok, data = EvoraClient.request(action, { presetVersion = Editor.presetVersion })
        Editor.opening = false
        if not ok then
            local key = type(data) == 'table' and data.error or data
            return EvoraClient.notify(key or 'no_permission', 'error')
        end
        if data.presets then Editor.presetVersion = data.presetVersion end

        -- the look players without a design get (used for "start from default")
        data.defaultDesign = Renderer.default

        sendBoot()
        Editor.isOpen = true
        Editor.mode = mode
        SendNUIMessage({ action = 'open', mode = mode, data = data })
        SetNuiFocus(true, true)
        if mode == 'self' then startStage() end

        -- per-frame housekeeping while open
        CreateThread(function()
            while Editor.isOpen do
                HideHudAndRadarThisFrame()
                DisableControlAction(0, 199, true)  -- pause
                DisableControlAction(0, 200, true)  -- pause alternate
                DisableControlAction(0, 245, true)  -- chat
                Wait(0)
            end
        end)

        CreateThread(function()
            while Editor.isOpen do
                if Editor.stage then pushAnchor(false) end
                Wait(50)
            end
        end)
    end)
end

function Editor.close()
    if not Editor.isOpen then return end
    Editor.isOpen = false
    Editor.mode = nil
    stopStage()
    SetNuiFocus(false, false)
    SendNUIMessage({ action = 'close' })
end

AddEventHandler('onResourceStop', function(res)
    if res == GetCurrentResourceName() and Editor.isOpen then
        stopStage()
        SetNuiFocus(false, false)
    end
end)

---------------------------------------------------------------------------
-- NUI callbacks
---------------------------------------------------------------------------

RegisterNUICallback('close', function(_, cb)
    Editor.close()
    cb(true)
end)

-- Draft preview. The design is sanitized with the shared schema, so the
-- preview is exactly what the server would accept.
RegisterNUICallback('preview', function(data, cb)
    cb(true)
    if not Editor.isOpen or not Editor.stage then return end
    local design = nil
    if type(data) == 'table' and type(data.design) == 'table' then
        design = EvoraSchema.sanitize(data.design)
    end
    local displayId = math.tointeger(tonumber(data and data.displayId))
    if not displayId or displayId < 0 or displayId > 65535 then
        displayId = GetPlayerServerId(PlayerId())
    end
    Renderer.setPreview(design, displayId)
    Renderer.rescan()
end)

-- Generic server request proxy. The server authorises every action.
RegisterNUICallback('request', function(data, cb)
    if not Editor.isOpen or type(data) ~= 'table' or type(data.action) ~= 'string' then
        return cb({ ok = false, error = 'closed' })
    end
    CreateThread(function()
        local ok, res = EvoraClient.request(data.action, type(data.payload) == 'table' and data.payload or {})
        if ok and type(res) == 'table' and res.presets and res.presetVersion then
            Editor.presetVersion = res.presetVersion
        end
        if ok then
            cb({ ok = true, data = res })
        else
            local err = type(res) == 'table' and res.error or res
            cb({ ok = false, error = err, extra = type(res) == 'table' and res.extra or nil })
        end
    end)
end)

-- Manager: enter / leave the live editing stage.
RegisterNUICallback('stage', function(data, cb)
    cb(true)
    if not Editor.isOpen then return end
    if data and data.active then
        if not Editor.stage then
            local why = blocked()
            if why then return EvoraClient.notify(why, 'error') end
            startStage()
        end
        pushAnchor(true)
    else
        stopStage()
    end
end)

-- Free area of the layout (fractions of the screen) so the character is
-- framed in the middle of the visible space.
RegisterNUICallback('layout', function(data, cb)
    cb(true)
    if type(data) ~= 'table' then return end
    frame.cx = U.clamp(tonumber(data.cx) or 0.5, 0.15, 0.85)
    frame.cy = U.clamp(tonumber(data.cy) or 0.5, 0.2, 0.8)
    placeCamera(false)
    pushAnchor(true)
end)

RegisterNUICallback('camera', function(data, cb)
    cb(true)
    if not Editor.stage or type(data) ~= 'table' then return end
    if data.reset then
        zoom = CFG.CameraDistance
        pedHeading = baseHeading
        SetEntityHeading(PlayerPedId(), baseHeading)
    end
    if tonumber(data.zoom) then
        zoom = U.clamp(zoom + tonumber(data.zoom), CFG.MinZoom, CFG.MaxZoom)
    end
    if tonumber(data.rotate) then
        pedHeading = (pedHeading + U.clamp(tonumber(data.rotate), -45, 45)) % 360
        SetEntityHeading(PlayerPedId(), pedHeading)
    end
    placeCamera(false)
    pushAnchor(true)
end)

RegisterNUICallback('nuiReady', function(_, cb)
    cb(true)
    booted = false
end)
