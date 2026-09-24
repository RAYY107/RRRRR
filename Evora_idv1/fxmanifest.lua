fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'Evora_idv1'
author 'Made by LR'
description 'Evora ID — premium visual designer for the overhead FiveM server ID'
version '1.0.0'

-- oxmysql and vRP are detected at runtime (see docs/README.md). They are
-- not hard dependencies so the resource degrades gracefully without them.

shared_scripts {
    'config/config.lua',
    'config/fonts.lua',
    'shared/constants.lua',
    'shared/utils.lua',
    'shared/effects.lua',
    'shared/assets.lua',
    'shared/registry.lua',
    'shared/schema.lua',
    'shared/presets.lua',
    'presets/*.lua',
}

server_scripts {
    'framework/adapter.lua',
    'framework/vrp/bridge.lua',
    'framework/vrp/modern.lua',
    'framework/vrp/legacy.lua',
    'framework/vrp/creative.lua',
    'framework/vrp/vrp2.lua',
    'framework/standalone.lua',
    'server/db.lua',
    'server/ratelimit.lua',
    'server/permissions.lua',
    'server/webhook.lua',
    'server/audit.lua',
    'server/images.lua',
    'server/validation.lua',
    'server/presets.lua',
    'server/state.lua',
    'server/designs.lua',
    'server/requests.lua',
    'server/api.lua',
    'server/main.lua',
}

client_scripts {
    'client/renderer.lua',
    'client/editor.lua',
    'client/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/render.html',
    'html/css/*.css',
    'html/js/*.js',
    'html/js/**/*.js',
    'html/assets/**/*',
    'html/fonts/**/*',
}
