--[[
    Evora ID — shared constants
    Values here are part of the design format contract. Changing them
    changes how saved designs are interpreted, so they are not part of
    the user configuration.
]]

EvoraConst = {}

EvoraConst.Resource = GetCurrentResourceName()
EvoraConst.Brand = 'Evora'
EvoraConst.Credit = 'Made by LR'

-- Current version of the serialized design format (see shared/schema.lua).
EvoraConst.DesignVersion = 1

-- Design stage. Every design is laid out on a fixed 512 x 256 unit stage
-- whose origin (0, 0) is the stage centre. The stage centre is anchored
-- above the player's head in the world.
EvoraConst.StageW = 512
EvoraConst.StageH = 256

-- Structural limits. The design format holds exactly one image object and
-- exactly one effect object, so "1 image / 1 effect" is enforced by the
-- shape of the data itself; these limits cover the remaining lists.
EvoraConst.Limits = {
    CharRules = 12,        -- character style rules per design
    GradientStops = 6,     -- colour stops per gradient
    Keyframes = 8,         -- timeline keyframes for the custom effect
    AffixChars = 3,        -- decorative characters before/after the ID
    DesignBytes = 16384,   -- maximum JSON size of one design
    NameLength = 32,       -- slot / preset names
    DescriptionLength = 160,
    UrlLength = 512,
}

-- Decorative symbols allowed around the ID. Digits and letters are never
-- allowed here, so an affix can frame the ID but never alter the number.
EvoraConst.AffixSymbols = {
    '#', '[', ']', '(', ')', '{', '}', '<', '>', '|', '/', '-', '_',
    '·', '•', ':', '~', '+', '*', '«', '»', '‹', '›',
    '◆', '◇', '★', '☆', '✦', '✧', '⟨', '⟩',
}

-- Numeral systems. All three render the same number; only the glyphs differ.
EvoraConst.Numerals = { 'latin', 'arabic', 'persian' }

EvoraConst.Permissions = {
    Self = 'evora.idname.self',
    Manage = 'evora.idname.manage',
    Bypass = 'evora.idname.bypass',
}

EvoraConst.DesignModes = { 'permanent', 'temporary' }

-- Status keys shown as badges in management views.
EvoraConst.Status = {
    Permanent = 'permanent',
    Temporary = 'temporary',
    Expired = 'expired',
    Draft = 'draft',
    None = 'none',
    Cooldown = 'cooldown',
    Locked = 'locked',
}

-- Network event names (kept in one place so they are never mistyped).
local R = 'evora_id:'
EvoraConst.Events = {
    -- client -> server
    Ready = R .. 'server:ready',
    Request = R .. 'server:request',
    -- server -> client
    Snapshot = R .. 'client:snapshot',
    Update = R .. 'client:update',
    Response = R .. 'client:response',
    OpenEditor = R .. 'client:openEditor',
    OpenManager = R .. 'client:openManager',
    Notify = R .. 'client:notify',
    ForceClose = R .. 'client:forceClose',
}

-- Public events other resources can listen to (documented in docs/README.md).
EvoraConst.PublicEvents = {
    DesignLoaded = 'Evora_idv1:designLoaded',
    DesignSaved = 'Evora_idv1:designSaved',
    DesignRemoved = 'Evora_idv1:designRemoved',
    DesignExpired = 'Evora_idv1:designExpired',
    PresetApplied = 'Evora_idv1:presetApplied',
}
