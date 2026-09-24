--[[
    Evora ID — preset registry
    ------------------------------------------------------------------
    Presets use the exact same schema as player designs, so applying a
    preset is a copy of its design (plus meta.preset). Built-in presets
    live in presets/*.lua; presets created by managers in-game are stored
    in the database and merged in by the server (server/presets.lua).
]]

EvoraPresets = {
    List = {},
    ById = {},
}

EvoraPresets.Categories = {
    { id = 'minimal',      label = 'بسيط' },
    { id = 'premium',      label = 'فاخر' },
    { id = 'metallic',     label = 'معدني' },
    { id = 'neon',         label = 'نيون' },
    { id = 'cyber',        label = 'سايبر' },
    { id = 'elegant',      label = 'أنيق' },
    { id = 'dark',         label = 'داكن' },
    { id = 'clean',        label = 'نظيف' },
    { id = 'animated',     label = 'متحرك' },
    { id = 'gradient',     label = 'تدرج' },
    { id = 'image',        label = 'بصورة' },
    { id = 'experimental', label = 'تجريبي' },
    { id = 'custom',       label = 'مخصص' },
}

EvoraPresets.CategorySet = {}
for _, c in ipairs(EvoraPresets.Categories) do EvoraPresets.CategorySet[c.id] = true end

---------------------------------------------------------------------------
-- Authoring helpers (used by presets/*.lua)
---------------------------------------------------------------------------

local H = {}
EvoraPresets.H = H

local function stops(list)
    local out, n = {}, #list
    for i, s in ipairs(list) do
        local auto = n > 1 and ((i - 1) / (n - 1)) * 100 or 0
        if type(s) == 'string' then
            out[i] = { c = s, p = auto, a = 1 }
        else
            out[i] = { c = s[1], p = s[2] or auto, a = s[3] or 1 }
        end
    end
    return out
end

function H.solid(color, alpha)
    return { type = 'solid', color = color, alpha = alpha or 1 }
end

-- H.linear(angle, '#fff', '#999')  or  H.linear(180, {'#fff', 0}, {'#999', 60, 0.8})
function H.linear(angle, ...)
    return { type = 'linear', angle = angle, stops = stops({ ... }) }
end

function H.radial(cx, cy, ...)
    return { type = 'radial', cx = cx, cy = cy, stops = stops({ ... }) }
end

function H.conic(angle, ...)
    return { type = 'conic', angle = angle, stops = stops({ ... }) }
end

function H.outline(width, color, alpha)
    return { on = true, width = width, color = color, alpha = alpha or 1 }
end

function H.shadow(x, y, blur, color, alpha)
    return { on = true, x = x, y = y, blur = blur, color = color or '#000000', alpha = alpha or 0.6 }
end

function H.glow(color, radius, strength, alpha)
    return { on = true, color = color, radius = radius or 14, strength = strength or 0.5, alpha = alpha or 0.85 }
end

-- Effect from an effect preset id (shared/effects.lua) or a raw type.
function H.fx(id, overrides)
    local preset = EvoraEffects.PresetsById[id]
    local base = preset and EvoraUtils.copy(preset.effect) or { type = id }
    return EvoraUtils.merge(base, overrides or {})
end

-- One bundled emblem as the design's single image.
function H.emblem(asset, o)
    o = o or {}
    return {
        on = true,
        kind = 'asset',
        asset = asset,
        w = o.w or 48,
        h = o.h or o.w or 48,
        fit = 'contain',
        autoWidth = o.autoWidth == true,
        pad = o.pad,
        attach = o.attach,
        gap = o.gap,
        opacity = o.opacity or 1,
        radius = o.radius or 0,
        order = o.order or 'back',
        tint = o.tint and { on = true, fill = o.tint } or { on = false },
        glow = o.glow,
        shadow = o.shadow,
        border = o.border,
    }
end

-- Character rule: H.char('first', { fill = ..., scale = 1.2 })
function H.char(mode, style, a, b)
    return { sel = { mode = mode, a = a or 0, b = b or a or 0 }, style = style or {} }
end

---------------------------------------------------------------------------
-- Registration
---------------------------------------------------------------------------

function EvoraPresets.define(def)
    assert(EvoraUtils.isSafeId(def.id, 48), 'invalid preset id: ' .. tostring(def.id))
    assert(not EvoraPresets.ById[def.id], 'duplicate preset id: ' .. def.id)
    assert(EvoraPresets.CategorySet[def.category], 'unknown preset category: ' .. tostring(def.category))

    local partial = EvoraUtils.copy(def.design or {})
    partial.meta = { preset = def.id, name = def.name }
    local design = EvoraSchema.build(partial)
    assert(design, 'preset design failed validation: ' .. def.id)

    local preset = {
        id = def.id,
        name = def.name,
        nameAr = def.nameAr,
        description = def.description or '',
        category = def.category,
        builtin = true,
        featured = def.featured == true,
        locked = false,
        hidden = false,
        order = #EvoraPresets.List + 1,
        design = design,
    }
    EvoraPresets.List[#EvoraPresets.List + 1] = preset
    EvoraPresets.ById[def.id] = preset
    return preset
end
