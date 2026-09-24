--[[
    Evora ID — shared utilities (client + server)
]]

EvoraUtils = {}
local U = EvoraUtils

local type, pairs, ipairs, tostring, tonumber = type, pairs, ipairs, tostring, tonumber
local floor, huge = math.floor, math.huge
local sort, concat = table.sort, table.concat
local fmt = string.format

---------------------------------------------------------------------------
-- Logging
---------------------------------------------------------------------------

local function stamp(level, msg)
    return fmt('^5[Evora ID]^7 %s%s^7', level, msg)
end

function U.info(msg, ...)
    print(stamp('', fmt(msg, ...)))
end

function U.warn(msg, ...)
    print(stamp('^3', fmt(msg, ...)))
end

function U.error(msg, ...)
    print(stamp('^1', fmt(msg, ...)))
end

function U.debug(msg, ...)
    if Config and Config.Debug then
        print(stamp('^6', fmt(msg, ...)))
    end
end

---------------------------------------------------------------------------
-- Numbers
---------------------------------------------------------------------------

function U.isNumber(v)
    return type(v) == 'number' and v == v and v ~= huge and v ~= -huge
end

function U.clamp(v, lo, hi)
    if v < lo then return lo end
    if v > hi then return hi end
    return v
end

-- Round to a fixed number of decimals (keeps payloads compact and stable).
function U.round(v, decimals)
    local m = 10 ^ (decimals or 0)
    local r = floor(v * m + 0.5) / m
    if decimals == 0 or r == floor(r) then
        return math.tointeger(r) or r
    end
    return r
end

---------------------------------------------------------------------------
-- Tables
---------------------------------------------------------------------------

function U.copy(v)
    if type(v) ~= 'table' then return v end
    local out = {}
    for k, x in pairs(v) do out[k] = U.copy(x) end
    return out
end

-- Deep merge `patch` over a copy of `base`. Arrays in `patch` replace arrays in `base`.
function U.merge(base, patch)
    local out = U.copy(base) or {}
    if type(patch) ~= 'table' then return out end
    for k, v in pairs(patch) do
        if type(v) == 'table' and type(out[k]) == 'table' and not U.isArray(v) and not U.isArray(out[k]) then
            out[k] = U.merge(out[k], v)
        else
            out[k] = U.copy(v)
        end
    end
    return out
end

function U.isArray(t)
    if type(t) ~= 'table' then return false end
    local n = #t
    if n == 0 then return next(t) == nil end
    for k in pairs(t) do
        if type(k) ~= 'number' or k < 1 or k > n or k ~= floor(k) then return false end
    end
    return true
end

function U.count(t)
    local n = 0
    for _ in pairs(t) do n = n + 1 end
    return n
end

function U.indexOf(list, value)
    for i, v in ipairs(list) do
        if v == value then return i end
    end
    return nil
end

function U.toSet(list)
    local s = {}
    for _, v in ipairs(list) do s[v] = true end
    return s
end

---------------------------------------------------------------------------
-- Strings
---------------------------------------------------------------------------

function U.trim(s)
    return (tostring(s):gsub('^%s+', ''):gsub('%s+$', ''))
end

-- Number of UTF-8 code points, or nil if the string is not valid UTF-8.
function U.utf8len(s)
    if type(s) ~= 'string' then return nil end
    return utf8.len(s)
end

-- Remove control characters and clamp length (in code points).
function U.cleanText(s, maxLen)
    if type(s) ~= 'string' then return '' end
    if not utf8.len(s) then return '' end
    local out, n = {}, 0
    for _, cp in utf8.codes(s) do
        if cp >= 32 and cp ~= 127 and not (cp >= 0x200B and cp <= 0x200F) and not (cp >= 0x202A and cp <= 0x202E) then
            n = n + 1
            if n > maxLen then break end
            out[#out + 1] = utf8.char(cp)
        end
    end
    return U.trim(concat(out))
end

-- Split a UTF-8 string into a list of characters.
function U.chars(s)
    local out = {}
    if type(s) ~= 'string' or not utf8.len(s) then return out end
    for _, cp in utf8.codes(s) do out[#out + 1] = utf8.char(cp) end
    return out
end

function U.isSafeId(s, maxLen)
    return type(s) == 'string' and #s > 0 and #s <= (maxLen or 48) and s:match('^[a-z0-9][a-z0-9%-_]*$') ~= nil
end

---------------------------------------------------------------------------
-- Canonical serialisation + hash
-- Lua tables have no key order, so json.encode output is not stable.
-- canonical() produces a deterministic string used for hashing and for
-- detecting "nothing changed" without comparing tables field by field.
---------------------------------------------------------------------------

local function canon(v, out)
    local t = type(v)
    if t == 'table' then
        if U.isArray(v) and #v > 0 then
            out[#out + 1] = '['
            for i = 1, #v do
                if i > 1 then out[#out + 1] = ',' end
                canon(v[i], out)
            end
            out[#out + 1] = ']'
        else
            local keys = {}
            for k in pairs(v) do keys[#keys + 1] = tostring(k) end
            sort(keys)
            out[#out + 1] = '{'
            for i, k in ipairs(keys) do
                if i > 1 then out[#out + 1] = ',' end
                out[#out + 1] = fmt('%q:', k)
                local val = v[k]
                if val == nil then val = v[tonumber(k)] end
                canon(val, out)
            end
            out[#out + 1] = '}'
        end
    elseif t == 'number' then
        if math.type(v) == 'integer' then
            out[#out + 1] = fmt('%d', v)
        else
            out[#out + 1] = fmt('%.4f', v)
        end
    elseif t == 'string' then
        out[#out + 1] = fmt('%q', v)
    elseif t == 'boolean' then
        out[#out + 1] = v and 'true' or 'false'
    else
        out[#out + 1] = 'null'
    end
end

function U.canonical(v)
    local out = {}
    canon(v, out)
    return concat(out)
end

-- 32-bit FNV-1a, returned as 8 hex characters.
function U.hash(str)
    local h = 0x811C9DC5
    for i = 1, #str do
        h = h ~ str:byte(i)
        h = (h * 0x01000193) & 0xFFFFFFFF
    end
    return fmt('%08x', h)
end

function U.designHash(design)
    if type(design) ~= 'table' then return nil end
    return U.hash(U.canonical(design))
end

---------------------------------------------------------------------------
-- Durations
---------------------------------------------------------------------------

function U.formatDuration(seconds)
    seconds = math.max(0, floor(seconds or 0))
    local d = floor(seconds / 86400)
    local h = floor((seconds % 86400) / 3600)
    local m = floor((seconds % 3600) / 60)
    if d > 0 then return fmt('%dd %dh', d, h) end
    if h > 0 then return fmt('%dh %dm', h, m) end
    return fmt('%dm', math.max(m, seconds > 0 and 1 or 0))
end
