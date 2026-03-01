-- CreateTable UserAbilityInventory
CREATE TABLE IF NOT EXISTS "UserAbilityInventory" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "abilityId"  TEXT NOT NULL,
  "quantity"   INTEGER NOT NULL DEFAULT 1,
  "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserAbilityInventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserAbilityInventory_userId_abilityId_key" UNIQUE ("userId", "abilityId"),
  CONSTRAINT "UserAbilityInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable Therian: add equippedPassives
ALTER TABLE "Therian" ADD COLUMN IF NOT EXISTS "equippedPassives" TEXT NOT NULL DEFAULT '[]';
