--[[
    Evora ID — request rate limiting
    Fixed-window counters per player. Two budgets: normal requests and
    heavy requests (saves, image validation, anything touching HTTP).
]]

RateLimit = {}

local windows = {}

local function bucket(src)
    local t = GetGameTimer()
    local w = windows[src]
    local len = (Config.Security.RateWindow or 10) * 1000
    if not w or t - w.start >= len then
        w = { start = t, normal = 0, heavy = 0, warned = false }
        windows[src] = w
    end
    return w
end

-- Returns true when the request may proceed.
function RateLimit.allow(src, heavy)
    local w = bucket(src)
    w.normal = w.normal + 1
    if w.normal > (Config.Security.RateLimit or 40) then
        if not w.warned and Config.Security.LogRejections then
            w.warned = true
            EvoraUtils.warn('Rate limit hit by %s (%s)', GetPlayerName(src) or '?', src)
        end
        return false
    end
    if heavy then
        w.heavy = w.heavy + 1
        if w.heavy > (Config.Security.HeavyLimit or 8) then return false end
    end
    return true
end

AddEventHandler('playerDropped', function()
    windows[source] = nil
end)
