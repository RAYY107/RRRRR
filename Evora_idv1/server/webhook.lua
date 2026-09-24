--[[
    Evora ID — audit webhook
    ------------------------------------------------------------------
    Server-side only. The URL comes from a server convar and is never
    sent to clients. Messages are queued and sent at a pace Discord
    accepts; a failing webhook never blocks or breaks anything else.
]]

Webhook = {}

local queue = {}
local sending = false
local SPACING_MS = 1200
local MAX_QUEUE = 100

local function url()
    if not Config.Webhook.Enabled then return nil end
    local u = GetConvar(Config.Webhook.UrlConvar or 'evora_id_webhook', '')
    if u == '' or not u:match('^https://') then return nil end
    return u
end

local function pump()
    if sending then return end
    sending = true
    CreateThread(function()
        while #queue > 0 do
            local target = url()
            if not target then
                queue = {}
                break
            end
            local payload = table.remove(queue, 1)
            local ok, body = pcall(json.encode, payload)
            if ok then
                PerformHttpRequest(target, function(status)
                    if status and status >= 400 then
                        EvoraUtils.debug('Webhook rejected message (HTTP %s)', tostring(status))
                    end
                end, 'POST', body, { ['Content-Type'] = 'application/json' })
            end
            Wait(SPACING_MS)
        end
        sending = false
    end)
end

local LABELS = {
    open_manager = 'فتح الإدارة',
    edit_design = 'تعديل تصميم لاعب',
    apply_preset = 'تطبيق قالب',
    delete_design = 'حذف تصميم',
    reset_cooldown = 'إعادة ضبط فترة الانتظار',
    change_expiration = 'تغيير الصلاحية',
    lock_design = 'قفل / فتح تصميم',
    force_style = 'فرض تصميم',
    preset_create = 'إنشاء قالب',
    preset_update = 'تعديل قالب',
    preset_delete = 'حذف قالب',
    self_save = 'حفظ تصميم شخصي',
}

--[[
    entry = {
      action = 'edit_design',
      actorName, actorServerId, actorOwner,
      targetName, targetServerId, targetOwner,
      detail = 'Crimson Steel',
    }
]]
function Webhook.send(entry)
    if not url() then return end
    if not (Config.Webhook.Actions and Config.Webhook.Actions[entry.action]) then return end
    if #queue >= MAX_QUEUE then return end

    local fields = {}
    local function add(name, value, inline)
        if value ~= nil and value ~= '' then
            fields[#fields + 1] = { name = name, value = tostring(value):sub(1, 256), inline = inline ~= false }
        end
    end
    add('المسؤول', entry.actorName and ('%s (#%s)'):format(entry.actorName, entry.actorServerId or '-') or nil)
    add('الهدف', entry.targetName and ('%s (#%s)'):format(entry.targetName, entry.targetServerId or '-') or nil)
    add('Server ID', entry.targetServerId)
    add('الحساب', entry.targetOwner)
    add('التفاصيل', entry.detail, false)

    queue[#queue + 1] = {
        username = Config.Webhook.Username or 'Evora ID',
        embeds = { {
            title = LABELS[entry.action] or entry.action,
            color = Config.Webhook.Color or 0x9AA0A6,
            fields = fields,
            footer = { text = 'Evora ID · Made by LR' },
            timestamp = os.date('!%Y-%m-%dT%H:%M:%SZ'),
        } },
    }
    pump()
end
