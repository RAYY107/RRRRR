--[[
    Evora ID — server bootstrap
      Evora
      Made by LR
]]

local U = EvoraUtils
local E = EvoraConst.Events

local ready = false
local pending = {}

local function openEditorFor(src)
    if not Perms.self(src) then return end
    TriggerClientEvent(E.OpenEditor, src)
end

local function openManagerFor(src)
    if not Perms.manage(src) then return end
    TriggerClientEvent(E.OpenManager, src)
end

CreateThread(function()
    if GetCurrentResourceName() ~= 'Evora_idv1' then
        U.warn('Resource folder is named "%s". Exports are documented as exports[\'Evora_idv1\'] — rename the folder to keep them working.', GetCurrentResourceName())
    end

    local okFw, errFw = pcall(Framework.init)
    if not okFw then
        U.error('Framework init error: %s', tostring(errFw))
        EvoraAdapters.standalone:init()
        Framework.adapter, Framework.name, Framework.ready = EvoraAdapters.standalone, 'standalone', true
    end

    local okDb, errDb = pcall(DB.init)
    if not okDb then
        DB.available = false
        U.error('Database init error: %s', tostring(errDb))
    end

    Presets.load()

    Framework.registerMenus({
        openSelf = openEditorFor,
        openManage = openManagerFor,
    })

    ready = true
    for _, src in ipairs(pending) do Designs.onPlayerReady(src) end
    pending = {}

    U.info('^7Evora ID ready ^8— Made by LR^7 (framework: %s, database: %s)', Framework.name, DB.available and 'online' or 'offline')
end)

RegisterNetEvent(E.Ready, function()
    local src = source
    if not ready then
        pending[#pending + 1] = src
        return
    end
    Designs.onPlayerReady(src)
end)

AddEventHandler('playerDropped', function()
    Designs.onPlayerDropped(source)
end)

-- Server-side entry points used by other resources / the console.
AddEventHandler('Evora_idv1:openEditor', function(src) openEditorFor(tonumber(src)) end)
AddEventHandler('Evora_idv1:openManager', function(src) openManagerFor(tonumber(src)) end)
