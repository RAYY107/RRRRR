--[[
    Evora ID — bundled image assets
    ------------------------------------------------------------------
    Emblems shipped inside the resource (html/assets/emblems). They load
    instantly, never depend on an external host and can be tinted with
    any fill because they are drawn as alpha masks.

    To add an emblem: drop a white-on-transparent SVG/PNG into
    html/assets/emblems/ and add a line below.

    `shape` marks backgrounds drawn with CSS geometry (so they stay crisp
    at any width/height); their SVG is only used as the picker thumbnail.
]]

EvoraAssets = {}

EvoraAssets.List = {
    { id = 'ring',     label = 'حلقة',       file = 'assets/emblems/ring.svg' },
    { id = 'hex',      label = 'سداسي',      file = 'assets/emblems/hex.svg' },
    { id = 'diamond',  label = 'معين',       file = 'assets/emblems/diamond.svg' },
    { id = 'chevron',  label = 'شيفرون',     file = 'assets/emblems/chevron.svg' },
    { id = 'bolt',     label = 'برق',        file = 'assets/emblems/bolt.svg' },
    { id = 'crown',    label = 'تاج',        file = 'assets/emblems/crown.svg' },
    { id = 'wings',    label = 'أجنحة',      file = 'assets/emblems/wings.svg' },
    { id = 'star4',    label = 'نجمة',       file = 'assets/emblems/star4.svg' },
    { id = 'shield',   label = 'درع',        file = 'assets/emblems/shield.svg' },
    { id = 'crescent', label = 'هلال',       file = 'assets/emblems/crescent.svg' },
    { id = 'orbit',    label = 'مدار',       file = 'assets/emblems/orbit.svg' },
    { id = 'bars',     label = 'أعمدة',      file = 'assets/emblems/bars.svg' },
    { id = 'triangle', label = 'مثلث',       file = 'assets/emblems/triangle.svg' },
    { id = 'spark',    label = 'شرارة',      file = 'assets/emblems/spark.svg' },
    { id = 'laurel',   label = 'إكليل',      file = 'assets/emblems/laurel.svg' },
    { id = 'halo',     label = 'هالة',       file = 'assets/emblems/halo.svg' },
    { id = 'flame',    label = 'لهب',        file = 'assets/emblems/flame.svg' },
    { id = 'cross',    label = 'تقاطع',      file = 'assets/emblems/cross.svg' },
    { id = 'line',     label = 'خط',         file = 'assets/emblems/line.svg', shape = 'line' },
    { id = 'frame',    label = 'إطار زوايا', file = 'assets/emblems/frame.svg', shape = 'corners' },
    { id = 'pill',     label = 'كبسولة',     file = 'assets/emblems/pill.svg', shape = 'pill' },
    { id = 'plate',    label = 'لوحة',       file = 'assets/emblems/plate.svg', shape = 'plate' },
}

EvoraAssets.ById = {}
for _, a in ipairs(EvoraAssets.List) do EvoraAssets.ById[a.id] = a end
