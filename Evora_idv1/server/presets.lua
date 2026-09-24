--[[
    Evora ID — preset catalogue (server)
    ------------------------------------------------------------------
    Catalogue = built-in presets (presets/*.lua) + manager presets stored
    in `evora_id_presets`, with per-preset flags:
      featured  highlighted in the gallery
      locked    visible, but only managers can apply it
      hidden    not shown to players
    `version` increases on every change so clients can cache the list.
]]

Presets = {
    version = 1,
}

local U = EvoraUtils
local catalog = {}      -- id -> preset
local ordered = {}      -- array, sorted
local lockedHashes = {} -- look-alike detection for locked presets

local function bodyHash(design)
    local copy = U.copy(design)
    copy.meta = nil
    return U.designHash(copy)
end

local function rebuild()
    ordered = {}
    lockedHashes = {}
    for _, p in pairs(catalog) do
        ordered[#ordered + 1] = p
        if p.locked then lockedHashes[bodyHash(p.design)] = p.id end
    end
    table.sort(ordered, function(a, b)
        if a.order ~= b.order then return a.order < b.order end
        return a.id < b.id
    end)
    Presets.version = Presets.version + 1
end

local function bool(v)
    return v == true or v == 1 or v == '1'
end

function Presets.load()
    catalog = {}
    for _, p in ipairs(EvoraPresets.List) do
        catalog[p.id] = U.copy(p)
    end

    if DB.available then
        local rows = DB.query('SELECT * FROM `evora_id_presets`') or {}
        for _, row in ipairs(rows) do
            local id = row.id
            if bool(row.builtin) then
                local p = catalog[id]
                if p then
                    p.featured = bool(row.featured)
                    p.locked = bool(row.locked)
                    p.hidden = bool(row.hidden)
                    if tonumber(row.sort_order) and tonumber(row.sort_order) ~= 0 then p.order = tonumber(row.sort_order) end
                end
            elseif U.isSafeId(id, 48) then
                local design = EvoraSchema.fromJson(row.design)
                if design then
                    catalog[id] = {
                        id = id,
                        name = row.name,
                        nameAr = nil,
                        description = row.description or '',
                        category = EvoraPresets.CategorySet[row.category] and row.category or 'custom',
                        builtin = false,
                        featured = bool(row.featured),
                        locked = bool(row.locked),
                        hidden = bool(row.hidden),
                        order = tonumber(row.sort_order) or 1000,
                        design = design,
                        createdBy = row.created_by,
                    }
                else
                    U.warn('Preset "%s" in the database has an invalid design and was skipped.', id)
                end
            end
        end
    end
    rebuild()
    U.info('Presets loaded: %d', #ordered)
end

function Presets.get(id)
    if type(id) ~= 'string' then return nil end
    return catalog[id]
end

-- Returns the preset id when `design` is (visually) identical to a locked preset.
function Presets.lockedMatch(design)
    return lockedHashes[bodyHash(design)]
end

-- List for the NUI. Players do not receive hidden presets.
function Presets.list(forManager)
    local out = {}
    for _, p in ipairs(ordered) do
        if forManager or not p.hidden then
            out[#out + 1] = {
                id = p.id,
                name = p.name,
                nameAr = p.nameAr,
                description = p.description,
                category = p.category,
                builtin = p.builtin,
                featured = p.featured,
                locked = p.locked,
                hidden = forManager and p.hidden or nil,
                order = p.order,
                design = p.design,
            }
        end
    end
    return out
end

-- Design copy of a preset, tagged with its id.
function Presets.designOf(id)
    local p = catalog[id]
    if not p then return nil end
    local d = U.copy(p.design)
    d.meta = d.meta or {}
    d.meta.preset = id
    d.meta.name = p.name
    return d
end

---------------------------------------------------------------------------
-- Management
---------------------------------------------------------------------------

local function upsertFlags(p, actor)
    local now = os.time()
    return DB.update([[INSERT INTO `evora_id_presets`
        (`id`, `builtin`, `name`, `description`, `category`, `design`, `featured`, `locked`, `hidden`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`)
        VALUES (?, 1, ?, '', ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `featured` = VALUES(`featured`), `locked` = VALUES(`locked`), `hidden` = VALUES(`hidden`),
            `sort_order` = VALUES(`sort_order`), `updated_by` = VALUES(`updated_by`), `updated_at` = VALUES(`updated_at`)]], {
        p.id, p.name or '', p.category, p.featured and 1 or 0, p.locked and 1 or 0, p.hidden and 1 or 0, p.order, actor, actor, now, now,
    })
end

local function saveCustom(p, actor)
    local now = os.time()
    return DB.update([[INSERT INTO `evora_id_presets`
        (`id`, `builtin`, `name`, `description`, `category`, `design`, `featured`, `locked`, `hidden`, `sort_order`, `created_by`, `updated_by`, `created_at`, `updated_at`)
        VALUES (?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `category` = VALUES(`category`),
            `design` = VALUES(`design`), `featured` = VALUES(`featured`), `locked` = VALUES(`locked`), `hidden` = VALUES(`hidden`),
            `sort_order` = VALUES(`sort_order`), `updated_by` = VALUES(`updated_by`), `updated_at` = VALUES(`updated_at`)]], {
        p.id, p.name, p.description or '', p.category, json.encode(p.design),
        p.featured and 1 or 0, p.locked and 1 or 0, p.hidden and 1 or 0, p.order, actor, actor, now, now,
    })
end

local function newId(name)
    local base = tostring(name or ''):lower():gsub('[^a-z0-9]+', '-'):gsub('^-+', ''):gsub('-+$', '')
    if base == '' then base = 'preset' end
    base = base:sub(1, 30)
    local id = 'c-' .. base
    local n = 1
    while catalog[id] do
        n = n + 1
        id = ('c-%s-%d'):format(base, n)
    end
    return id
end

local function maxOrder()
    local m = 0
    for _, p in pairs(catalog) do if p.order > m then m = p.order end end
    return m
end

--[[
    data = { name, description, category, design (sanitized), featured, locked, hidden }
    Returns preset or nil, err
]]
function Presets.create(data, actor)
    if not DB.available then return nil, 'db_unavailable' end
    local design = U.copy(data.design)
    local p = {
        id = newId(data.name),
        name = data.name,
        description = data.description or '',
        category = data.category,
        builtin = false,
        featured = data.featured == true,
        locked = data.locked == true,
        hidden = data.hidden == true,
        order = maxOrder() + 1,
        design = design,
        createdBy = actor,
    }
    design.meta = { preset = p.id, name = p.name }
    local _, err = saveCustom(p, actor)
    if err then return nil, 'db_error' end
    catalog[p.id] = p
    rebuild()
    return p
end

function Presets.update(id, data, actor)
    local p = catalog[id]
    if not p then return nil, 'preset_not_found' end
    if not DB.available then return nil, 'db_unavailable' end
    local nextP = U.copy(p)
    if data.featured ~= nil then nextP.featured = data.featured == true end
    if data.locked ~= nil then nextP.locked = data.locked == true end
    if data.hidden ~= nil then nextP.hidden = data.hidden == true end

    local err
    if p.builtin then
        _, err = upsertFlags(nextP, actor)
    else
        if data.name then nextP.name = data.name end
        if data.description then nextP.description = data.description end
        if data.category then nextP.category = data.category end
        if data.design then
            nextP.design = U.copy(data.design)
            nextP.design.meta = { preset = id, name = nextP.name }
        end
        _, err = saveCustom(nextP, actor)
    end
    if err then return nil, 'db_error' end
    catalog[id] = nextP
    rebuild()
    return nextP
end

function Presets.duplicate(id, actor)
    local p = catalog[id]
    if not p then return nil, 'preset_not_found' end
    return Presets.create({
        name = U.cleanText((p.name or 'Preset') .. ' 2', EvoraConst.Limits.NameLength),
        description = p.description,
        category = p.builtin and p.category or p.category,
        design = p.design,
    }, actor)
end

function Presets.delete(id)
    local p = catalog[id]
    if not p then return nil, 'preset_not_found' end
    if p.builtin then return nil, 'builtin_preset' end
    if not DB.available then return nil, 'db_unavailable' end
    local _, err = DB.update('DELETE FROM `evora_id_presets` WHERE `id` = ? AND `builtin` = 0', { id })
    if err then return nil, 'db_error' end
    catalog[id] = nil
    rebuild()
    return p
end

-- ids: full ordering chosen in the manager (unknown ids ignored).
function Presets.reorder(ids, actor)
    if not DB.available then return nil, 'db_unavailable' end
    local seen, position = {}, 0
    for _, id in ipairs(ids) do
        local p = catalog[id]
        if p and not seen[id] then
            seen[id] = true
            position = position + 1
            p.order = position
        end
    end
    for _, p in ipairs(ordered) do
        if not seen[p.id] then
            position = position + 1
            p.order = position
        end
    end
    for _, p in pairs(catalog) do
        if p.builtin then upsertFlags(p, actor) else saveCustom(p, actor) end
    end
    rebuild()
    return true
end
