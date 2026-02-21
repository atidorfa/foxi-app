-- AlterTable
ALTER TABLE "Therian" ADD COLUMN     "accessories" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "essencia" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "therianCoin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "therianSlots" INTEGER NOT NULL DEFAULT 1;
