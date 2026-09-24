# Evora ID (`Evora_idv1`)

A FiveM resource for vRP (any flavour) and oxmysql that lets players and admins redesign **how their real server ID looks** above their head. The number itself never changes.

- **Resource:** [`Evora_idv1/`](Evora_idv1/). Copy this folder into your server's `resources/` directory. Keep the folder name.
- **Documentation:** [`Evora_idv1/docs/README.md`](Evora_idv1/docs/README.md) covers installation, permissions, configuration, the API, events and troubleshooting.
- **Tests:** [`tests/`](tests/) contains offline Lua tests (Lua 5.4 via `lupa`) and headless-Chromium UI checks. This folder is not needed on a server.

## Quick start

```cfg
# server.cfg
ensure oxmysql
ensure vrp
ensure Evora_idv1

# optional, server-side secrets
set evora_id_webhook "https://discord.com/api/webhooks/…"
set evora_discord_bot_token "YOUR_BOT_TOKEN"
```

Give out the three permissions (`evora.idname.self`, `evora.idname.manage`, `evora.idname.bypass`) through your vRP groups or ACE. Players open the editor with `/idname`, and managers open management with `/idnamemanager`.

---

**Evora** · Made by LR
