--[[ Evora ID — built-in presets: Minimal + Clean ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Minimal -----------------------------------------------------------------

define({
    id = 'evora-classic', category = 'minimal', featured = true,
    name = 'Evora Classic', nameAr = 'إيفورا الكلاسيكي',
    description = 'الشكل الافتراضي: رقم أبيض واضح بخط Inter وظل ناعم يضمن القراءة فوق أي خلفية.',
    design = {
        text = {
            font = 'inter', weight = 700, size = 80, tracking = 1,
            fill = H.solid('#F4F5F6'),
            shadow = H.shadow(0, 3, 6, '#000000', 0.65),
        },
    },
})

define({
    id = 'mono-line', category = 'minimal',
    name = 'Mono Line', nameAr = 'الخط الأحادي',
    description = 'خط أحادي المسافة مع علامة # خافتة وخط رفيع تحت الرقم.',
    design = {
        text = {
            font = 'jetbrains-mono', weight = 500, size = 70, tracking = 6,
            prefix = '#', affixScale = 0.72, affixGap = 4,
            fill = H.solid('#E8EAED'),
            shadow = H.shadow(0, 2, 5, '#000000', 0.55),
            chars = { H.char('prefix', { fill = H.solid('#7D828B') }) },
        },
        image = H.emblem('line', { w = 96, h = 14, opacity = 0.5, attach = 'bottom', gap = 0, autoWidth = true, pad = 4 }),
        layers = { text = { x = 0, y = -6 }, image = { x = 0, y = 0 } },
    },
})

define({
    id = 'whisper', category = 'minimal',
    name = 'Whisper', nameAr = 'همس',
    description = 'وزن خفيف وتباعد واسع بين الحروف مع توهج أبيض خافت وتلاشٍ هادئ.',
    design = {
        text = {
            font = 'sora', weight = 300, size = 84, tracking = 12,
            fill = H.solid('#FFFFFF', 0.88),
            glow = H.glow('#FFFFFF', 10, 0.25, 0.6),
        },
        effect = H.fx('fx-fade', { intensity = 0.22, duration = 4.2 }),
    },
})

define({
    id = 'graphite', category = 'minimal',
    name = 'Graphite', nameAr = 'جرافيت',
    description = 'تدرج رمادي عمودي من الفضي الفاتح إلى الجرافيت مع حد رفيع جداً.',
    design = {
        text = {
            font = 'space-grotesk', weight = 600, size = 86,
            fill = H.linear(180, '#E3E6EA', '#7D828B'),
            outline = H.outline(1.5, '#101113'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
    },
})

define({
    id = 'bracket', category = 'minimal',
    name = 'Bracket', nameAr = 'الأقواس',
    description = 'الرقم محاط بأقواس مربعة رمادية بخط تقني ضيق.',
    design = {
        text = {
            font = 'share-tech-mono', weight = 400, size = 78,
            prefix = '[', suffix = ']', affixScale = 0.95, affixGap = 8,
            fill = H.solid('#F4F5F6'),
            shadow = H.shadow(0, 3, 6, '#000000', 0.6),
            chars = {
                H.char('prefix', { fill = H.solid('#6B7079') }),
                H.char('suffix', { fill = H.solid('#6B7079') }),
            },
        },
    },
})

define({
    id = 'silver-pulse', category = 'minimal', featured = true,
    name = 'Silver Pulse', nameAr = 'النبض الفضي',
    description = 'تدرج فضي إلى أبيض بحد رمادي رفيع وتوهج أبيض ناعم، مع حلقة صغيرة أعلى اليمين وتنفس خفيف جداً.',
    design = {
        text = {
            font = 'inter', weight = 500, size = 78, tracking = 2,
            fill = H.linear(180, '#FFFFFF', '#AEB3BB'),
            outline = H.outline(1, '#5C6168'),
            glow = H.glow('#FFFFFF', 12, 0.3, 0.7),
        },
        image = H.emblem('ring', { w = 26, h = 26, attach = 'right', gap = -4, tint = H.linear(180, '#FFFFFF', '#AEB3BB') }),
        layers = { text = { x = -10, y = 8 }, image = { x = 0, y = -36 } },
        effect = H.fx('fx-deep-breath', { intensity = 0.22 }),
    },
})

-- Clean -------------------------------------------------------------------

define({
    id = 'soft-white', category = 'clean',
    name = 'Soft White', nameAr = 'أبيض ناعم',
    description = 'رقم أبيض نقي بخط Outfit وظل قريب، بلا أي زخرفة.',
    design = {
        text = {
            font = 'outfit', weight = 600, size = 84,
            fill = H.solid('#FFFFFF'),
            shadow = H.shadow(0, 2, 4, '#000000', 0.5),
        },
    },
})

define({
    id = 'rounded', category = 'clean',
    name = 'Rounded', nameAr = 'دائري',
    description = 'خط مستدير عريض بإطار داكن سميك، واضح من المسافات البعيدة.',
    design = {
        text = {
            font = 'baloo-bhaijaan', weight = 800, size = 92,
            fill = H.solid('#FFFFFF'),
            outline = H.outline(3, '#1A1B1E'),
        },
    },
})

define({
    id = 'kufi-clean', category = 'clean',
    name = 'Kufi Clean', nameAr = 'كوفي نظيف',
    description = 'أرقام عربية مشرقية بخط نوتو كوفي، هادئة ومقروءة.',
    design = {
        text = {
            font = 'noto-kufi', weight = 700, size = 86, numerals = 'arabic',
            fill = H.solid('#F4F5F6'),
            shadow = H.shadow(0, 3, 6, '#000000', 0.6),
        },
    },
})

define({
    id = 'tag', category = 'clean',
    name = 'Tag', nameAr = 'بطاقة',
    description = 'رقم داكن داخل كبسولة فاتحة، يشبه شارة الاسم.',
    design = {
        text = {
            font = 'poppins', weight = 700, size = 64,
            fill = H.solid('#111214'),
        },
        image = H.emblem('pill', { w = 132, h = 70, autoWidth = true, pad = 26, tint = H.linear(180, '#FFFFFF', '#DADDE2'), shadow = H.shadow(0, 4, 10, '#000000', 0.45) }),
        layers = { text = { x = 0, y = 0 }, image = { x = 0, y = 0 } },
        group = { on = true },
    },
})
