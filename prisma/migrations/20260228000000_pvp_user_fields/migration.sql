-- Add PvP-related fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tutorialProgress"      TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mmr"                   INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "peakMmr"               INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "weeklyPvpWins"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "weeklyPvpResetAt"      TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastWeeklyChestAt"     TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastMonthlyRewardMonth" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pvpEnergy"             INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pvpEnergyRegenAt"      TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "savedPvpTeam"          TEXT;

-- CreateTable: UserRuneInventory (runes awarded via PvP rewards, not tied to a specific Therian)
CREATE TABLE IF NOT EXISTS "UserRuneInventory" (
    "id"       TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "runeId"   TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source"   TEXT NOT NULL DEFAULT 'reward',

    CONSTRAINT "UserRuneInventory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "UserRuneInventory_userId_runeId_key" UNIQUE ("userId", "runeId")
);

-- AddForeignKey
ALTER TABLE "UserRuneInventory" ADD CONSTRAINT "UserRuneInventory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
