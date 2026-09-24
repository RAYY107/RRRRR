--[[ Evora ID — built-in presets: Neon + Cyber ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Neon --------------------------------------------------------------------

define({
    id = 'neon-pulse', category = 'neon',
    name = 'Neon Pulse', nameAr = 'نبض النيون',
    description = 'خط Monoton ذو الخطوط المتوازية بلون وردي نيون وتوهج كثيف مع وميض أنبوب النيون.',
    design = {
        text = {
            font = 'monoton', weight = 400, size = 92,
            fill = H.solid('#FF4FB8'),
            glow = H.glow('#FF3CAC', 24, 0.8, 0.9),
        },
        effect = H.fx('fx-neon-flicker'),
    },
})

define({
    id = 'cyan-tube', category = 'neon',
    name = 'Cyan Tube', nameAr = 'أنبوب سماوي',
    description = 'قلب أبيض بحد سماوي وتوهج سماوي واسع يشبه أنبوب نيون مضاء، مع توهج يتنفس.',
    design = {
        text = {
            font = 'righteous', weight = 400, size = 90,
            fill = H.solid('#EFFFFF'),
            outline = H.outline(2, '#00E5FF'),
            glow = H.glow('#00E5FF', 22, 0.75, 0.9),
        },
        effect = H.fx('fx-soft-glow'),
    },
})

define({
    id = 'acid', category = 'neon',
    name = 'Acid', nameAr = 'حمضي',
    description = 'أخضر ليموني حاد بخط Audiowide بين علامتي < > داكنتين، ونبض هادئ.',
    design = {
        text = {
            font = 'audiowide', weight = 400, size = 80,
            prefix = '<', suffix = '>', affixScale = 0.7, affixGap = 6,
            fill = H.solid('#D4FF1F'),
            glow = H.glow('#A6FF00', 18, 0.6, 0.85),
            chars = {
                H.char('prefix', { fill = H.solid('#7A8B00'), glow = { on = false } }),
                H.char('suffix', { fill = H.solid('#7A8B00'), glow = { on = false } }),
            },
        },
        effect = H.fx('fx-pulse', { intensity = 0.3 }),
    },
})

define({
    id = 'vapor', category = 'neon',
    name = 'Vapor', nameAr = 'فيبر',
    description = 'تدرج فيبرويف من الوردي إلى البنفسجي إلى الأزرق بخط Zen Dots مع تدفق مستمر للألوان.',
    design = {
        text = {
            font = 'zen-dots', weight = 400, size = 74, tracking = 2,
            fill = H.linear(90, '#FF6AD5', '#C774E8', '#AD8CFF', '#8795E8', '#94D0FF'),
            glow = H.glow('#C774E8', 16, 0.5, 0.8),
        },
        effect = H.fx('fx-gradient-flow'),
    },
})

-- Cyber -------------------------------------------------------------------

define({
    id = 'circuit', category = 'cyber',
    name = 'Circuit', nameAr = 'دارة',
    description = 'أخضر مائي بخط Oxanium داخل أقواس زاوية، مع تشويش رقمي متقطع.',
    design = {
        text = {
            font = 'oxanium', weight = 700, size = 84,
            prefix = '⟨', suffix = '⟩', affixScale = 0.8, affixGap = 4,
            fill = H.solid('#7CF8D4'),
            outline = H.outline(1, '#03211A'),
            glow = H.glow('#2BE6B0', 12, 0.4, 0.8),
            chars = {
                H.char('prefix', { fill = H.solid('#2BA888') }),
                H.char('suffix', { fill = H.solid('#2BA888') }),
            },
        },
        effect = H.fx('fx-digital'),
    },
})

define({
    id = 'glitchcore', category = 'cyber',
    name = 'Glitchcore', nameAr = 'جلتش',
    description = 'أبيض حاد مع ظل أحمر مزاح أفقياً يعطي إحساس الإزاحة اللونية، وتشويش دوري.',
    design = {
        text = {
            font = 'chakra-petch', weight = 700, size = 90,
            fill = H.solid('#F4F5F6'),
            shadow = H.shadow(3, 0, 0, '#FF0055', 0.85),
            glow = H.glow('#00E5FF', 6, 0.35, 0.6),
        },
        effect = H.fx('fx-glitch'),
    },
})

define({
    id = 'terminal', category = 'cyber',
    name = 'Terminal', nameAr = 'الطرفية',
    description = 'أخضر طرفية بخط Space Mono يسبقه > ويتبعه مؤشر _ يومض وحده.',
    design = {
        text = {
            font = 'space-mono', weight = 700, size = 72,
            prefix = '>', suffix = '_', affixScale = 1, affixGap = 6,
            fill = H.solid('#39FF7A'),
            glow = H.glow('#39FF7A', 10, 0.45, 0.8),
            chars = {
                H.char('all', { animate = false }),
                H.char('prefix', { fill = H.solid('#1FA84F'), animate = false }),
                H.char('suffix', { animate = true }),
            },
        },
        effect = H.fx('fx-letter-flicker', { intensity = 1, duration = 1.1, stagger = 0, easing = 'steps' }),
    },
})

define({
    id = 'hologram', category = 'cyber',
    name = 'Hologram', nameAr = 'هولوغرام',
    description = 'تدرج سماوي شبه شفاف بخط Tektur وتوهج أزرق مع إزاحة لونية كالإسقاط الضوئي.',
    design = {
        text = {
            font = 'tektur', weight = 600, size = 86, tracking = 2, opacity = 0.92,
            fill = H.linear(180, { '#C8FAFF', 0, 0.95 }, { '#5AC8FA', 100, 0.6 }),
            glow = H.glow('#5AC8FA', 20, 0.55, 0.8),
        },
        effect = H.fx('fx-rgb', { intensity = 0.35 }),
    },
})

define({
    id = 'grid-runner', category = 'cyber',
    name = 'Grid Runner', nameAr = 'عدّاء الشبكة',
    description = 'Big Shoulders بتدرج أفقي من السماوي إلى البنفسجي ومثلث بنفس التدرج مع مسح ضوئي.',
    design = {
        text = {
            font = 'big-shoulders', weight = 800, size = 100, tracking = 2,
            fill = H.linear(90, '#00F0FF', '#7000FF'),
            outline = H.outline(2, '#05010F'),
            shadow = H.shadow(0, 5, 10, '#000000', 0.7),
        },
        image = H.emblem('triangle', { w = 36, h = 36, attach = 'left', gap = 10, tint = H.linear(90, '#00F0FF', '#7000FF') }),
        layers = { text = { x = 23, y = 0 }, image = { x = 0, y = 2 } },
        effect = H.fx('fx-light-sweep', { color = '#DDFBFF' }),
    },
})
