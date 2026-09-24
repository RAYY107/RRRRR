-- Evora ID — database schema (oxmysql / MySQL / MariaDB)
-- The resource creates these tables automatically on start
-- (Config.Database.AutoSchema = true). Run this file manually only if your
-- database user is not allowed to CREATE tables.

CREATE TABLE IF NOT EXISTS `evora_id_meta` (
    `k` VARCHAR(32) NOT NULL,
    `v` VARCHAR(64) NOT NULL,
    PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evora_id_designs` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evora_id_slots` (
    `owner` VARCHAR(64) NOT NULL,
    `slot` TINYINT UNSIGNED NOT NULL,
    `name` VARCHAR(32) NOT NULL DEFAULT '',
    `design` MEDIUMTEXT NOT NULL,
    `updated_at` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`owner`, `slot`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evora_id_favorites` (
    `owner` VARCHAR(64) NOT NULL,
    `kind` VARCHAR(8) NOT NULL,
    `ref` VARCHAR(48) NOT NULL,
    `created_at` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`owner`, `kind`, `ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evora_id_presets` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `evora_id_audit` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `evora_id_meta` (`k`, `v`) VALUES ('schema', '1') ON DUPLICATE KEY UPDATE `v` = `v`;
