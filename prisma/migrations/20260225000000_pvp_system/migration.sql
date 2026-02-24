-- AlterTable: add equippedAbilities to Therian
ALTER TABLE "Therian" ADD COLUMN "equippedAbilities" TEXT NOT NULL DEFAULT '[]';

-- CreateTable: PvpBattle
CREATE TABLE "PvpBattle" (
    "id"           TEXT NOT NULL,
    "attackerId"   TEXT NOT NULL,
    "attackerTeam" TEXT NOT NULL,
    "defenderTeam" TEXT NOT NULL,
    "state"        TEXT NOT NULL,
    "status"       TEXT NOT NULL DEFAULT 'active',
    "winnerId"     TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PvpBattle_pkey" PRIMARY KEY ("id")
);
