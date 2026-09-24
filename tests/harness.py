"""Offline Lua harness for Evora_idv1 (Lua 5.4 via lupa).

Loads the shared scripts exactly in fxmanifest order with light FiveM mocks,
so schema validation, presets and server logic can be exercised without a
FiveM server. Usage: python3 tests/run_tests.py
"""
import os, glob
from lupa import lua54

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Evora_idv1')
TESTS = os.path.dirname(os.path.abspath(__file__))

SHARED = [
    'config/config.lua', 'config/fonts.lua',
    'shared/constants.lua', 'shared/utils.lua', 'shared/effects.lua', 'shared/assets.lua',
    'shared/registry.lua', 'shared/schema.lua', 'shared/presets.lua',
]

def new_runtime(server=True):
    L = lua54.LuaRuntime(unpack_returned_tuples=True)
    L.execute("package.path = %r .. '/?.lua;' .. package.path" % TESTS)
    L.execute("json = require('json')")
    L.execute("""
        function GetCurrentResourceName() return 'Evora_idv1' end
        function IsDuplicityVersion() return %s end
        function GetGameTimer() return math.floor(os.clock() * 1000) end
        function GetConvar(k, d) return d end
        Citizen = { CreateThread = function(f) end, Wait = function() end }
        CreateThread = function(f) end
        Wait = function() end
    """ % ('true' if server else 'false'))
    return L

def load(L, rel):
    path = os.path.join(ROOT, rel)
    with open(path, encoding='utf-8') as fh:
        src = fh.read()
    fn = L.eval("function(src, name) local f, err = load(src, '@' .. name) if not f then error(err) end return f end")(src, rel)
    fn()

def load_shared(L):
    for rel in SHARED:
        load(L, rel)
    for p in sorted(glob.glob(os.path.join(ROOT, 'presets', '*.lua'))):
        load(L, os.path.relpath(p, ROOT))
