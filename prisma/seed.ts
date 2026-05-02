import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const kasirPassword = await bcrypt.hash("kasir123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@kasir.com" },
    update: {},
    create: { name: "Admin", email: "admin@kasir.com", password: adminPassword, role: "ADMIN" },
  });

  const kasir = await prisma.user.upsert({
    where: { email: "kasir@kasir.com" },
    update: {},
    create: { name: "Kasir 1", email: "kasir@kasir.com", password: kasirPassword, role: "KASIR" },
  });

  console.log("✓ Users:", admin.email, kasir.email);

  // Satuan
  const units = await Promise.all([
    prisma.unit.upsert({ where: { name: "Pcs" }, update: {}, create: { name: "Pcs" } }),
    prisma.unit.upsert({ where: { name: "Kg" }, update: {}, create: { name: "Kg" } }),
    prisma.unit.upsert({ where: { name: "Lusin" }, update: {}, create: { name: "Lusin" } }),
    prisma.unit.upsert({ where: { name: "Box" }, update: {}, create: { name: "Box" } }),
  ]);
  console.log("✓ Satuan:", units.map((u) => u.name).join(", "));

  // Kategori
  const kategoriPakaian = await prisma.category.upsert({ where: { name: "Pakaian" }, update: {}, create: { name: "Pakaian" } });
  const kategoriMinuman = await prisma.category.upsert({ where: { name: "Minuman" }, update: {}, create: { name: "Minuman" } });

  // Sub Kategori
  const subAtasan = await prisma.subCategory.upsert({ where: { name_categoryId: { name: "Atasan", categoryId: kategoriPakaian.id } }, update: {}, create: { name: "Atasan", categoryId: kategoriPakaian.id } });
  const subBawahan = await prisma.subCategory.upsert({ where: { name_categoryId: { name: "Bawahan", categoryId: kategoriPakaian.id } }, update: {}, create: { name: "Bawahan", categoryId: kategoriPakaian.id } });

  console.log("✓ Kategori & Sub Kategori");

  // Warna
  const colors = await Promise.all([
    prisma.color.upsert({ where: { name: "Merah" }, update: {}, create: { name: "Merah", hex: "#EF4444" } }),
    prisma.color.upsert({ where: { name: "Biru" }, update: {}, create: { name: "Biru", hex: "#3B82F6" } }),
    prisma.color.upsert({ where: { name: "Hitam" }, update: {}, create: { name: "Hitam", hex: "#111827" } }),
    prisma.color.upsert({ where: { name: "Putih" }, update: {}, create: { name: "Putih", hex: "#F9FAFB" } }),
  ]);
  console.log("✓ Warna:", colors.map((c) => c.name).join(", "));

  // Ukuran
  const sizes = await Promise.all([
    prisma.size.upsert({ where: { name: "S" }, update: {}, create: { name: "S" } }),
    prisma.size.upsert({ where: { name: "M" }, update: {}, create: { name: "M" } }),
    prisma.size.upsert({ where: { name: "L" }, update: {}, create: { name: "L" } }),
    prisma.size.upsert({ where: { name: "XL" }, update: {}, create: { name: "XL" } }),
  ]);
  console.log("✓ Ukuran:", sizes.map((s) => s.name).join(", "));

  // Produk contoh
  const tshirt = await prisma.product.upsert({
    where: { id: "seed-product-1" },
    update: {},
    create: {
      id: "seed-product-1",
      name: "Kaos Polos",
      description: "Kaos berkualitas tinggi",
      unitId: units[0].id,
      categoryId: kategoriPakaian.id,
      subCategoryId: subAtasan.id,
      lowStockThreshold: 5,
      variants: {
        create: [
          { colorId: colors[0].id, sizeId: sizes[0].id, basePrice: 75000, stock: 20 },
          { colorId: colors[0].id, sizeId: sizes[1].id, basePrice: 75000, stock: 15 },
          { colorId: colors[1].id, sizeId: sizes[1].id, basePrice: 75000, stock: 10 },
          { colorId: colors[2].id, sizeId: sizes[2].id, basePrice: 75000, stock: 3 },
        ],
      },
    },
  });
  console.log("✓ Produk:", tshirt.name);

  // Pelanggan contoh
  const customer1 = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: { id: "seed-customer-1", name: "Budi Santoso", phone: "081234567890", address: "Jl. Merdeka No. 1" },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: "seed-customer-2" },
    update: {},
    create: { id: "seed-customer-2", name: "Siti Rahayu", phone: "082345678901", email: "siti@gmail.com" },
  });

  console.log("✓ Pelanggan:", customer1.name, customer2.name);
  console.log("\n✅ Seeding selesai!");
  console.log("\nAkun login:");
  console.log("  Admin  : admin@kasir.com / admin123");
  console.log("  Kasir  : kasir@kasir.com / kasir123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
