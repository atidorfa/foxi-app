-- Add level and xp to User
ALTER TABLE "User" ADD COLUMN "level" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "User" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

-- Remove level and xp from Therian
ALTER TABLE "Therian" DROP COLUMN "level";
ALTER TABLE "Therian" DROP COLUMN "xp";
