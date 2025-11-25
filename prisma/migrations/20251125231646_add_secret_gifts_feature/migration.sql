-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "isSecret" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Registry" ADD COLUMN     "allowSecretGifts" BOOLEAN NOT NULL DEFAULT false;
