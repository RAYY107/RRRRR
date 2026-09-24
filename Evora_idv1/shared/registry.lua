--[[
    Evora ID — registry indexes
    Builds lookup tables for the font registry (config/fonts.lua).
]]

EvoraFonts.ById = {}
for _, f in ipairs(EvoraFonts.List) do
    if EvoraFonts.ById[f.id] then
        print(('^3[Evora ID] duplicate font id "%s" in config/fonts.lua^7'):format(f.id))
    end
    EvoraFonts.ById[f.id] = f
end

EvoraFonts.LabelsById = {}
for _, f in ipairs(EvoraFonts.Labels or {}) do
    EvoraFonts.LabelsById[f.id] = f
end
