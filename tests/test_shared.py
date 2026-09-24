from harness import new_runtime, load_shared

def run():
    L = new_runtime()
    load_shared(L)
    n = L.eval('#EvoraPresets.List')
    assert n >= 50, n
    # every preset design must survive a JSON round trip unchanged
    L.execute("""
        for _, p in ipairs(EvoraPresets.List) do
            local again = EvoraSchema.fromJson(json.encode(p.design))
            assert(again, 'roundtrip failed ' .. p.id)
            assert(EvoraUtils.designHash(again) == EvoraUtils.designHash(p.design), 'hash drift ' .. p.id)
            assert(EvoraFonts.ById[p.design.text.font], 'font ' .. p.id)
        end
    """)
    # hostile input is neutralised
    L.execute("""
        local d = EvoraSchema.sanitize({
            version = 1,
            text = { size = 1e9, font = 'nope', prefix = '12', suffix = '<script>', fill = { type = 'x', color = 'red' } },
            image = { on = true, kind = 'url', url = "javascript:alert(1)" },
            effect = { type = 'evil', keyframes = { { t = 5 } } },
            extra = { junk = true },
            serverId = 99,
        })
        assert(d.text.size == 180)
        assert(d.text.font == 'cairo')
        assert(d.text.prefix == '' and d.text.suffix == '')
        assert(d.text.fill.type == 'solid' and d.text.fill.color == '#F4F5F6')
        assert(d.image.on == false and d.image.url == '')
        assert(d.effect.type == 'none')
        assert(d.extra == nil and d.serverId == nil)
        assert(#d.effect.keyframes >= 2 and d.effect.keyframes[1].t == 0)
        assert(EvoraSchema.sanitize({ version = 99 }) == nil, 'future version must be rejected')
        assert(EvoraSchema.fromJson(string.rep('a', 20000)) == nil)
        assert(EvoraSchema.checkUrl('https://cdn.discordapp.com/a/b.png?ex=1&is=2'))
        assert(not EvoraSchema.checkUrl('https://x.com/a.png)'))
        assert(not EvoraSchema.checkUrl('http://x.com/a.png'))
        assert(EvoraSchema.checkAffix('[#]') and not EvoraSchema.checkAffix('7') and not EvoraSchema.checkAffix('####'))

        -- voice label: letters only, never digits (cannot fake another ID)
        assert(EvoraSchema.checkLabel('يتحدث الآن') and EvoraSchema.checkLabel('On Mic!'))
        assert(not EvoraSchema.checkLabel('ID 99') and not EvoraSchema.checkLabel('رقم ٩٩') and not EvoraSchema.checkLabel('<b>'))
        local v = EvoraSchema.sanitize({ version = 1, voice = { label = 'ID 42', size = 999, icon = 'evil', font = 'nope' } }).voice
        assert(v.label == 'يتحدث الآن' and v.size == 64 and v.icon == 'wave' and v.font == 'plex-ar', 'voice sanitized')
        Config.Voice.AllowCustomLabel = false
        assert(EvoraSchema.sanitize({ version = 1, voice = { label = 'Hello' } }).voice.label == Config.Voice.DefaultLabel)
        assert(EvoraSchema.sanitize({ version = 1, voice = { label = 'Talking' } }).voice.label == 'Talking')
        Config.Voice.AllowCustomLabel = true
        Config.Voice.BlockedWords = { 'bad' }
        assert(EvoraSchema.sanitize({ version = 1, voice = { label = 'so BAD' } }).voice.label == Config.Voice.DefaultLabel)
        Config.Voice.BlockedWords = {}
        -- designs saved before the voice section existed get it by default
        assert(EvoraSchema.sanitize({ version = 1 }).voice.on == true)
    """)
    cats = L.eval("(function() local t = {} for _, p in ipairs(EvoraPresets.List) do t[p.category] = (t[p.category] or 0) + 1 end local s = {} for k, v in pairs(t) do s[#s+1] = k .. '=' .. v end table.sort(s) return table.concat(s, ' ') end)()")
    size = L.eval("#json.encode(EvoraSchema.describe())")
    avg = L.eval("(function() local n = 0 for _, p in ipairs(EvoraPresets.List) do n = n + #json.encode(p.design) end return n // #EvoraPresets.List end)()")
    print('presets:', n, '|', cats)
    print('schema description bytes:', size, '| avg preset json bytes:', avg)

if __name__ == '__main__':
    run()
    print('shared: OK')
