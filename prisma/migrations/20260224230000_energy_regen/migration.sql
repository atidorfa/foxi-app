ALTER TABLE "User" ADD COLUMN "energyLastUpdatedAt" TIMESTAMP;
ALTER TABLE "User" DROP COLUMN "energyResetDate";
UPDATE "User" SET "energy" = 10 WHERE "energy" > 10;
ALTER TABLE "User" ALTER COLUMN "energy" SET DEFAULT 10;
