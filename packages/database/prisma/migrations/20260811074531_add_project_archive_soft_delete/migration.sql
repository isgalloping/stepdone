-- AlterTable
ALTER TABLE `projects` ADD COLUMN `archived_at` DATETIME(3) NULL,
    ADD COLUMN `deleted_at` DATETIME(3) NULL;
