--[[
    Evora ID — effect registry
    ------------------------------------------------------------------
    A design carries exactly ONE effect object. `type` selects one of the
    effect types below; the animation itself is implemented in
    html/js/core/effects.js. This file is the authoritative list used by
    server-side validation and by the editor for labels and defaults.

    Effect types
      scope   'any'   works on text, image or both
              'text'  letter effects: always act on the ID characters
      params  which timing controls are meaningful for the type
]]

EvoraEffects = {}

EvoraEffects.Types = {
    { id = 'none',           label = 'بدون تأثير',       en = 'None',           scope = 'any' },
    { id = 'soft-glow',      label = 'توهج ناعم',        en = 'Soft Glow',      scope = 'any',  duration = 3.2,  intensity = 0.55 },
    { id = 'pulse',          label = 'نبض',              en = 'Pulse',          scope = 'any',  duration = 1.8,  intensity = 0.5 },
    { id = 'breathe',        label = 'تنفس',             en = 'Breathing',      scope = 'any',  duration = 4.0,  intensity = 0.4 },
    { id = 'wave',           label = 'تموج',             en = 'Wave',           scope = 'any',  duration = 3.0,  intensity = 0.45 },
    { id = 'float',          label = 'طفو',              en = 'Float',          scope = 'any',  duration = 3.6,  intensity = 0.5 },
    { id = 'shimmer',        label = 'بريق',             en = 'Shimmer',        scope = 'any',  duration = 2.4,  intensity = 0.5 },
    { id = 'flicker',        label = 'وميض',             en = 'Flicker',        scope = 'any',  duration = 3.0,  intensity = 0.6 },
    { id = 'rgb-shift',      label = 'إزاحة لونية',      en = 'RGB Shift',      scope = 'any',  duration = 2.2,  intensity = 0.45 },
    { id = 'rainbow',        label = 'قوس قزح',          en = 'Rainbow',        scope = 'any',  duration = 6.0,  intensity = 1.0 },
    { id = 'gradient-flow',  label = 'تدفق التدرج',      en = 'Gradient Flow',  scope = 'text', duration = 4.0,  intensity = 0.6 },
    { id = 'color-shift',    label = 'تحول لوني',        en = 'Color Shift',    scope = 'any',  duration = 5.0,  intensity = 0.4 },
    { id = 'glitch',         label = 'تشويش',            en = 'Glitch',         scope = 'any',  duration = 2.6,  intensity = 0.5 },
    { id = 'digital-glitch', label = 'تشويش رقمي',       en = 'Digital Glitch', scope = 'any',  duration = 1.6,  intensity = 0.55 },
    { id = 'shine-sweep',    label = 'لمعة عابرة',       en = 'Shine Sweep',    scope = 'any',  duration = 3.2,  intensity = 0.6 },
    { id = 'light-sweep',    label = 'مسح ضوئي',         en = 'Light Sweep',    scope = 'any',  duration = 4.4,  intensity = 0.45 },
    { id = 'fade',           label = 'تلاشي',            en = 'Fade',           scope = 'any',  duration = 3.0,  intensity = 0.5 },
    { id = 'scale-pulse',    label = 'نبض الحجم',        en = 'Scale Pulse',    scope = 'any',  duration = 1.4,  intensity = 0.45 },
    { id = 'rotation',       label = 'دوران',            en = 'Rotation',       scope = 'any',  duration = 6.0,  intensity = 0.25 },
    { id = 'blur-pulse',     label = 'نبض ضبابي',        en = 'Blur Pulse',     scope = 'any',  duration = 2.8,  intensity = 0.4 },
    { id = 'letter-wave',    label = 'موجة الأحرف',      en = 'Letter Wave',    scope = 'text', duration = 1.8,  intensity = 0.5, stagger = 0.12 },
    { id = 'letter-bounce',  label = 'قفز الأحرف',       en = 'Letter Bounce',  scope = 'text', duration = 1.4,  intensity = 0.5, stagger = 0.1 },
    { id = 'letter-float',   label = 'طفو الأحرف',       en = 'Letter Float',   scope = 'text', duration = 3.2,  intensity = 0.45, stagger = 0.35 },
    { id = 'letter-flicker', label = 'وميض الأحرف',      en = 'Letter Flicker', scope = 'text', duration = 2.8,  intensity = 0.6, stagger = 0.4 },
    { id = 'keyframes',      label = 'مخطط زمني مخصص',   en = 'Custom Timeline', scope = 'any', duration = 3.0,  intensity = 1.0 },
}

EvoraEffects.ById = {}
for _, t in ipairs(EvoraEffects.Types) do EvoraEffects.ById[t.id] = t end

EvoraEffects.Easings = { 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'smooth', 'sharp', 'back', 'steps' }
EvoraEffects.Targets = { 'text', 'image', 'all' }
EvoraEffects.Directions = { 'normal', 'reverse' }

--[[
    Effect presets: named, reusable parameter sets for the single effect.
    Applying one replaces the design's effect object; the user can then
    tune it in the timeline.
]]
EvoraEffects.Presets = {
    { id = 'fx-soft-glow',     label = 'توهج ناعم',       en = 'Soft Glow',        effect = { type = 'soft-glow', duration = 3.4, intensity = 0.5, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-deep-breath',   label = 'تنفس عميق',       en = 'Deep Breath',      effect = { type = 'breathe', duration = 5.0, intensity = 0.35, easing = 'smooth', pingpong = true } },
    { id = 'fx-heartbeat',     label = 'نبضة قلب',        en = 'Heartbeat',        effect = { type = 'scale-pulse', duration = 1.2, intensity = 0.5, easing = 'back' } },
    { id = 'fx-pulse',         label = 'نبض هادئ',        en = 'Calm Pulse',       effect = { type = 'pulse', duration = 2.2, intensity = 0.4, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-float',         label = 'طفو لطيف',        en = 'Gentle Float',     effect = { type = 'float', duration = 3.8, intensity = 0.45, easing = 'smooth', pingpong = true } },
    { id = 'fx-wave',          label = 'تموج',            en = 'Wave',             effect = { type = 'wave', duration = 3.2, intensity = 0.4, easing = 'ease-in-out' } },
    { id = 'fx-shimmer',       label = 'بريق فضي',        en = 'Silver Shimmer',   effect = { type = 'shimmer', duration = 2.6, intensity = 0.5, color = '#FFFFFF' } },
    { id = 'fx-neon-flicker',  label = 'وميض نيون',       en = 'Neon Flicker',     effect = { type = 'flicker', duration = 3.6, intensity = 0.7, easing = 'steps' } },
    { id = 'fx-rgb',           label = 'إزاحة لونية',     en = 'RGB Shift',        effect = { type = 'rgb-shift', duration = 2.0, intensity = 0.45 } },
    { id = 'fx-rainbow',       label = 'طيف كامل',        en = 'Rainbow',          effect = { type = 'rainbow', duration = 7.0, intensity = 1.0, easing = 'linear' } },
    { id = 'fx-gradient-flow', label = 'تدفق التدرج',     en = 'Gradient Flow',    effect = { type = 'gradient-flow', duration = 4.5, intensity = 0.6, easing = 'linear' } },
    { id = 'fx-color-shift',   label = 'تحول لوني',       en = 'Color Shift',      effect = { type = 'color-shift', duration = 6.0, intensity = 0.35, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-glitch',        label = 'تشويش',           en = 'Glitch',           effect = { type = 'glitch', duration = 2.8, intensity = 0.45, delay = 0.4 } },
    { id = 'fx-digital',       label = 'تشويش رقمي',      en = 'Digital Glitch',   effect = { type = 'digital-glitch', duration = 1.8, intensity = 0.5, easing = 'steps' } },
    { id = 'fx-slow-shine',    label = 'لمعة بطيئة',      en = 'Slow Shine',       effect = { type = 'shine-sweep', duration = 4.2, intensity = 0.55, delay = 1.2, color = '#FFFFFF' } },
    { id = 'fx-quick-shine',   label = 'لمعة سريعة',      en = 'Quick Shine',      effect = { type = 'shine-sweep', duration = 2.2, intensity = 0.7, delay = 0.6, color = '#FFFFFF' } },
    { id = 'fx-light-sweep',   label = 'مسح ضوئي',        en = 'Light Sweep',      effect = { type = 'light-sweep', duration = 4.6, intensity = 0.45, color = '#F2F4F7' } },
    { id = 'fx-fade',          label = 'تلاشي ناعم',      en = 'Soft Fade',        effect = { type = 'fade', duration = 3.4, intensity = 0.45, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-spin',          label = 'دوران بطيء',      en = 'Slow Spin',        effect = { type = 'rotation', duration = 8.0, intensity = 1.0, easing = 'linear', target = 'image' } },
    { id = 'fx-swing',         label = 'تأرجح',           en = 'Swing',            effect = { type = 'rotation', duration = 3.0, intensity = 0.08, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-blur-pulse',    label = 'نبض ضبابي',       en = 'Blur Pulse',       effect = { type = 'blur-pulse', duration = 3.0, intensity = 0.35, easing = 'ease-in-out', pingpong = true } },
    { id = 'fx-letter-wave',   label = 'موجة الأحرف',     en = 'Letter Wave',      effect = { type = 'letter-wave', duration = 1.8, intensity = 0.5, stagger = 0.12, easing = 'ease-in-out' } },
    { id = 'fx-letter-bounce', label = 'قفز الأحرف',      en = 'Letter Bounce',    effect = { type = 'letter-bounce', duration = 1.3, intensity = 0.5, stagger = 0.1, easing = 'ease-out' } },
    { id = 'fx-letter-float',  label = 'طفو الأحرف',      en = 'Letter Float',     effect = { type = 'letter-float', duration = 3.4, intensity = 0.4, stagger = 0.4, easing = 'smooth' } },
    { id = 'fx-letter-flicker',label = 'وميض الأحرف',     en = 'Letter Flicker',   effect = { type = 'letter-flicker', duration = 3.0, intensity = 0.6, stagger = 0.45 } },
}

EvoraEffects.PresetsById = {}
for _, p in ipairs(EvoraEffects.Presets) do EvoraEffects.PresetsById[p.id] = p end
