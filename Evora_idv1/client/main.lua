--[[
    Evora ID — client bootstrap
    Sync of designs, server requests, commands, key mappings, exports.
]]

local U = EvoraUtils
local E = EvoraConst.Events

EvoraClient = {}

---------------------------------------------------------------------------
-- Requests (one generic channel, answered by server/requests.lua)
---------------------------------------------------------------------------

local pending, nextId = {}, 0

-- Blocking call: must run inside a thread. Returns ok, data.
function EvoraClient.request(action, payload, timeoutMs)
    nextId = nextId + 1
    local id = nextId
    local p = promise.new()
    pending[id] = p
    TriggerServerEvent(E.Request, id, action, payload or {})
    SetTimeout(timeoutMs or 20000, function()
        if pending[id] then
            pending[id] = nil
            p:resolve({ false, 'timeout' })
        end
    end)
    local res = Citizen.Await(p)
    return res[1], res[2]
end

RegisterNetEvent(E.Response, function(id, ok, data)
    local p = pending[id]
    if p then
        pending[id] = nil
        p:resolve({ ok, data })
    end
end)

---------------------------------------------------------------------------
-- Notifications
---------------------------------------------------------------------------

local MESSAGES = {
    no_permission = 'لا تملك الصلاحية لهذا الإجراء.',
    not_ready = 'بياناتك لم تُحمّل بعد، حاول بعد لحظات.',
    blocked_vehicle = 'لا يمكن فتح المحرر داخل مركبة.',
    blocked_state = 'لا يمكن فتح المحرر الآن.',
    timeout = 'انتهت مهلة الاتصال بالخادم.',
    rate_limited = 'طلبات كثيرة، انتظر قليلاً.',
    db_unavailable = 'قاعدة البيانات غير متاحة حالياً.',
}

function EvoraClient.notify(key, kind)
    local msg = MESSAGES[key] or key
    local ok = pcall(Config.Notify, msg, kind or 'info')
    if not ok then print('[Evora ID] ' .. tostring(msg)) end
end

RegisterNetEvent(E.Notify, function(key, kind)
    EvoraClient.notify(key, kind)
end)

---------------------------------------------------------------------------
-- Design sync
---------------------------------------------------------------------------

RegisterNetEvent(E.Snapshot, function(snap)
    Renderer.applySnapshot(snap)
end)

RegisterNetEvent(E.Update, function(serverId, seq, hash, design)
    Renderer.applyUpdate(serverId, seq, hash, design)
end)

CreateThread(function()
    while not NetworkIsPlayerActive(PlayerId()) do Wait(250) end
    Renderer.start()
    Wait(500)
    TriggerServerEvent(E.Ready)
end)

---------------------------------------------------------------------------
-- Commands & key mappings
---------------------------------------------------------------------------

RegisterCommand(Config.Commands.Editor, function()
    Editor.open('self')
end, false)

RegisterCommand(Config.Commands.Manager, function()
    Editor.open('manage')
end, false)

if Config.Commands.EditorKey then
    RegisterKeyMapping(Config.Commands.Editor, 'Evora ID — المحرر', 'keyboard', Config.Commands.EditorKey)
end

if Config.Render.DisplayMode == 'hold' then
    RegisterCommand('+evora_id_show', function() Renderer.setKeyVisible(true) end, false)
    RegisterCommand('-evora_id_show', function() Renderer.setKeyVisible(false) end, false)
    RegisterKeyMapping('+evora_id_show', 'Evora ID — إظهار الأرقام', 'keyboard', Config.Render.Key or 'HOME')
elseif Config.Render.DisplayMode == 'toggle' then
    RegisterCommand('evora_id_toggle', function() Renderer.toggleKeyVisible() end, false)
    RegisterKeyMapping('evora_id_toggle', 'Evora ID — إظهار / إخفاء الأرقام', 'keyboard', Config.Render.Key or 'HOME')
end

CreateThread(function()
    TriggerEvent('chat:addSuggestion', '/' .. Config.Commands.Editor, 'Evora ID — تخصيص شكل رقمك')
    TriggerEvent('chat:addSuggestion', '/' .. Config.Commands.Manager, 'Evora ID — الإدارة')
end)

RegisterNetEvent(E.OpenEditor, function()
    Editor.open('self')
end)

RegisterNetEvent(E.OpenManager, function()
    Editor.open('manage')
end)

RegisterNetEvent(E.ForceClose, function()
    Editor.close()
end)

---------------------------------------------------------------------------
-- Client exports
---------------------------------------------------------------------------

-- GetPlayerDesign(serverId) -> design table (copy) or nil when the player uses the default look
exports('GetPlayerDesign', function(serverId)
    local design = Renderer.designFor(tonumber(serverId))
    return design and U.copy(design) or nil
end)

-- IsEditorOpen() -> boolean
exports('IsEditorOpen', function()
    return Editor.isOpen == true
end)

-- OpenEditor() / OpenManager(): same permission checks as the commands
exports('OpenEditor', function() Editor.open('self') end)
exports('OpenManager', function() Editor.open('manage') end)

-- SetVisible(bool): hide / show all overhead IDs locally (e.g. cinematic mode)
exports('SetVisible', function(visible)
    Renderer.enabled = visible ~= false
end)
