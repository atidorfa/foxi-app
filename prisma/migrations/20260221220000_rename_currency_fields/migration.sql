-- Rename essencia → gold
ALTER TABLE "User" RENAME COLUMN "essencia" TO "gold";

-- Rename therianCoin → essence
ALTER TABLE "User" RENAME COLUMN "therianCoin" TO "essence";
