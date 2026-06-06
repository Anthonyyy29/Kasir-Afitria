-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "shippingCost" DECIMAL(15,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CartSession" ADD COLUMN "shippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
