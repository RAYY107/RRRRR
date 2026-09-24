--[[ Evora ID — built-in presets: Animated + Gradient ]]

local H = EvoraPresets.H
local define = EvoraPresets.define

-- Animated ----------------------------------------------------------------

define({
    id = 'heartbeat', category = 'animated',
    name = 'Heartbeat', nameAr = 'نبضة',
    description = 'Rubik عريض بتدرج أحمر وردي ينبض بإيقاع نبضة القلب.',
    design = {
        text = {
            font = 'rubik', weight = 800, size = 90,
            fill = H.linear(180, '#FF6B7D', '#C9184A'),
            glow = H.glow('#FF5A6E', 14, 0.4, 0.8),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        effect = H.fx('fx-heartbeat'),
    },
})

define({
    id = 'wave-rider', category = 'animated',
    name = 'Wave Rider', nameAr = 'راكب الموج',
    description = 'أرقام عربية بخط ليمونادة وتدرج أزرق مائي، كل رقم يتموج بعد الآخر.',
    design = {
        text = {
            font = 'lemonada', weight = 700, size = 86, numerals = 'arabic',
            fill = H.linear(90, '#4FACFE', '#00F2FE'),
            shadow = H.shadow(0, 4, 8, '#001A33', 0.6),
        },
        effect = H.fx('fx-letter-wave'),
    },
})

define({
    id = 'bounce', category = 'animated',
    name = 'Bounce', nameAr = 'قفز',
    description = 'Bungee بتدرج أصفر برتقالي وحد بني داكن، الأرقام تقفز بالتتابع.',
    design = {
        text = {
            font = 'bungee', weight = 400, size = 78,
            fill = H.linear(180, '#FFE259', '#FFA751'),
            outline = H.outline(2, '#2B1A00'),
            shadow = H.shadow(0, 5, 0, '#2B1A00', 0.9),
        },
        effect = H.fx('fx-letter-bounce'),
    },
})

define({
    id = 'orbit', category = 'animated',
    name = 'Orbit', nameAr = 'مدار',
    description = 'Syne أبيض ناعم مع رمز مدار أزرق يدور ببطء على اليمين.',
    design = {
        text = {
            font = 'syne', weight = 800, size = 84,
            fill = H.solid('#EDEFF2'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('orbit', { w = 44, h = 44, attach = 'right', gap = 8, tint = H.linear(180, '#CDE7FF', '#6FA8FF') }),
        layers = { text = { x = -26, y = 0 }, image = { x = 0, y = -2 } },
        effect = H.fx('fx-spin'),
    },
})

define({
    id = 'drift', category = 'animated',
    name = 'Drift', nameAr = 'انجراف',
    description = 'Alexandria بلون أزرق جليدي وتوهج ناعم، كل رقم يطفو بإيقاع مختلف.',
    design = {
        text = {
            font = 'alexandria', weight = 600, size = 86,
            fill = H.solid('#E8F0FF'),
            glow = H.glow('#8AB4FF', 14, 0.35, 0.8),
        },
        effect = H.fx('fx-letter-float'),
    },
})

-- Gradient ----------------------------------------------------------------

define({
    id = 'sunset-strip', category = 'gradient',
    name = 'Sunset Strip', nameAr = 'شريط الغروب',
    description = 'Montserrat أسود بتدرج أفقي من البرتقالي الناري إلى الوردي، مع تحول لوني بطيء.',
    design = {
        text = {
            font = 'montserrat', weight = 900, size = 84,
            fill = H.linear(90, '#FF512F', '#F09819', '#DD2476'),
            shadow = H.shadow(0, 5, 10, '#000000', 0.55),
        },
        effect = H.fx('fx-color-shift', { intensity = 0.2 }),
    },
})

define({
    id = 'aurora', category = 'gradient', featured = true,
    name = 'Aurora', nameAr = 'الشفق',
    description = 'Changa بتدرج قطري من الأخضر المائي إلى الأزرق إلى البنفسجي، يتدفق مثل الشفق القطبي.',
    design = {
        text = {
            font = 'changa', weight = 700, size = 94,
            fill = H.linear(45, '#00C9A7', '#4D8EFF', '#B06AB3'),
            glow = H.glow('#4D8EFF', 16, 0.3, 0.7),
            shadow = H.shadow(0, 4, 8, '#000000', 0.5),
        },
        effect = H.fx('fx-gradient-flow', { duration = 6 }),
    },
})

define({
    id = 'ocean-depth', category = 'gradient',
    name = 'Ocean Depth', nameAr = 'عمق المحيط',
    description = 'تدرج دائري من السماوي في المركز إلى الأزرق العميق، مع شرارة صغيرة أعلى اليمين.',
    design = {
        text = {
            font = 'readex', weight = 700, size = 90,
            fill = H.radial(50, 35, '#B6EEFF', '#3C8CD8', '#1E4F9A'),
            outline = H.outline(1.5, '#04192E'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        image = H.emblem('spark', { w = 24, h = 24, attach = 'right', gap = -6, tint = H.solid('#B6EEFF') }),
        layers = { text = { x = -8, y = 4 }, image = { x = 0, y = -34 } },
    },
})

define({
    id = 'prism', category = 'gradient',
    name = 'Prism', nameAr = 'منشور',
    description = 'Kufam أسود بتدرج مخروطي بكل ألوان الطيف وحد داكن، والألوان تتحرك ببطء.',
    design = {
        text = {
            font = 'kufam', weight = 900, size = 86,
            fill = H.conic(0, '#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B5DE5', '#FF6B6B'),
            outline = H.outline(2, '#111214'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.6),
        },
        effect = H.fx('fx-color-shift', { intensity = 0.5, duration = 8 }),
    },
})

define({
    id = 'rose-quartz', category = 'gradient',
    name = 'Rose Quartz', nameAr = 'كوارتز وردي',
    description = 'Tajawal بتدرج وردي بارد إلى أزرق باهت لكل رقم على حدة، مع حد رفيع.',
    design = {
        text = {
            font = 'tajawal', weight = 900, size = 90, fillScope = 'char',
            fill = H.linear(160, '#F7CAC9', '#92A8D1'),
            outline = H.outline(1, '#2B2233'),
            shadow = H.shadow(0, 4, 8, '#000000', 0.5),
        },
    },
})
