"""Compile every Lua file of the resource with Lua 5.4 (syntax check)."""
import glob, os, sys
from lupa import lua54
L = lua54.LuaRuntime()
check = L.eval("function(src, name) local f, err = load(src, '@' .. name) return err end")
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Evora_idv1')
bad = 0
files = sorted(glob.glob(os.path.join(root, '**', '*.lua'), recursive=True))
for p in files:
    err = check(open(p, encoding='utf-8').read(), os.path.relpath(p, root))
    if err:
        bad += 1
        print('SYNTAX', err)
print('%d Lua files, %d with errors' % (len(files), bad))
sys.exit(1 if bad else 0)
