--[[ Evora ID — built-in presets: Metallic + Dark ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Metallic ----------------------------------------------------------------

define({
    id = 'crimson-steel', category = 'metallic', featured = true,
    name = 'Crimson Steel', nameAr = 'الفولاذ القرمزي',
    description = 'تدرج أحمر إلى رمادي داكن بخط عريض وإطار معدني داكن، ظل أسود ناعم، توهج أحمر خفيف، شعار صغير بجانب الرقم ولمعة بطيئة.',
    design = {
        text = {
            font = 'russo-one', weight = 400, size = 88, tracking = 4,
            fill = H.linear(180, '#FF5A5F', '#A4161A', '#3A3D42'),
            outline = H.outline(3, '#16171A'),
            shadow = H.shadow(0, 6, 10, '#000000', 0.7),
            glow = H.glow('#E5383B', 18, 0.32, 0.75),
        },
        image = H.emblem('chevron', { w = 40, h = 40, attach = 'left', gap = 8, tint = H.linear(180, '#F4F5F6', '#8A8F98') }),
        layers = { text = { x = 24, y = 0 }, image = { x = 0, y = 2 } },
        effect = H.fx('fx-slow-shine'),
    },
})

define({
    id = 'chrome', category = 'metallic',
    name = 'Chrome', nameAr = 'كروم',
    description = 'كروم كلاسيكي بخط Orbitron: تدرج بخط أفق حاد في المنتصف وإطار أسود، مع لمعة سريعة.',
    design = {
        text = {
            font = 'orbitron', weight = 900, size = 80, tracking = 2,
            fill = H.linear(180, { '#FFFFFF', 0 }, { '#D6DAE0', 42 }, { '#5E636B', 50 }, { '#C8CDD4', 62 }, { '#FFFFFF', 100 }),
            outline = H.outline(2, '#1C1E22'),
            shadow = H.shadow(0, 5, 8, '#000000', 0.7),
        },
        effect = H.fx('fx-quick-shine'),
    },
})

define({
    id = 'gunmetal', category = 'metallic',
    name = 'Gunmetal', nameAr = 'معدن داكن',
    description = 'Black Ops One بتدرج رصاصي مطفأ وظل ثقيل، مع رمز برق صغير على اليمين. بدون حركة.',
    design = {
        text = {
            font = 'black-ops-one', weight = 400, size = 86,
            fill = H.linear(180, '#9AA0A8', '#4A4F57', '#2A2E34'),
            outline = H.outline(2, '#0E0F11'),
            shadow = H.shadow(2, 7, 6, '#000000', 0.85),
        },
        image = H.emblem('bolt', { w = 30, h = 30, attach = 'right', gap = 6, tint = H.linear(180, '#C9CDD3', '#6C7179') }),
        layers = { text = { x = -18, y = 0 }, image = { x = 0, y = -4 } },
    },
})

define({
    id = 'bronze-forge', category = 'metallic',
    name = 'Bronze Forge', nameAr = 'مسبك البرونز',
    description = 'Oswald طويل بتدرج برونزي ثلاثي وتوهج برتقالي خافت، ودرع برونزي على اليسار مع بريق.',
    design = {
        text = {
            font = 'oswald', weight = 700, size = 96,
            fill = H.linear(180, '#F6C690', '#B06A2A', '#5A2E10'),
            outline = H.outline(2, '#1F1208'),
            glow = H.glow('#FF8A3D', 14, 0.22, 0.6),
            shadow = H.shadow(0, 5, 8, '#000000', 0.7),
        },
        image = H.emblem('shield', { w = 40, h = 40, attach = 'left', gap = 8, tint = H.linear(180, '#F0B77A', '#7A4418') }),
        layers = { text = { x = 24, y = 0 }, image = { x = 0, y = 0 } },
        effect = H.fx('fx-shimmer', { color = '#FFE3C2', target = 'text' }),
    },
})

define({
    id = 'titanium', category = 'metallic',
    name = 'Titanium', nameAr = 'تيتانيوم',
    description = 'Exo 2 مائل بتدرج تيتانيوم متموج وتباعد حروف، وسداسي صغير مع مسح ضوئي.',
    design = {
        text = {
            font = 'exo2', weight = 800, italic = true, size = 84, tracking = 3,
            fill = H.linear(110, '#EEF1F4', '#9AA3AD', '#E8ECEF', '#7C8691'),
            outline = H.outline(1.5, '#22262B'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('hex', { w = 30, h = 30, attach = 'left', gap = 8, tint = H.linear(180, '#E8ECEF', '#7C8691') }),
        layers = { text = { x = 19, y = 0 }, image = { x = 0, y = 0 } },
        effect = H.fx('fx-light-sweep'),
    },
})

-- Dark --------------------------------------------------------------------

define({
    id = 'void', category = 'dark',
    name = 'Void', nameAr = 'الفراغ',
    description = 'نص داكن تقريباً بحد فضي فاتح؛ الرقم يُقرأ من خلال حدوده فقط.',
    design = {
        text = {
            font = 'anton', weight = 400, size = 98, tracking = 2,
            fill = H.solid('#1B1C1F'),
            outline = H.outline(2.5, '#E6E7EA'),
            glow = H.glow('#FFFFFF', 10, 0.18, 0.5),
        },
    },
})

define({
    id = 'eclipse', category = 'dark',
    name = 'Eclipse', nameAr = 'الكسوف',
    description = 'رقم أسود بحد رمادي مع هالة ضوء خلفية وحلقة شفافة تتنفس خلفه مثل الكسوف.',
    design = {
        text = {
            font = 'unbounded', weight = 800, size = 74,
            fill = H.solid('#0E0F12'),
            outline = H.outline(2, '#6B7079'),
            glow = H.glow('#FFFFFF', 26, 0.55, 0.9),
        },
        image = H.emblem('ring', { w = 120, h = 120, opacity = 0.28 }),
        layers = { image = { x = 0, y = 0 } },
        group = { on = true },
        effect = H.fx('fx-deep-breath', { target = 'image', intensity = 0.5 }),
    },
})

define({
    id = 'shadowline', category = 'dark',
    name = 'Shadowline', nameAr = 'خط الظل',
    description = 'Bebas Neue طويل بتدرج فحمي وحد رمادي وظل عميق، يرتكز على خط رفيع.',
    design = {
        text = {
            font = 'bebas-neue', weight = 400, size = 110, tracking = 6,
            fill = H.linear(180, '#44474E', '#121316'),
            outline = H.outline(1.5, '#8A8F98'),
            shadow = H.shadow(0, 10, 20, '#000000', 0.9),
        },
        image = H.emblem('line', { w = 110, h = 14, opacity = 0.4, attach = 'bottom', gap = -4, autoWidth = true, pad = 8 }),
        layers = { text = { x = 0, y = -6 }, image = { x = 0, y = 0 } },
    },
})

define({
    id = 'smoke', category = 'dark',
    name = 'Smoke', nameAr = 'دخان',
    description = 'Teko بتدرج رمادي يتلاشى نحو الأسفل مع نبض ضبابي بطيء مثل الدخان.',
    design = {
        text = {
            font = 'teko', weight = 600, size = 112, tracking = 2,
            fill = H.linear(180, { '#D0D3D8', 0, 0.95 }, { '#55595F', 100, 0.45 }),
            glow = H.glow('#9AA0A6', 16, 0.2, 0.5),
        },
        effect = H.fx('fx-blur-pulse', { intensity = 0.25, duration = 4 }),
    },
})
