--[[
    Evora ID — design schema (format version 1)
    ------------------------------------------------------------------
    A design describes HOW a player's real server ID is drawn. It never
    contains the ID itself: the number is always supplied at render time
    from the player's actual server ID.

    Shape (abridged):
      {
        version   = 1,
        text      = { font, weight, size, tracking, numerals, prefix, suffix,
                      fill, outline, shadow, glow, chars = { rules... } },
        image     = { on, kind = asset|url|discord, ... }   -- exactly one image slot
        effect    = { type, target, duration, ... }         -- exactly one effect slot
        layers    = { text = {x,y,scale,rotate}, image = {...} },
        group     = { on, x, y, scale, rotate },            -- text + image group
        transform = { x, y, scale, rotate, fade },          -- whole composition
        meta      = { preset, name },
      }

    The schema is declarative. The same description is:
      * used by the server to sanitize every incoming design,
      * sent to the NUI so editor controls use identical ranges/defaults.
]]

EvoraSchema = {}

local U = EvoraUtils
local C = EvoraConst

---------------------------------------------------------------------------
-- Spec constructors
---------------------------------------------------------------------------

local function num(min, max, def, dec)
    return { t = 'num', min = min, max = max, def = def, dec = dec or 2 }
end

local function int(min, max, def)
    return num(min, max, def, 0)
end

local function bool(def)
    return { t = 'bool', def = def }
end

local function enum(values, def)
    return { t = 'enum', values = values, set = U.toSet(values), def = def }
end

local function color(def)
    return { t = 'color', def = def }
end

local function str(max, def, kind)
    return { t = 'str', max = max, def = def or '', kind = kind }
end

local function ref(kind, def)
    return { t = 'ref', kind = kind, def = def }
end

local function obj(fields)
    return { t = 'obj', fields = fields }
end

local function arr(item, max, def, min)
    return { t = 'arr', item = item, max = max, def = def or {}, min = min }
end

local function opt(spec)
    local c = U.copy(spec)
    c.optional = true
    return c
end

---------------------------------------------------------------------------
-- Building blocks
---------------------------------------------------------------------------

local Stop = obj({
    c = color('#FFFFFF'),
    p = num(0, 100, 0, 1),
    a = num(0, 1, 1),
})

local function Fill(defColor, stops)
    return obj({
        type = enum({ 'solid', 'linear', 'radial', 'conic' }, 'solid'),
        color = color(defColor or '#FFFFFF'),
        alpha = num(0, 1, 1),
        angle = int(0, 360, 90),
        cx = int(0, 100, 50),
        cy = int(0, 100, 50),
        stops = arr(Stop, C.Limits.GradientStops, stops or {
            { c = '#FFFFFF', p = 0, a = 1 },
            { c = '#A7ACB4', p = 100, a = 1 },
        }, 2),
    })
end

local function Outline(defWidth, defColor)
    return obj({
        on = bool(false),
        width = num(0, 12, defWidth or 2, 1),
        color = color(defColor or '#0B0B0C'),
        alpha = num(0, 1, 1),
    })
end

local function Shadow()
    return obj({
        on = bool(false),
        x = num(-30, 30, 0, 1),
        y = num(-30, 30, 4, 1),
        blur = num(0, 40, 8, 1),
        color = color('#000000'),
        alpha = num(0, 1, 0.6),
    })
end

local function Glow(defColor)
    return obj({
        on = bool(false),
        color = color(defColor or '#FFFFFF'),
        alpha = num(0, 1, 0.8),
        radius = num(0, 60, 14, 1),
        strength = num(0, 1, 0.6),
    })
end

local function Layer(dx, dy)
    return obj({
        x = num(-256, 256, dx or 0, 1),
        y = num(-128, 128, dy or 0, 1),
        scale = num(0.2, 4, 1, 3),
        rotate = num(-180, 180, 0, 1),
        hidden = bool(false),
    })
end

local CharSelector = obj({
    mode = enum({ 'all', 'index', 'range', 'list', 'first', 'last', 'odd', 'even', 'prefix', 'suffix' }, 'index'),
    a = int(0, 15, 0),
    b = int(0, 15, 0),
    list = arr(int(0, 15, 0), 16),
})

local CharStyle = obj({
    fill = opt(Fill()),
    font = opt(ref('font', 'cairo')),
    weight = opt(int(100, 900, 700)),
    scale = num(0.3, 2.5, 1, 3),
    x = num(-60, 60, 0, 1),
    y = num(-60, 60, 0, 1),
    rotate = num(-180, 180, 0, 1),
    opacity = num(0, 1, 1),
    outline = opt(Outline()),
    shadow = opt(Shadow()),
    glow = opt(Glow()),
    animate = bool(true),
})

local Keyframe = obj({
    t = num(0, 1, 0, 3),
    opacity = num(0, 1, 1),
    scale = num(0.2, 3, 1),
    x = num(-80, 80, 0, 1),
    y = num(-80, 80, 0, 1),
    rotate = num(-360, 360, 0, 1),
    glow = num(0, 1, 0),
    blur = num(0, 8, 0, 1),
})

local DefaultKeyframes = {
    { t = 0, opacity = 1, scale = 1, x = 0, y = 0, rotate = 0, glow = 0, blur = 0 },
    { t = 0.5, opacity = 1, scale = 1.08, x = 0, y = -4, rotate = 0, glow = 0.6, blur = 0 },
    { t = 1, opacity = 1, scale = 1, x = 0, y = 0, rotate = 0, glow = 0, blur = 0 },
}

---------------------------------------------------------------------------
-- The design
---------------------------------------------------------------------------

local Design = obj({
    version = int(1, 1000, C.DesignVersion),
    text = obj({
        font = ref('font', 'cairo'),
        weight = int(100, 900, 800),
        italic = bool(false),
        size = num(24, 180, 88, 1),
        tracking = num(-20, 80, 0, 1),
        lineHeight = num(0.7, 1.8, 1, 2),
        align = enum({ 'center', 'left', 'right' }, 'center'),
        opacity = num(0, 1, 1),
        numerals = enum(C.Numerals, 'latin'),
        prefix = str(C.Limits.AffixChars, '', 'affix'),
        suffix = str(C.Limits.AffixChars, '', 'affix'),
        affixScale = num(0.3, 1.5, 0.6),
        affixGap = num(0, 60, 6, 1),
        fill = Fill('#F4F5F6'),
        fillScope = enum({ 'text', 'char' }, 'text'),
        outline = Outline(),
        shadow = Shadow(),
        glow = Glow(),
        chars = arr(obj({ sel = CharSelector, style = CharStyle }), C.Limits.CharRules),
    }),
    image = obj({
        on = bool(false),
        kind = enum({ 'asset', 'url', 'discord' }, 'asset'),
        asset = ref('asset', 'ring'),
        url = str(C.Limits.UrlLength, '', 'url'),
        discord = str(20, '', 'snowflake'),
        w = num(8, 256, 64, 0),
        h = num(8, 256, 64, 0),
        fit = enum({ 'cover', 'contain' }, 'contain'),
        autoWidth = bool(false),       -- stretch to the rendered ID width (backgrounds)
        pad = num(0, 80, 24, 0),        -- horizontal padding used by autoWidth
        -- attach the image to a side of the rendered ID so it never overlaps,
        -- whatever the number of digits; layers.image.x/y become offsets
        attach = enum({ 'none', 'left', 'right', 'top', 'bottom' }, 'none'),
        gap = num(-60, 120, 10, 0),
        opacity = num(0, 1, 1),
        radius = int(0, 50, 0),
        tint = obj({ on = bool(false), fill = Fill('#FFFFFF') }),
        border = Outline(2, '#FFFFFF'),
        glow = Glow(),
        shadow = Shadow(),
        order = enum({ 'back', 'front' }, 'back'),
    }),
    effect = obj({
        type = ref('effect', 'none'),
        target = enum(EvoraEffects.Targets, 'all'),
        duration = num(0.2, 20, 3, 2),
        delay = num(0, 10, 0, 2),
        speed = num(0.25, 4, 1, 2),
        intensity = num(0, 1, 0.5),
        direction = enum(EvoraEffects.Directions, 'normal'),
        loop = bool(true),
        iterations = int(1, 20, 1),
        pingpong = bool(false),
        easing = enum(EvoraEffects.Easings, 'ease-in-out'),
        stagger = num(0, 1, 0.1),
        color = color('#FFFFFF'),
        keyframes = arr(Keyframe, C.Limits.Keyframes, DefaultKeyframes, 2),
    }),
    layers = obj({
        text = Layer(0, 0),
        image = Layer(-96, 0),
    }),
    group = obj({
        on = bool(false),
        x = num(-256, 256, 0, 1),
        y = num(-128, 128, 0, 1),
        scale = num(0.2, 4, 1, 3),
        rotate = num(-180, 180, 0, 1),
    }),
    transform = obj({
        x = num(-256, 256, 0, 1),
        y = num(-128, 128, 0, 1),
        scale = num(0.3, 2.5, 1, 3),
        rotate = num(-45, 45, 0, 1),
        fade = bool(true),
    }),
    meta = obj({
        preset = str(48, '', 'id'),
        name = str(C.Limits.NameLength, ''),
    }),
})

EvoraSchema.Spec = Design

---------------------------------------------------------------------------
-- Field checks
---------------------------------------------------------------------------

local affixSet = U.toSet(C.AffixSymbols)

local function checkAffix(s)
    if s == '' then return true end
    local n = 0
    for _, ch in ipairs(U.chars(s)) do
        if not affixSet[ch] then return false end
        n = n + 1
    end
    return n <= C.Limits.AffixChars
end

-- Minimal structural URL check. Host allow-lists, size and content-type
-- checks happen on the server (server/images.lua) before a URL is accepted.
local function checkUrl(s)
    if s == '' then return true end
    if #s > C.Limits.UrlLength then return false end
    if not s:match('^https://[%w%-%.]+%.[%a][%w%-]*[:/]') and not s:match('^https://[%w%-%.]+%.[%a][%w%-]*$') then
        return false
    end
    -- characters that could break out of a CSS url() or an attribute
    if s:find('[%s"\'%(%)\\<>`{}|^]') then return false end
    return true
end

local strChecks = {
    affix = checkAffix,
    url = checkUrl,
    snowflake = function(s) return s == '' or (s:match('^%d+$') ~= nil and #s >= 17 and #s <= 20) end,
    id = function(s) return s == '' or U.isSafeId(s, 48) end,
}

local refChecks = {
    font = function(v) return EvoraFonts.ById[v] ~= nil end,
    asset = function(v) return EvoraAssets.ById[v] ~= nil end,
    effect = function(v) return EvoraEffects.ById[v] ~= nil end,
}

---------------------------------------------------------------------------
-- Sanitizer
---------------------------------------------------------------------------

local sanitize

local function sanitizeColor(v, def)
    if type(v) ~= 'string' then return def end
    local hex = v:match('^#(%x%x%x%x%x%x)$')
    if hex then return '#' .. hex:upper() end
    local short = v:match('^#(%x%x%x)$')
    if short then
        return ('#' .. short:sub(1, 1):rep(2) .. short:sub(2, 2):rep(2) .. short:sub(3, 3):rep(2)):upper()
    end
    return def
end

sanitize = function(spec, v)
    local t = spec.t
    if t == 'num' then
        local n = tonumber(v)
        if not U.isNumber(n) then return spec.def end
        return U.round(U.clamp(n, spec.min, spec.max), spec.dec)
    elseif t == 'bool' then
        if type(v) == 'boolean' then return v end
        return spec.def
    elseif t == 'enum' then
        if type(v) == 'string' and spec.set[v] then return v end
        return spec.def
    elseif t == 'color' then
        return sanitizeColor(v, spec.def)
    elseif t == 'str' then
        if type(v) ~= 'string' then return spec.def end
        local s
        if spec.kind == 'url' then
            s = U.trim(v)
            if #s > spec.max then return spec.def end
        else
            s = U.cleanText(v, spec.max)
        end
        local check = spec.kind and strChecks[spec.kind]
        if check and not check(s) then return spec.def end
        return s
    elseif t == 'ref' then
        if type(v) == 'string' and refChecks[spec.kind](v) then return v end
        return spec.def
    elseif t == 'obj' then
        local src = type(v) == 'table' and v or {}
        local out = {}
        for key, field in pairs(spec.fields) do
            local val = src[key]
            if field.optional then
                if val ~= nil and (field.t ~= 'obj' or type(val) == 'table') then
                    out[key] = sanitize(field, val)
                end
            else
                out[key] = sanitize(field, val)
            end
        end
        return out
    elseif t == 'arr' then
        if type(v) ~= 'table' then return U.copy(spec.def) end
        local out = {}
        local n = math.min(#v, spec.max)
        for i = 1, n do
            if v[i] ~= nil then out[#out + 1] = sanitize(spec.item, v[i]) end
        end
        if spec.min and #out < spec.min then return U.copy(spec.def) end
        return out
    end
    return nil
end

---------------------------------------------------------------------------
-- Cross-field rules
---------------------------------------------------------------------------

local function normalize(d)
    local fx = d.effect
    local fxType = EvoraEffects.ById[fx.type]

    -- letter effects always act on the ID characters
    if fxType and fxType.scope == 'text' then fx.target = 'text' end

    -- keyframes: sorted, unique offsets, first at 0 and last at 1
    table.sort(fx.keyframes, function(a, b) return a.t < b.t end)
    local uniq, last = {}, -1
    for _, k in ipairs(fx.keyframes) do
        if k.t > last then uniq[#uniq + 1] = k; last = k.t end
    end
    if #uniq < 2 then uniq = U.copy(DefaultKeyframes) end
    uniq[1].t = 0
    uniq[#uniq].t = 1
    fx.keyframes = uniq

    -- an image needs a source, otherwise it is simply switched off
    local img = d.image
    if img.on then
        if img.kind == 'url' and img.url == '' then img.on = false end
        -- the avatar URL of a Discord image is resolved by the server
        if img.kind == 'discord' and img.discord == '' then img.on = false end
    end
    if img.kind == 'asset' then img.url = ''; img.discord = '' end
    if img.kind == 'url' then img.discord = '' end
    if img.kind ~= 'asset' then img.tint.on = false end

    -- gradient stops sorted by position
    local function sortStops(fill)
        if fill and fill.stops then
            table.sort(fill.stops, function(a, b) return a.p < b.p end)
        end
    end
    sortStops(d.text.fill)
    sortStops(d.image.tint.fill)
    for _, rule in ipairs(d.text.chars) do
        sortStops(rule.style.fill)
        if rule.sel.b < rule.sel.a then rule.sel.a, rule.sel.b = rule.sel.b, rule.sel.a end
    end

    -- the chosen weight must exist for the chosen font (nearest available)
    local function nearestWeight(fontId, w)
        local f = EvoraFonts.ById[fontId]
        if not f or not f.weights or #f.weights == 0 then return w end
        local best, dist = f.weights[1], math.huge
        for _, fw in ipairs(f.weights) do
            local dd = math.abs(fw - w)
            if dd < dist then best, dist = fw, dd end
        end
        return best
    end
    d.text.weight = nearestWeight(d.text.font, d.text.weight)

    d.version = C.DesignVersion
    return d
end

---------------------------------------------------------------------------
-- Migration
-- Each entry upgrades a design from version N to N + 1. Designs are
-- migrated on read, so older rows keep working after an update.
---------------------------------------------------------------------------

local Migrations = {
    -- [1] = function(d) ...; return d end,   -- 1 -> 2 (future)
}

function EvoraSchema.migrate(raw)
    if type(raw) ~= 'table' then return nil end
    local v = math.tointeger(tonumber(raw.version or raw.v)) or 1
    if v > C.DesignVersion then return nil end
    while v < C.DesignVersion do
        local step = Migrations[v]
        if not step then return nil end
        raw = step(raw)
        v = v + 1
    end
    raw.version = C.DesignVersion
    raw.v = nil
    return raw
end

---------------------------------------------------------------------------
-- Public API
---------------------------------------------------------------------------

-- Returns a clean, complete design or nil. Unknown keys are dropped,
-- every number is clamped, every reference is checked.
function EvoraSchema.sanitize(raw)
    local migrated = EvoraSchema.migrate(raw)
    if not migrated then return nil end
    local ok, result = pcall(sanitize, Design, migrated)
    if not ok or type(result) ~= 'table' then return nil end
    return normalize(result)
end

-- Decode + sanitize a JSON string with a size limit.
function EvoraSchema.fromJson(str)
    if type(str) ~= 'string' or #str == 0 or #str > C.Limits.DesignBytes then return nil end
    local ok, raw = pcall(json.decode, str)
    if not ok or type(raw) ~= 'table' then return nil end
    return EvoraSchema.sanitize(raw)
end

function EvoraSchema.defaults()
    return normalize(sanitize(Design, {}))
end

-- Build a design from a partial table (used by presets). Missing fields
-- take schema defaults.
function EvoraSchema.build(partial)
    return EvoraSchema.sanitize(U.merge(EvoraSchema.defaults(), partial or {}))
end

-- Serializable description of the schema for the NUI.
local function describe(spec)
    local out = { t = spec.t, optional = spec.optional or nil }
    if spec.t == 'num' then
        out.min, out.max, out.def, out.dec = spec.min, spec.max, spec.def, spec.dec
    elseif spec.t == 'bool' or spec.t == 'color' then
        out.def = spec.def
    elseif spec.t == 'enum' then
        out.values, out.def = spec.values, spec.def
    elseif spec.t == 'str' then
        out.max, out.def, out.kind = spec.max, spec.def, spec.kind
    elseif spec.t == 'ref' then
        out.kind, out.def = spec.kind, spec.def
    elseif spec.t == 'obj' then
        out.fields = {}
        for k, f in pairs(spec.fields) do out.fields[k] = describe(f) end
    elseif spec.t == 'arr' then
        out.item, out.max, out.min, out.def = describe(spec.item), spec.max, spec.min, spec.def
    end
    return out
end

function EvoraSchema.describe()
    return describe(Design)
end

EvoraSchema.checkUrl = checkUrl
EvoraSchema.checkAffix = checkAffix
