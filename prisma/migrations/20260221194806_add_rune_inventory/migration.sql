-- CreateTable
CREATE TABLE "RuneInventory" (
    "id" TEXT NOT NULL,
    "therianId" TEXT NOT NULL,
    "runeId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuneInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RuneInventory_therianId_idx" ON "RuneInventory"("therianId");

-- AddForeignKey
ALTER TABLE "RuneInventory" ADD CONSTRAINT "RuneInventory_therianId_fkey" FOREIGN KEY ("therianId") REFERENCES "Therian"("id") ON DELETE CASCADE ON UPDATE CASCADE;
