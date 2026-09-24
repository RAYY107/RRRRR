# Evora ID — offline tests

These tests are for development only and are **not** part of the resource.

| Script | What it checks |
|---|---|
| `syntax.py` | Every Lua file compiles under Lua 5.4. |
| `test_shared.py` | Schema sanitizer, hostile input, and that all presets round-trip through JSON. |
| `test_server.py` | The real server Lua with an in-memory database and FiveM event mocks: permissions, cooldown, bypass, lock, expiry, manager actions, malformed / oversized / injection-shaped input, rate limiting, exports. |
| `test_client.py` | Client renderer: snapshot / delta ordering, DUI atlas slot assignment, no redundant DUI traffic, sprite drawing, preview sanitation. |
| `gallery.mjs` | Renders every preset through `html/render.html` (the in-game DUI page) → `out/presets.png`. |
| `ui.mjs` | Drives the real editor and management UI in headless Chromium with a mocked bridge → `out/ui-*.png`. |

Requirements: `pip install lupa`, Node 18+ with Playwright (Chromium). Run everything with `./run_all.sh`.
