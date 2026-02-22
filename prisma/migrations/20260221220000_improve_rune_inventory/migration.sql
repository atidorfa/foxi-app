-- Add quantity column (how many copies of this rune the therian owns)
ALTER TABLE "RuneInventory" ADD COLUMN "quantity" INTEGER NOT NULL DEFAULT 1;

-- Add source column (how the rune was obtained)
ALTER TABLE "RuneInventory" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'unknown';

-- Remove duplicate rows before adding unique constraint
-- Keep the row with the highest quantity (or latest obtainedAt if quantities are equal)
DELETE FROM "RuneInventory" ri1
USING "RuneInventory" ri2
WHERE ri1."therianId" = ri2."therianId"
  AND ri1."runeId" = ri2."runeId"
  AND ri1."obtainedAt" < ri2."obtainedAt";

-- Add unique constraint: one row per (therian, rune) — quantity tracks count
CREATE UNIQUE INDEX "RuneInventory_therianId_runeId_key" ON "RuneInventory"("therianId", "runeId");
