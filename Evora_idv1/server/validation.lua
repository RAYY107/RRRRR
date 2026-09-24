--[[
    Evora ID — request payload validation
    Every value arriving from a client is re-checked here, whatever the
    NUI already enforced. Nothing from a client is trusted: permissions,
    target ids, timestamps, preset ids, URLs and designs are all verified
    or recomputed server-side.
]]

EvoraValidate = {}

local U = EvoraUtils
local C = EvoraConst

function EvoraValidate.ownerKey(s)
    return type(s) == 'string' and #s >= 3 and #s <= 64 and s:match('^[a-z0-9_]+:[%w%-_]+$') ~= nil
end

-- A design arrives as a JSON string so its size can be checked first.
function EvoraValidate.design(json)
    return EvoraSchema.fromJson(json)
end

function EvoraValidate.slot(n)
    n = math.tointeger(tonumber(n))
    if not n or n < 1 or n > (Config.Slots.Count or 3) then return nil end
    return n
end

function EvoraValidate.name(s, max)
    local clean = U.cleanText(s, max or C.Limits.NameLength)
    if clean == '' then return nil end
    return clean
end

function EvoraValidate.text(s, max)
    return U.cleanText(s or '', max or C.Limits.DescriptionLength)
end

function EvoraValidate.presetId(s)
    if U.isSafeId(s, 48) then return s end
    return nil
end

function EvoraValidate.category(s)
    if type(s) == 'string' and EvoraPresets.CategorySet[s] then return s end
    return 'custom'
end

function EvoraValidate.mode(s)
    if s == 'temporary' or s == 'permanent' then return s end
    return nil
end

function EvoraValidate.seconds(n)
    n = tonumber(n)
    if not n or n ~= n then return nil end
    n = math.floor(n)
    if n < 60 or n > (Config.Temporary.MaxSeconds or 31536000) then return nil end
    return n
end

function EvoraValidate.bool(v)
    return v == true
end

function EvoraValidate.oneOf(s, list, default)
    if type(s) == 'string' and U.indexOf(list, s) then return s end
    return default
end

function EvoraValidate.page(n)
    n = math.tointeger(tonumber(n))
    if not n or n < 1 then return 1 end
    return math.min(n, 10000)
end

function EvoraValidate.search(s)
    return U.cleanText(s or '', 48)
end

function EvoraValidate.idList(list, max)
    if type(list) ~= 'table' then return nil end
    local out = {}
    for i = 1, math.min(#list, max or 500) do
        if U.isSafeId(list[i], 48) then out[#out + 1] = list[i] end
    end
    return out
end
