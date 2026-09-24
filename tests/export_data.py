"""Export the shared Lua data (presets, fonts, schema...) to JSON for UI tests."""
import json, os
from harness import new_runtime, load_shared

def export(path):
    L = new_runtime(server=False)
    load_shared(L)
    s = L.eval("""json.encode({
        presets = EvoraPresets.List,
        fonts = EvoraFonts.List,
        fallback = EvoraFonts.Fallback,
        assets = EvoraAssets.List,
        effects = EvoraEffects.Types,
        effectPresets = EvoraEffects.Presets,
        easings = EvoraEffects.Easings,
        categories = EvoraPresets.Categories,
        schema = EvoraSchema.describe(),
        defaults = EvoraSchema.defaults(),
        affixes = EvoraConst.AffixSymbols,
        numerals = EvoraConst.Numerals,
        limits = EvoraConst.Limits,
        labelFonts = EvoraFonts.Labels,
        defaultLabel = EvoraFonts.DefaultLabel,
        voice = { enabled = true, labels = Config.Voice.Labels, allowCustom = Config.Voice.AllowCustomLabel, defaultLabel = Config.Voice.DefaultLabel },
    })""")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(s)

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'data.json')
    export(out)
    print('wrote', out, os.path.getsize(out))
