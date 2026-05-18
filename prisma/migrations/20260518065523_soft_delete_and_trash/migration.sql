-- AlterTable: Add deletedAt to User, drop old unique index
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Customer
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Unit, drop old unique index
ALTER TABLE "Unit" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Category, drop old unique index
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to SubCategory, drop old unique index
ALTER TABLE "SubCategory" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Color, drop old unique index
ALTER TABLE "Color" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Size, drop old unique index
ALTER TABLE "Size" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt to Product
ALTER TABLE "Product" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable: Add deletedAt and deletedCascade to ProductVariant, drop old unique indexes
ALTER TABLE "ProductVariant" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ProductVariant" ADD COLUMN "deletedCascade" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Add deletedAt to Transaction, make customerId nullable, update FK
ALTER TABLE "Transaction" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Transaction" ALTER COLUMN "customerId" DROP NOT NULL;

-- Drop old full unique indexes (replacing with partial unique indexes below)
DROP INDEX "User_email_key";
DROP INDEX "Unit_name_key";
DROP INDEX "Category_name_key";
DROP INDEX "SubCategory_name_categoryId_key";
DROP INDEX "Color_name_key";
DROP INDEX "Size_name_key";
DROP INDEX "ProductVariant_sku_key";
DROP INDEX "ProductVariant_productId_colorId_sizeId_key";

-- Drop old FK for Transaction.customerId (Restrict), replace with SetNull
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_customerId_fkey";
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: deletedAt indexes for performance
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");
CREATE INDEX "Unit_deletedAt_idx" ON "Unit"("deletedAt");
CREATE INDEX "Category_deletedAt_idx" ON "Category"("deletedAt");
CREATE INDEX "SubCategory_deletedAt_idx" ON "SubCategory"("deletedAt");
CREATE INDEX "Color_deletedAt_idx" ON "Color"("deletedAt");
CREATE INDEX "Size_deletedAt_idx" ON "Size"("deletedAt");
CREATE INDEX "Product_deletedAt_idx" ON "Product"("deletedAt");
CREATE INDEX "ProductVariant_deletedAt_idx" ON "ProductVariant"("deletedAt");
CREATE INDEX "Transaction_deletedAt_idx" ON "Transaction"("deletedAt");

-- Partial unique indexes (aktif hanya ketika tidak soft-deleted)
CREATE UNIQUE INDEX "User_email_active_key" ON "User"("email") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Unit_name_active_key" ON "Unit"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Category_name_active_key" ON "Category"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Color_name_active_key" ON "Color"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "Size_name_active_key" ON "Size"("name") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "ProductVariant_sku_active_key" ON "ProductVariant"("sku") WHERE "deletedAt" IS NULL AND "sku" IS NOT NULL;
CREATE UNIQUE INDEX "SubCategory_name_categoryId_active_key" ON "SubCategory"("name","categoryId") WHERE "deletedAt" IS NULL;
CREATE UNIQUE INDEX "ProductVariant_product_color_size_active_key" ON "ProductVariant"("productId","colorId","sizeId") WHERE "deletedAt" IS NULL;
