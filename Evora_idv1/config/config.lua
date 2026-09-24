--[[
    ███████╗██╗   ██╗ ██████╗ ██████╗  █████╗
    ██╔════╝██║   ██║██╔═══██╗██╔══██╗██╔══██╗
    █████╗  ██║   ██║██║   ██║██████╔╝███████║
    ██╔══╝  ╚██╗ ██╔╝██║   ██║██╔══██╗██╔══██║
    ███████╗ ╚████╔╝ ╚██████╔╝██║  ██║██║  ██║
    ╚══════╝  ╚═══╝   ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ID — Made by LR

    Evora_idv1 configuration.
    This file is shared (client + server). Never put secrets here:
    the webhook URL and the Discord bot token are read from server
    convars (see Webhook / Images.Discord below).
]]

Config = {}

-- Print verbose diagnostics to the console.
Config.Debug = false

---------------------------------------------------------------------------
-- Framework
---------------------------------------------------------------------------
Config.Framework = {
    -- 'auto' detects the installed vRP flavour. Force one of:
    -- 'vrp_legacy'   vRP 1 / Dunko style proxy (table arguments)
    -- 'vrp_modern'   vRP 1.x / vRPex style proxy (plain arguments)
    -- 'vrp_creative' Creative network forks (Passport / HasPermission)
    -- 'vrp2'         vRP 2 (ImagicTheCat, extension based)
    -- 'standalone'   no framework: ACE permissions + license identifier
    Adapter = 'auto',

    -- Name of the vRP resource.
    ResourceName = 'vrp',

    -- Seconds to wait for vRP to become available on start.
    StartTimeout = 30,
}

---------------------------------------------------------------------------
-- Database (oxmysql)
---------------------------------------------------------------------------
Config.Database = {
    ResourceName = 'oxmysql',
    -- Create / upgrade tables automatically on start.
    AutoSchema = true,
    -- Delete expired temporary designs this many days after they expired.
    -- 0 keeps them forever (they stay visible under the "Expired" filter).
    PurgeExpiredAfterDays = 30,
    -- Keep audit rows for this many days (0 = forever).
    AuditRetentionDays = 60,
}

---------------------------------------------------------------------------
-- Permissions (exactly three)
---------------------------------------------------------------------------
Config.Permissions = {
    Self = 'evora.idname.self',       -- edit own design
    Manage = 'evora.idname.manage',   -- manage everyone + presets
    Bypass = 'evora.idname.bypass',   -- skip cooldown (only together with Self)

    -- Also accept FiveM ACE permissions with the same names
    -- (add_ace group.admin evora.idname.manage allow).
    AceFallback = true,

    -- Seconds a permission lookup is cached per player.
    CacheSeconds = 10,

    -- Optional translation to your framework's own permission / group
    -- names, e.g. for Creative:  ['evora.idname.manage'] = 'Admin'
    Map = {
        -- ['evora.idname.self'] = 'evora.idname.self',
    },
}

---------------------------------------------------------------------------
-- Commands
---------------------------------------------------------------------------
Config.Commands = {
    Editor = 'idname',          -- opens the self editor
    Manager = 'idnamemanager',  -- opens management
    -- Optional key mapping for the editor (players can rebind it in
    -- Settings > Key Bindings > FiveM). Set to false to disable.
    EditorKey = false,          -- e.g. 'F7'
}

---------------------------------------------------------------------------
-- vRP BuilderMenu integration
---------------------------------------------------------------------------
Config.BuilderMenu = {
    Enabled = true,
    -- Menu builder name the entries are added to. For vRP 1 this is
    -- usually 'main' or 'admin'. Use whatever your fork calls its builder
    -- (for example 'BuilderMenu').
    Parent = 'main',
    -- Optional separate parent for the management entry (nil = Parent).
    ManageParent = 'admin',
    SelfLabel = 'Evora ID',
    SelfDescription = 'تخصيص شكل رقم الهوية فوق شخصيتك',
    ManageLabel = 'Evora ID — الإدارة',
    ManageDescription = 'إدارة تصاميم أرقام اللاعبين والقوالب',
}

---------------------------------------------------------------------------
-- Cooldown (self editing)
---------------------------------------------------------------------------
Config.Cooldown = {
    Enabled = true,
    -- Seconds between two successful self saves. 259200 = 3 days.
    Seconds = 3 * 24 * 60 * 60,
    -- Managers saving their own design through the self editor skip the
    -- cooldown. Bypass (with Self) always skips it.
    ManagersExempt = true,
}

---------------------------------------------------------------------------
-- Temporary designs
---------------------------------------------------------------------------
Config.Temporary = {
    -- Durations offered in management (seconds). Custom durations are
    -- always available as well.
    Durations = {
        { label = '3 أيام', seconds = 3 * 86400 },
        { label = '7 أيام', seconds = 7 * 86400 },
        { label = '30 يوماً', seconds = 30 * 86400 },
    },
    DefaultSeconds = 7 * 86400,
    MaxSeconds = 365 * 86400,
    -- When a player edits a temporary design they keep its expiry
    -- (true) or it becomes permanent (false).
    SelfEditKeepsExpiry = true,
    -- How often (seconds) online players' temporary designs are checked
    -- in memory. The database is never polled.
    CheckInterval = 60,
}

---------------------------------------------------------------------------
-- Design slots / favourites
---------------------------------------------------------------------------
Config.Slots = {
    Count = 3,          -- saved designs per player
}

Config.Favorites = {
    Max = 40,
}

---------------------------------------------------------------------------
-- Default look for players without a design
---------------------------------------------------------------------------
-- A preset id, or false to draw players without a design with the
-- lightweight native text renderer.
Config.DefaultPreset = 'evora-classic'

---------------------------------------------------------------------------
-- Rendering (client)
---------------------------------------------------------------------------
Config.Render = {
    -- 'always'  IDs are always visible
    -- 'hold'    visible while the key is held
    -- 'toggle'  key toggles visibility
    DisplayMode = 'always',
    Key = 'HOME',                   -- used by hold/toggle (rebindable)

    MaxDistance = 22.0,             -- metres
    FadeStart = 16.0,               -- start fading at this distance
    HeightOffset = 0.42,            -- metres above the head bone
    ShowOwn = true,                 -- show the ID above your own head
    RequireLineOfSight = true,      -- hide IDs behind walls
    HideInVehicles = false,

    -- World height covered by the full 512x256 design stage (metres).
    -- The ID scales with real perspective, clamped below.
    StageWorldHeight = 0.62,
    Scale = 1.0,                    -- global size multiplier
    DistanceScaling = true,         -- false = constant on-screen size
    MinScreenHeight = 0.045,        -- clamp (fraction of screen height)
    MaxScreenHeight = 0.30,

    -- DUI atlas. One off-screen browser renders every visible design.
    AtlasColumns = 4,
    AtlasRows = 4,                  -- 16 designs rendered simultaneously
    -- Players beyond the atlas capacity fall back to native text.

    -- Update rate of the visibility scan (ms). Drawing is every frame.
    ScanInterval = 250,
}

---------------------------------------------------------------------------
-- Editor
---------------------------------------------------------------------------
Config.Editor = {
    -- Scripted camera framing the player in the editor.
    CameraDistance = 1.9,
    CameraHeight = 0.55,
    CameraFov = 38.0,
    MinZoom = 1.1,
    MaxZoom = 3.6,
    -- Disable the editor while in a vehicle / dead / ragdolling.
    BlockInVehicle = true,
    -- Default snap sensitivity (screen pixels).
    SnapThreshold = 8,
}

---------------------------------------------------------------------------
-- Images
---------------------------------------------------------------------------
Config.Images = {
    Enabled = true,
    AllowUrl = true,
    AllowDiscord = true,

    -- Only these hosts are accepted for direct URLs. Set AllowAnyHost to
    -- true to accept every HTTPS host (not recommended).
    AllowAnyHost = false,
    AllowedHosts = {
        'cdn.discordapp.com',
        'media.discordapp.net',
        'i.imgur.com',
        'i.ibb.co',
        'images.weserv.nl',
        'r2.fivemanage.com',
        'files.fivemerr.com',
    },
    Extensions = { 'png', 'jpg', 'jpeg', 'webp', 'gif' },
    AllowGif = true,
    MaxBytes = 4 * 1024 * 1024,     -- 4 MB
    MaxUrlLength = 512,
    -- Seconds a validated URL is trusted before it is checked again.
    CacheSeconds = 6 * 60 * 60,

    Discord = {
        -- Name of the server convar holding a Discord bot token, used to
        -- resolve a Discord user id to their current avatar. Set it in
        -- server.cfg:  set evora_discord_bot_token "YOUR_TOKEN"
        -- Without a token the Discord default avatar is used.
        TokenConvar = 'evora_discord_bot_token',
        AvatarSize = 256,
        -- Re-resolve stored Discord avatars older than this (hours).
        RefreshHours = 24,
    },
}

---------------------------------------------------------------------------
-- Audit webhook
---------------------------------------------------------------------------
Config.Webhook = {
    Enabled = true,
    -- The URL is read from this server convar so it never reaches clients:
    --   set evora_id_webhook "https://discord.com/api/webhooks/..."
    UrlConvar = 'evora_id_webhook',
    Username = 'Evora ID',
    Color = 0x9AA0A6,
    -- Which actions are sent.
    Actions = {
        open_manager = true,
        edit_design = true,
        apply_preset = true,
        delete_design = true,
        reset_cooldown = true,
        change_expiration = true,
        lock_design = true,
        force_style = true,
        preset_create = true,
        preset_update = true,
        preset_delete = true,
        self_save = false,
    },
}

---------------------------------------------------------------------------
-- Management
---------------------------------------------------------------------------
Config.Management = {
    -- Allow "force style" (apply + lock) from management.
    AllowForce = true,
    PageSize = 40,
}

---------------------------------------------------------------------------
-- Security
---------------------------------------------------------------------------
Config.Security = {
    -- Requests per player per window (seconds) before they are dropped.
    RateWindow = 10,
    RateLimit = 40,
    -- Heavier actions (save, image validation) have their own budget.
    HeavyLimit = 8,
    -- Log dropped / rejected requests to the console.
    LogRejections = true,
}

---------------------------------------------------------------------------
-- Notifications
---------------------------------------------------------------------------
-- Client-side notification hook. Replace to use your own notify system.
Config.Notify = function(message, kind)
    BeginTextCommandThefeedPost('STRING')
    AddTextComponentSubstringPlayerName(message)
    EndTextCommandThefeedPostTicker(false, true)
end
