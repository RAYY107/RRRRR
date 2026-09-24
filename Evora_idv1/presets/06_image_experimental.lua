--[[ Evora ID — built-in presets: Image Based + Experimental ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Image based -------------------------------------------------------------

define({
    id = 'winged', category = 'image', featured = true,
    name = 'Winged', nameAr = 'المجنّح',
    description = 'أرقام عربية بخط رقاص أمام جناحين فضيين كبيرين، والتكوين كاملاً يطفو بهدوء.',
    design = {
        text = {
            font = 'rakkas', weight = 400, size = 80, numerals = 'arabic',
            fill = H.solid('#FFFFFF'),
            outline = H.outline(3, '#111214'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.7),
        },
        image = H.emblem('wings', { w = 220, h = 100, opacity = 0.85, tint = H.linear(180, '#C9CED6', '#4E535B') }),
        layers = { text = { x = 0, y = 12 }, image = { x = 0, y = -6 } },
        group = { on = true },
        effect = H.fx('fx-float', { target = 'all', intensity = 0.4 }),
    },
})

define({
    id = 'shielded', category = 'image',
    name = 'Shielded', nameAr = 'الدرع',
    description = 'رقم أبيض ضيق داخل درع داكن بحد فضي، والضوء يمسح الدرع دورياً.',
    design = {
        text = {
            font = 'saira-condensed', weight = 900, size = 70,
            fill = H.solid('#FFFFFF'),
            shadow = H.shadow(0, 3, 6, '#000000', 0.7),
        },
        image = H.emblem('shield', { w = 112, h = 112, tint = H.linear(180, '#3A3E46', '#15161A'), shadow = H.shadow(0, 6, 12, '#000000', 0.6) }),
        layers = { text = { x = 0, y = 4 }, image = { x = 0, y = 2 } },
        group = { on = true },
        effect = H.fx('fx-light-sweep', { target = 'image' }),
    },
})

define({
    id = 'diamond-cut', category = 'image',
    name = 'Diamond Cut', nameAr = 'قطع الماس',
    description = 'Rajdhani عريض بجانب معين فضي، الرقم الأخير ملوّن بدرجة أغمق للتوازن.',
    design = {
        text = {
            font = 'rajdhani', weight = 700, size = 88, tracking = 2,
            fill = H.linear(180, '#FFFFFF', '#C3C8CF'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
            chars = { H.char('last', { fill = H.linear(180, '#AEB4BC', '#6D737B') }) },
        },
        image = H.emblem('diamond', { w = 34, h = 34, attach = 'left', gap = 10, tint = H.linear(180, '#FFFFFF', '#8E949E'), glow = H.glow('#FFFFFF', 8, 0.3, 0.6) }),
        layers = { text = { x = 22, y = 0 }, image = { x = 0, y = 0 } },
    },
})

define({
    id = 'ember', category = 'image',
    name = 'Ember', nameAr = 'جمرة',
    description = 'أرقام عربية بخط لاله‌زار وتدرج ناري، مع لهب صغير يتوهج بجانبها.',
    design = {
        text = {
            font = 'lalezar', weight = 400, size = 98, numerals = 'arabic',
            fill = H.linear(180, '#FFD27A', '#FF6A00'),
            glow = H.glow('#FF6A00', 16, 0.35, 0.75),
            shadow = H.shadow(0, 4, 8, '#1A0800', 0.7),
        },
        image = H.emblem('flame', { w = 38, h = 38, attach = 'right', gap = 4, tint = H.linear(180, '#FFD27A', '#FF4500') }),
        layers = { text = { x = -21, y = 4 }, image = { x = 0, y = -6 } },
        effect = H.fx('fx-soft-glow', { target = 'image' }),
    },
})

define({
    id = 'star-mark', category = 'image',
    name = 'Star Mark', nameAr = 'علامة النجمة',
    description = 'Handjet الحديث بلون أبيض مع نجمة رباعية صغيرة تلمع أعلى اليمين.',
    design = {
        text = {
            font = 'handjet', weight = 700, size = 104,
            fill = H.solid('#F4F5F6'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('star4', { w = 26, h = 26, attach = 'right', gap = -4, glow = H.glow('#FFFFFF', 10, 0.5, 0.8) }),
        layers = { text = { x = -10, y = 6 }, image = { x = 0, y = -40 } },
        effect = H.fx('fx-pulse', { target = 'image', intensity = 0.6, duration = 2.6 }),
    },
})

define({
    id = 'plated', category = 'image',
    name = 'Plated', nameAr = 'اللوحة',
    description = 'رقم فضي على لوحة داكنة مشطوفة الزوايا تتسع تلقائياً مع طول الرقم.',
    design = {
        text = {
            font = 'saira-condensed', weight = 700, size = 62, tracking = 4,
            fill = H.linear(180, '#FFFFFF', '#B9BEC6'),
        },
        image = H.emblem('plate', { w = 128, h = 64, autoWidth = true, pad = 22, tint = H.linear(180, '#26282D', '#111214'), border = H.outline(1.5, '#5C6168') }),
        layers = { text = { x = 0, y = 0 }, image = { x = 0, y = 0 } },
        group = { on = true },
    },
})

-- Experimental ------------------------------------------------------------

define({
    id = 'pixel', category = 'experimental',
    name = 'Pixel', nameAr = 'بكسل',
    description = 'خط Press Start بظل وردي صلب مزاح، والأرقام تقفز بحركة متقطعة كألعاب الثمانينات.',
    design = {
        text = {
            font = 'press-start', weight = 400, size = 58,
            fill = H.solid('#FFFFFF'),
            shadow = H.shadow(4, 4, 0, '#FF2E88', 1),
        },
        effect = H.fx('fx-letter-bounce', { easing = 'steps', intensity = 0.4 }),
    },
})

define({
    id = 'blackletter', category = 'experimental',
    name = 'Blackletter', nameAr = 'القوطي',
    description = 'أرقام عربية بخط بلاكا القوطي بلون ورقي قديم وحد داكن.',
    design = {
        text = {
            font = 'blaka', weight = 400, size = 100, numerals = 'arabic',
            fill = H.solid('#EDE6D6'),
            outline = H.outline(1, '#1A1510'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.7),
        },
    },
})

define({
    id = 'split-tone', category = 'experimental',
    name = 'Split Tone', nameAr = 'ثنائي اللون',
    description = 'الأرقام الفردية بيضاء والزوجية رمادية، الرقم الأول مائل قليلاً، مع موجة خفيفة.',
    design = {
        text = {
            font = 'staatliches', weight = 400, size = 100, tracking = 4,
            fill = H.solid('#FFFFFF'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
            chars = {
                H.char('odd', { fill = H.solid('#8E949E') }),
                H.char('first', { rotate = -6 }),
            },
        },
        effect = H.fx('fx-letter-wave', { intensity = 0.25 }),
    },
})

define({
    id = 'tilted', category = 'experimental',
    name = 'Tilted', nameAr = 'المائل',
    description = 'Jomhuria طويل جداً مائل بكامل التكوين، بظل كثيف وحركة تموج.',
    design = {
        text = {
            font = 'jomhuria', weight = 400, size = 150,
            fill = H.linear(180, '#FFFFFF', '#B9BEC6'),
            shadow = H.shadow(4, 8, 10, '#000000', 0.8),
        },
        transform = { rotate = -8 },
        effect = H.fx('fx-wave', { intensity = 0.3 }),
    },
})

define({
    id = 'hollow', category = 'experimental',
    name = 'Hollow', nameAr = 'المجوّف',
    description = 'رقم شفاف تماماً لا يظهر منه إلا حد أبيض رفيع وتوهج خافت، بخط Unbounded.',
    design = {
        text = {
            font = 'unbounded', weight = 700, size = 80,
            fill = H.solid('#FFFFFF', 0),
            outline = H.outline(1.5, '#FFFFFF'),
            glow = H.glow('#FFFFFF', 10, 0.35, 0.6),
        },
        effect = H.fx('fx-shimmer', { intensity = 0.35 }),
    },
})
