--[[
    Evora ID — audit trail
    Administrative actions are written to `evora_id_audit` (shown on the
    management "Audit" page) and forwarded to the optional webhook.
    Both are fire-and-forget: auditing never delays or fails an action.
]]

Audit = {}

local U = EvoraUtils

local function short(s, n)
    if s == nil then return nil end
    s = tostring(s)
    if #s > n then return s:sub(1, n) end
    return s
end

--[[
    Audit.log(action, actorSrc, target, detail)
      target = { owner = 'vrp:1', name = 'John', serverId = 7 } or nil
]]
function Audit.log(action, actorSrc, target, detail)
    local actorOwner = actorSrc and Framework.ownerKey(actorSrc) or 'server'
    local actorName = actorSrc and Framework.getName(actorSrc) or 'Server'
    target = target or {}

    CreateThread(function()
        if DB.available then
            DB.insert('INSERT INTO `evora_id_audit` (`at`, `action`, `actor`, `actor_name`, `target`, `target_name`, `detail`) VALUES (?, ?, ?, ?, ?, ?, ?)', {
                os.time(), action, short(actorOwner, 64), short(actorName, 64),
                short(target.owner, 64), short(target.name, 64), short(detail, 255),
            })
        end
    end)

    local ok, err = pcall(Webhook.send, {
        action = action,
        actorName = actorName,
        actorServerId = actorSrc,
        actorOwner = actorOwner,
        targetName = target.name,
        targetServerId = target.serverId,
        targetOwner = target.owner,
        detail = detail,
    })
    if not ok then U.debug('webhook error: %s', tostring(err)) end
end

function Audit.recent(limit)
    if not DB.available then return {} end
    local rows = DB.query('SELECT `id`, `at`, `action`, `actor_name`, `target`, `target_name`, `detail` FROM `evora_id_audit` ORDER BY `id` DESC LIMIT ?', { math.min(tonumber(limit) or 100, 200) })
    return rows or {}
end
