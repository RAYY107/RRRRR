--[[ Evora ID — built-in presets: Premium + Elegant ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Premium -----------------------------------------------------------------

define({
    id = 'obsidian-crown', category = 'premium', featured = true,
    name = 'Obsidian Crown', nameAr = 'تاج الأوبسيديان',
    description = 'خط Cinzel بتدرج ذهبي ثلاثي وإطار داكن، يعلوه تاج صغير بنفس التدرج ولمعة بطيئة.',
    design = {
        text = {
            font = 'cinzel', weight = 800, size = 84, tracking = 3,
            fill = H.linear(180, '#F9E9B8', '#D4AF37', '#8C6A1C'),
            outline = H.outline(2, '#1A1406'),
            shadow = H.shadow(0, 5, 10, '#000000', 0.65),
            glow = H.glow('#D4AF37', 16, 0.28, 0.7),
        },
        image = H.emblem('crown', { w = 38, h = 38, attach = 'top', gap = -10, tint = H.linear(180, '#F9E9B8', '#B8902B') }),
        layers = { text = { x = 0, y = 12 }, image = { x = 0, y = 0 } },
        effect = H.fx('fx-slow-shine', { color = '#FFF6D8' }),
    },
})

define({
    id = 'platinum-edge', category = 'premium',
    name = 'Platinum Edge', nameAr = 'حافة البلاتين',
    description = 'تدرج بلاتيني متعدد الطبقات بخط Michroma العريض، داخل زوايا إطار رفيعة مع مسح ضوئي.',
    design = {
        text = {
            font = 'michroma', weight = 400, size = 62, tracking = 6,
            fill = H.linear(180, '#FFFFFF', '#C9CED6', '#8E949E', '#E6E9ED'),
            outline = H.outline(1.5, '#2A2D33'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('frame', { w = 150, h = 92, opacity = 0.55, autoWidth = true, pad = 30 }),
        layers = { image = { x = 0, y = 0 } },
        group = { on = true },
        effect = H.fx('fx-light-sweep', { target = 'text' }),
    },
})

define({
    id = 'royal-onyx', category = 'premium',
    name = 'Royal Onyx', nameAr = 'العقيق الملكي',
    description = 'Playfair مائل بتدرج لافندر، الرقم الأول أكبر قليلاً، ونجمة صغيرة بعده مع توهج ناعم.',
    design = {
        text = {
            font = 'playfair', weight = 900, italic = true, size = 94,
            suffix = '✦', affixScale = 0.42, affixGap = 6,
            fill = H.linear(135, '#EFE9F7', '#B8A9D9'),
            outline = H.outline(2, '#120F1A'),
            shadow = H.shadow(0, 8, 16, '#000000', 0.6),
            chars = {
                H.char('first', { scale = 1.14, y = -2 }),
                H.char('suffix', { fill = H.solid('#D9CCF5'), y = -22 }),
            },
        },
        effect = H.fx('fx-soft-glow'),
    },
})

define({
    id = 'laurel', category = 'premium',
    name = 'Laurel', nameAr = 'الغار',
    description = 'رقم Bodoni ذهبي داخل إكليل غار كامل خلفه، مع بريق خفيف.',
    design = {
        text = {
            font = 'bodoni-moda', weight = 800, size = 80,
            fill = H.linear(180, '#FFF6DA', '#D8B45A'),
            outline = H.outline(1.5, '#2A1F08'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('laurel', { w = 128, h = 128, opacity = 0.92, tint = H.linear(180, '#E9C874', '#8A6A22') }),
        layers = { text = { x = 0, y = 2 }, image = { x = 0, y = 6 } },
        group = { on = true },
        effect = H.fx('fx-shimmer', { intensity = 0.4, target = 'text', color = '#FFF3C9' }),
    },
})

define({
    id = 'velvet-night', category = 'premium',
    name = 'Velvet Night', nameAr = 'ليلة مخملية',
    description = 'أرقام عربية بخط المسيري بتدرج بنفسجي وتوهج عميق، وهلال صغير أعلى اليمين.',
    design = {
        text = {
            font = 'el-messiri', weight = 700, size = 100, numerals = 'arabic',
            fill = H.linear(180, '#F5ECFF', '#9B6BD6'),
            glow = H.glow('#7B3FE4', 20, 0.45, 0.8),
            shadow = H.shadow(0, 4, 8, '#0B0613', 0.7),
        },
        image = H.emblem('crescent', { w = 34, h = 34, attach = 'right', gap = -8, tint = H.solid('#E9D8FF') }),
        layers = { text = { x = -10, y = 6 }, image = { x = 0, y = -38 } },
        effect = H.fx('fx-deep-breath', { target = 'all' }),
    },
})

-- Elegant -----------------------------------------------------------------

define({
    id = 'serif-noir', category = 'elegant',
    name = 'Serif Noir', nameAr = 'سيريف نوار',
    description = 'Abril Fatface بلون عاجي دافئ وظل سينمائي طويل، مع نقطة وسطى أنيقة.',
    design = {
        text = {
            font = 'abril-fatface', weight = 400, size = 96,
            suffix = '·', affixScale = 0.9, affixGap = 2,
            fill = H.solid('#F7F3EE'),
            shadow = H.shadow(0, 8, 18, '#000000', 0.75),
            chars = { H.char('suffix', { fill = H.solid('#C8B9A6') }) },
        },
    },
})

define({
    id = 'calligraphy', category = 'elegant',
    name = 'Calligraphy', nameAr = 'رقعة',
    description = 'أرقام عربية بخط الرقعة وتدرج عاجي مع توهج دافئ وطفو هادئ.',
    design = {
        text = {
            font = 'aref-ruqaa', weight = 700, size = 104, numerals = 'arabic',
            fill = H.linear(180, '#FFFFFF', '#CFC6B8'),
            glow = H.glow('#FFF3D6', 12, 0.3, 0.6),
            shadow = H.shadow(0, 4, 8, '#000000', 0.55),
        },
        effect = H.fx('fx-float', { intensity = 0.35 }),
    },
})

define({
    id = 'ivory-script', category = 'elegant',
    name = 'Ivory Script', nameAr = 'النص العاجي',
    description = 'أرقام أميري العربية بلون عاجي وحد بني رفيع، تعلوها هالة تتوهج ببطء.',
    design = {
        text = {
            font = 'amiri', weight = 700, size = 100, numerals = 'arabic',
            fill = H.solid('#F6F1E7'),
            outline = H.outline(1, '#3B342A'),
            shadow = H.shadow(0, 4, 10, '#000000', 0.55),
        },
        image = H.emblem('halo', { w = 70, h = 24, opacity = 0.85, attach = 'top', gap = -4, tint = H.solid('#F6F1E7') }),
        layers = { text = { x = 0, y = 10 }, image = { x = 0, y = 0 } },
        effect = H.fx('fx-soft-glow', { target = 'image' }),
    },
})

define({
    id = 'markazi', category = 'elegant',
    name = 'Markazi', nameAr = 'مركزي',
    description = 'خط مركزي الكلاسيكي بين علامتي تنصيص عربيتين وتدرج رملي هادئ.',
    design = {
        text = {
            font = 'markazi', weight = 700, size = 104, tracking = 2,
            prefix = '«', suffix = '»', affixScale = 0.55, affixGap = 6,
            fill = H.linear(180, '#EFE9DD', '#A89F91'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
            chars = {
                H.char('prefix', { fill = H.solid('#8F877A'), y = -4 }),
                H.char('suffix', { fill = H.solid('#8F877A'), y = -4 }),
            },
        },
        effect = H.fx('fx-fade', { intensity = 0.18, duration = 5 }),
    },
})
