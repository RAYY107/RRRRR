--[[
    Evora ID — Font Registry
    ------------------------------------------------------------------
    Every font shipped with Evora_idv1 is licensed under the SIL Open
    Font License 1.1 (see html/fonts/LICENSES.md). The shipped files are
    glyph subsets that contain only what an overhead ID can display:
    Western digits, Arabic-Indic digits, Persian digits and the allowed
    decorative symbols.

    Adding a font:
      1. Drop the .woff2/.ttf/.otf file into html/fonts/id/
         (make sure its licence allows redistribution).
      2. Add an entry below. `weight` is either a single weight ("700")
         or a variable range ("300 900").
      3. Restart the resource. No other file needs to change.

    Fields:
      id        unique key stored inside designs (lowercase, a-z0-9-)
      label     name shown in the editor
      category  arabic | arabic-display | arabic-serif | sans | condensed |
                display | tech | mono | serif | retro | fallback
      numerals  numeral systems the font actually contains
      weights   selectable weights in the editor
      files     font files relative to html/fonts/
]]

EvoraFonts = {}

-- Fonts used automatically when a glyph is missing from the chosen font.
EvoraFonts.Fallback = {
    arabic = 'noto-kufi',
    symbols = 'noto-symbols',
}

EvoraFonts.List = {
    { id = 'cairo', label = 'Cairo', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/cairo.woff2' } } },
    { id = 'tajawal', label = 'Tajawal', category = 'arabic', numerals = { 'latin', 'arabic' }, weights = { 400, 700, 900 }, files = { { weight = '400', src = 'id/tajawal-400.woff2' }, { weight = '700', src = 'id/tajawal-700.woff2' }, { weight = '900', src = 'id/tajawal-900.woff2' } } },
    { id = 'almarai', label = 'Almarai', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 700, 800 }, files = { { weight = '400', src = 'id/almarai-400.woff2' }, { weight = '700', src = 'id/almarai-700.woff2' }, { weight = '800', src = 'id/almarai-800.woff2' } } },
    { id = 'changa', label = 'Changa', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800 }, files = { { weight = '300 800', src = 'id/changa.woff2' } } },
    { id = 'el-messiri', label = 'El Messiri', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 500, 600, 700 }, files = { { weight = '400 700', src = 'id/el-messiri.woff2' } } },
    { id = 'amiri', label = 'Amiri', category = 'arabic-serif', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/amiri-400.woff2' }, { weight = '700', src = 'id/amiri-700.woff2' } } },
    { id = 'lalezar', label = 'Lalezar', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400 }, files = { { weight = '400', src = 'id/lalezar.woff2' } } },
    { id = 'reem-kufi', label = 'Reem Kufi', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 500, 600, 700 }, files = { { weight = '400 700', src = 'id/reem-kufi.woff2' } } },
    { id = 'rakkas', label = 'Rakkas', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400 }, files = { { weight = '400', src = 'id/rakkas.woff2' } } },
    { id = 'lemonada', label = 'Lemonada', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/lemonada.woff2' } } },
    { id = 'mada', label = 'Mada', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/mada.woff2' } } },
    { id = 'markazi', label = 'Markazi Text', category = 'arabic-serif', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 500, 600, 700 }, files = { { weight = '400 700', src = 'id/markazi.woff2' } } },
    { id = 'aref-ruqaa', label = 'Aref Ruqaa', category = 'arabic-serif', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/aref-ruqaa-400.woff2' }, { weight = '700', src = 'id/aref-ruqaa-700.woff2' } } },
    { id = 'noto-kufi', label = 'Noto Kufi Arabic', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/noto-kufi.woff2' } } },
    { id = 'noto-sans-ar', label = 'Noto Sans Arabic', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/noto-sans-ar.woff2' } } },
    { id = 'plex-ar', label = 'IBM Plex Sans Arabic', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/plex-ar-400.woff2' }, { weight = '700', src = 'id/plex-ar-700.woff2' } } },
    { id = 'readex', label = 'Readex Pro', category = 'arabic', numerals = { 'latin', 'arabic' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/readex.woff2' } } },
    { id = 'blaka', label = 'Blaka', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400 }, files = { { weight = '400', src = 'id/blaka.woff2' } } },
    { id = 'kufam', label = 'Kufam', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/kufam.woff2' } } },
    { id = 'marhey', label = 'Marhey', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/marhey.woff2' } } },
    { id = 'alexandria', label = 'Alexandria', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/alexandria.woff2' } } },
    { id = 'baloo-bhaijaan', label = 'Baloo Bhaijaan 2', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 500, 600, 700, 800 }, files = { { weight = '400 800', src = 'id/baloo-bhaijaan.woff2' } } },
    { id = 'handjet', label = 'Handjet', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/handjet.woff2' } } },
    { id = 'rubik', label = 'Rubik', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/rubik.woff2' } } },
    { id = 'zain', label = 'Zain', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400, 700, 900 }, files = { { weight = '400', src = 'id/zain-400.woff2' }, { weight = '700', src = 'id/zain-700.woff2' }, { weight = '900', src = 'id/zain-900.woff2' } } },
    { id = 'beiruti', label = 'Beiruti', category = 'arabic', numerals = { 'latin', 'arabic', 'persian' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/beiruti.woff2' } } },
    { id = 'badeen', label = 'Badeen Display', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400 }, files = { { weight = '400', src = 'id/badeen.woff2' } } },
    { id = 'jomhuria', label = 'Jomhuria', category = 'arabic-display', numerals = { 'latin', 'arabic', 'persian' }, weights = { 400 }, files = { { weight = '400', src = 'id/jomhuria.woff2' } } },
    { id = 'inter', label = 'Inter', category = 'sans', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/inter.woff2' } } },
    { id = 'montserrat', label = 'Montserrat', category = 'sans', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/montserrat.woff2' } } },
    { id = 'poppins', label = 'Poppins', category = 'sans', numerals = { 'latin' }, weights = { 400, 700, 900 }, files = { { weight = '400', src = 'id/poppins-400.woff2' }, { weight = '700', src = 'id/poppins-700.woff2' }, { weight = '900', src = 'id/poppins-900.woff2' } } },
    { id = 'oswald', label = 'Oswald', category = 'condensed', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/oswald.woff2' } } },
    { id = 'bebas-neue', label = 'Bebas Neue', category = 'condensed', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/bebas-neue.woff2' } } },
    { id = 'anton', label = 'Anton', category = 'condensed', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/anton.woff2' } } },
    { id = 'orbitron', label = 'Orbitron', category = 'tech', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/orbitron.woff2' } } },
    { id = 'rajdhani', label = 'Rajdhani', category = 'tech', numerals = { 'latin' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/rajdhani-400.woff2' }, { weight = '700', src = 'id/rajdhani-700.woff2' } } },
    { id = 'exo2', label = 'Exo 2', category = 'tech', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/exo2.woff2' } } },
    { id = 'audiowide', label = 'Audiowide', category = 'tech', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/audiowide.woff2' } } },
    { id = 'russo-one', label = 'Russo One', category = 'display', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/russo-one.woff2' } } },
    { id = 'teko', label = 'Teko', category = 'condensed', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/teko.woff2' } } },
    { id = 'saira-condensed', label = 'Saira Condensed', category = 'condensed', numerals = { 'latin' }, weights = { 400, 700, 900 }, files = { { weight = '400', src = 'id/saira-condensed-400.woff2' }, { weight = '700', src = 'id/saira-condensed-700.woff2' }, { weight = '900', src = 'id/saira-condensed-900.woff2' } } },
    { id = 'chakra-petch', label = 'Chakra Petch', category = 'tech', numerals = { 'latin' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/chakra-petch-400.woff2' }, { weight = '700', src = 'id/chakra-petch-700.woff2' } } },
    { id = 'space-grotesk', label = 'Space Grotesk', category = 'sans', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'id/space-grotesk.woff2' } } },
    { id = 'space-mono', label = 'Space Mono', category = 'mono', numerals = { 'latin' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/space-mono-400.woff2' }, { weight = '700', src = 'id/space-mono-700.woff2' } } },
    { id = 'jetbrains-mono', label = 'JetBrains Mono', category = 'mono', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800 }, files = { { weight = '300 800', src = 'id/jetbrains-mono.woff2' } } },
    { id = 'michroma', label = 'Michroma', category = 'tech', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/michroma.woff2' } } },
    { id = 'unbounded', label = 'Unbounded', category = 'display', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/unbounded.woff2' } } },
    { id = 'righteous', label = 'Righteous', category = 'display', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/righteous.woff2' } } },
    { id = 'bungee', label = 'Bungee', category = 'display', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/bungee.woff2' } } },
    { id = 'black-ops-one', label = 'Black Ops One', category = 'display', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/black-ops-one.woff2' } } },
    { id = 'monoton', label = 'Monoton', category = 'retro', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/monoton.woff2' } } },
    { id = 'share-tech-mono', label = 'Share Tech Mono', category = 'mono', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/share-tech-mono.woff2' } } },
    { id = 'oxanium', label = 'Oxanium', category = 'tech', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800 }, files = { { weight = '300 800', src = 'id/oxanium.woff2' } } },
    { id = 'sora', label = 'Sora', category = 'sans', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800 }, files = { { weight = '300 800', src = 'id/sora.woff2' } } },
    { id = 'outfit', label = 'Outfit', category = 'sans', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/outfit.woff2' } } },
    { id = 'syne', label = 'Syne', category = 'display', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800 }, files = { { weight = '400 800', src = 'id/syne.woff2' } } },
    { id = 'zen-dots', label = 'Zen Dots', category = 'tech', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/zen-dots.woff2' } } },
    { id = 'tektur', label = 'Tektur', category = 'tech', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/tektur.woff2' } } },
    { id = 'staatliches', label = 'Staatliches', category = 'condensed', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/staatliches.woff2' } } },
    { id = 'playfair', label = 'Playfair Display', category = 'serif', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/playfair.woff2' } } },
    { id = 'cinzel', label = 'Cinzel', category = 'serif', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/cinzel.woff2' } } },
    { id = 'bodoni-moda', label = 'Bodoni Moda', category = 'serif', numerals = { 'latin' }, weights = { 400, 500, 600, 700, 800, 900 }, files = { { weight = '400 900', src = 'id/bodoni-moda.woff2' } } },
    { id = 'abril-fatface', label = 'Abril Fatface', category = 'serif', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/abril-fatface.woff2' } } },
    { id = 'silkscreen', label = 'Silkscreen', category = 'retro', numerals = { 'latin' }, weights = { 400, 700 }, files = { { weight = '400', src = 'id/silkscreen-400.woff2' }, { weight = '700', src = 'id/silkscreen-700.woff2' } } },
    { id = 'press-start', label = 'Press Start 2P', category = 'retro', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/press-start.woff2' } } },
    { id = 'big-shoulders', label = 'Big Shoulders Display', category = 'condensed', numerals = { 'latin' }, weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'id/big-shoulders.woff2' } } },
    { id = 'noto-symbols', label = 'Noto Sans Symbols 2', category = 'fallback', numerals = { 'latin' }, weights = { 400 }, files = { { weight = '400', src = 'id/noto-symbols.woff2' } } },
}

--[[
    Label fonts — full Arabic + Latin glyph sets, used for text that is not
    the ID itself (the "talking now" indicator). Same file rules as above;
    `range` is the CSS unicode-range the file covers.
]]
EvoraFonts.Labels = {
    { id = 'plex-ar', label = 'IBM Plex Sans Arabic', weights = { 400, 700 }, files = { { weight = '400', src = 'label/plex-ar-arabic-400.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400', src = 'label/plex-ar-latin-400.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }, { weight = '700', src = 'label/plex-ar-arabic-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '700', src = 'label/plex-ar-latin-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'cairo', label = 'Cairo', weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'label/cairo-arabic-300-900.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 900', src = 'label/cairo-latin-300-900.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'tajawal', label = 'Tajawal', weights = { 400, 700 }, files = { { weight = '400', src = 'label/tajawal-arabic-400.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400', src = 'label/tajawal-latin-400.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }, { weight = '700', src = 'label/tajawal-arabic-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '700', src = 'label/tajawal-latin-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'almarai', label = 'Almarai', weights = { 400, 700 }, files = { { weight = '400', src = 'label/almarai-arabic-400.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400', src = 'label/almarai-latin-400.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }, { weight = '700', src = 'label/almarai-arabic-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '700', src = 'label/almarai-latin-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'changa', label = 'Changa', weights = { 300, 400, 500, 600, 700, 800 }, files = { { weight = '300 800', src = 'label/changa-arabic-300-800.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 800', src = 'label/changa-latin-300-800.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'el-messiri', label = 'El Messiri', weights = { 400, 500, 600, 700 }, files = { { weight = '400 700', src = 'label/el-messiri-arabic-400-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400 700', src = 'label/el-messiri-latin-400-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'reem-kufi', label = 'Reem Kufi', weights = { 400, 500, 600, 700 }, files = { { weight = '400 700', src = 'label/reem-kufi-arabic-400-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400 700', src = 'label/reem-kufi-latin-400-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'noto-kufi', label = 'Noto Kufi Arabic', weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'label/noto-kufi-arabic-300-900.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 900', src = 'label/noto-kufi-latin-300-900.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'alexandria', label = 'Alexandria', weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'label/alexandria-arabic-300-900.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 900', src = 'label/alexandria-latin-300-900.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'lalezar', label = 'Lalezar', weights = { 400 }, files = { { weight = '400', src = 'label/lalezar-arabic-400.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400', src = 'label/lalezar-latin-400.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'lemonada', label = 'Lemonada', weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'label/lemonada-arabic-300-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 700', src = 'label/lemonada-latin-300-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'aref-ruqaa', label = 'Aref Ruqaa', weights = { 400, 700 }, files = { { weight = '400', src = 'label/aref-ruqaa-arabic-400.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '400', src = 'label/aref-ruqaa-latin-400.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }, { weight = '700', src = 'label/aref-ruqaa-arabic-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '700', src = 'label/aref-ruqaa-latin-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'marhey', label = 'Marhey', weights = { 300, 400, 500, 600, 700 }, files = { { weight = '300 700', src = 'label/marhey-arabic-300-700.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 700', src = 'label/marhey-latin-300-700.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
    { id = 'beiruti', label = 'Beiruti', weights = { 300, 400, 500, 600, 700, 800, 900 }, files = { { weight = '300 900', src = 'label/beiruti-arabic-300-900.woff2', range = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFC' }, { weight = '300 900', src = 'label/beiruti-latin-300-900.woff2', range = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' } } },
}

-- Label font used when a design's own font has no Arabic letters.
EvoraFonts.DefaultLabel = 'plex-ar'
