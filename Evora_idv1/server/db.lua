--[[
    Evora ID — database layer (oxmysql)
    ------------------------------------------------------------------
    Thin promise wrapper around the oxmysql exports. No hard include of
    @oxmysql/lib/MySQL.lua: if oxmysql is missing the resource keeps
    running (IDs still render) and every write fails with a clear error.

    All statements use placeholders (?). No value is ever concatenated
    into SQL text.
]]

DB = {
    available = false,
}

local U = EvoraUtils
local SCHEMA_VERSION = 1
local TIMEOUT_MS = 15000

local function res()
    return Config.Database.ResourceName
end

local function call(method, sql, params)
    if not DB.available then return nil, 'database unavailable' end
    local p = promise.new()
    local settled = false

    local ok, err = pcall(function()
        exports[res()][method](nil, sql, params or {}, function(result, error)
            if settled then return end
            settled = true
            if error then p:reject(error) else p:resolve(result) end
        end, GetCurrentResourceName(), true)
    end)
    if not ok then return nil, tostring(err) end

    SetTimeout(TIMEOUT_MS, function()
        if not settled then
            settled = true
            p:reject('query timed out')
        end
    end)

    local okAwait, result = pcall(Citizen.Await, p)
    if not okAwait then
        U.error('SQL error (%s): %s', method, tostring(result))
        return nil, tostring(result)
    end
    return result
end

function DB.query(sql, params) return call('query', sql, params) end
function DB.single(sql, params) return call('single', sql, params) end
function DB.scalar(sql, params) return call('scalar', sql, params) end
function DB.update(sql, params) return call('update', sql, params) end
function DB.insert(sql, params) return call('insert', sql, params) end

---------------------------------------------------------------------------
-- Schema
---------------------------------------------------------------------------

local TABLES = {
    [[CREATE TABLE IF NOT EXISTS `evora_id_meta` (
        `k` VARCHAR(32) NOT NULL,
        `v` VARCHAR(64) NOT NULL,
        PRIMARY KEY (`k`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],

    -- One row per account. `design` NULL means "no design" (the row is
    -- kept so cooldown / lock state survive a reset).
    [[CREATE TABLE IF NOT EXISTS `evora_id_designs` (
        `owner` VARCHAR(64) NOT NULL,
        `display_name` VARCHAR(64) NULL,
        `design` MEDIUMTEXT NULL,
        `design_hash` CHAR(8) NULL,
        `preset_id` VARCHAR(48) NULL,
        `mode` VARCHAR(12) NOT NULL DEFAULT 'permanent',
        `expires_at` INT UNSIGNED NULL,
        `locked` TINYINT(1) NOT NULL DEFAULT 0,
        `locked_by` VARCHAR(64) NULL,
        `last_self_save` INT UNSIGNED NULL,
        `updated_by` VARCHAR(64) NULL,
        `created_at` INT UNSIGNED NOT NULL,
        `updated_at` INT UNSIGNED NOT NULL,
        PRIMARY KEY (`owner`),
        KEY `idx_mode` (`mode`),
        KEY `idx_expires` (`expires_at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],

    [[CREATE TABLE IF NOT EXISTS `evora_id_slots` (
        `owner` VARCHAR(64) NOT NULL,
        `slot` TINYINT UNSIGNED NOT NULL,
        `name` VARCHAR(32) NOT NULL DEFAULT '',
        `design` MEDIUMTEXT NOT NULL,
        `updated_at` INT UNSIGNED NOT NULL,
        PRIMARY KEY (`owner`, `slot`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],

    [[CREATE TABLE IF NOT EXISTS `evora_id_favorites` (
        `owner` VARCHAR(64) NOT NULL,
        `kind` VARCHAR(8) NOT NULL,
        `ref` VARCHAR(48) NOT NULL,
        `created_at` INT UNSIGNED NOT NULL,
        PRIMARY KEY (`owner`, `kind`, `ref`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],

    -- Manager-created presets (builtin = 0) and flag overrides for the
    -- built-in presets (builtin = 1, design NULL).
    [[CREATE TABLE IF NOT EXISTS `evora_id_presets` (
        `id` VARCHAR(48) NOT NULL,
        `builtin` TINYINT(1) NOT NULL DEFAULT 0,
        `name` VARCHAR(48) NOT NULL DEFAULT '',
        `description` VARCHAR(160) NOT NULL DEFAULT '',
        `category` VARCHAR(24) NOT NULL DEFAULT 'custom',
        `design` MEDIUMTEXT NULL,
        `featured` TINYINT(1) NOT NULL DEFAULT 0,
        `locked` TINYINT(1) NOT NULL DEFAULT 0,
        `hidden` TINYINT(1) NOT NULL DEFAULT 0,
        `sort_order` INT NOT NULL DEFAULT 0,
        `created_by` VARCHAR(64) NULL,
        `updated_by` VARCHAR(64) NULL,
        `created_at` INT UNSIGNED NOT NULL,
        `updated_at` INT UNSIGNED NOT NULL,
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],

    [[CREATE TABLE IF NOT EXISTS `evora_id_audit` (
        `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
        `at` INT UNSIGNED NOT NULL,
        `action` VARCHAR(32) NOT NULL,
        `actor` VARCHAR(64) NULL,
        `actor_name` VARCHAR(64) NULL,
        `target` VARCHAR(64) NULL,
        `target_name` VARCHAR(64) NULL,
        `detail` VARCHAR(255) NULL,
        PRIMARY KEY (`id`),
        KEY `idx_at` (`at`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],
}

-- Future schema upgrades: MIGRATIONS[n] upgrades schema version n to n + 1.
local MIGRATIONS = {}

local function migrate()
    local current = tonumber(DB.scalar('SELECT `v` FROM `evora_id_meta` WHERE `k` = ?', { 'schema' })) or 0
    if current == 0 then
        DB.update('INSERT INTO `evora_id_meta` (`k`, `v`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `v` = VALUES(`v`)', { 'schema', tostring(SCHEMA_VERSION) })
        return
    end
    while current < SCHEMA_VERSION do
        local step = MIGRATIONS[current]
        if step then
            for _, sql in ipairs(step) do DB.update(sql) end
        end
        current = current + 1
        DB.update('UPDATE `evora_id_meta` SET `v` = ? WHERE `k` = ?', { tostring(current), 'schema' })
    end
end

function DB.init()
    local name = res()
    local waited = 0
    while GetResourceState(name) == 'starting' and waited < 20000 do
        Wait(250)
        waited = waited + 250
    end
    if GetResourceState(name) ~= 'started' then
        U.error('oxmysql ("%s") is not running. Designs cannot be saved until it is started. IDs still render.', name)
        return false
    end

    DB.available = true
    local probe = DB.scalar('SELECT 1')
    if probe == nil then
        DB.available = false
        U.error('oxmysql is running but the database is not reachable. Check your connection string.')
        return false
    end

    if Config.Database.AutoSchema then
        for _, sql in ipairs(TABLES) do
            local _, err = DB.update(sql)
            if err then
                U.error('Could not create tables: %s', err)
                DB.available = false
                return false
            end
        end
        migrate()
    end

    -- housekeeping (single statements, never a polling loop)
    local now = os.time()
    local purgeDays = tonumber(Config.Database.PurgeExpiredAfterDays) or 0
    if purgeDays > 0 then
        local cutoff = now - purgeDays * 86400
        DB.update("UPDATE `evora_id_designs` SET `design` = NULL, `design_hash` = NULL, `preset_id` = NULL, `mode` = 'permanent', `expires_at` = NULL WHERE `mode` = 'temporary' AND `expires_at` IS NOT NULL AND `expires_at` < ?", { cutoff })
    end
    local auditDays = tonumber(Config.Database.AuditRetentionDays) or 0
    if auditDays > 0 then
        DB.update('DELETE FROM `evora_id_audit` WHERE `at` < ?', { now - auditDays * 86400 })
    end

    U.info('Database ready.')
    return true
end
