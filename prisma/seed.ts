import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function findOrCreate<T>(
  find: () => Promise<T | null>,
  create: () => Promise<T>
): Promise<T> {
  return (await find()) ?? (await create());
}

async function main() {
  console.log("Seeding database...");

  // Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const kasirPassword = await bcrypt.hash("kasir123", 10);

  const admin = await findOrCreate(
    () => prisma.user.findFirst({ where: { email: "admin@kasir.com", deletedAt: null } }),
    () => prisma.user.create({ data: { name: "Admin", email: "admin@kasir.com", password: adminPassword, role: "ADMIN" } })
  );

  const kasir = await findOrCreate(
    () => prisma.user.findFirst({ where: { email: "kasir@kasir.com", deletedAt: null } }),
    () => prisma.user.create({ data: { name: "Kasir 1", email: "kasir@kasir.com", password: kasirPassword, role: "KASIR" } })
  );

  console.log("✓ Users:", admin.email, kasir.email);

  // Satuan
  const unitNames = ["Pcs", "Kg", "Lusin", "Box"];
  const units = await Promise.all(
    unitNames.map((name) =>
      findOrCreate(
        () => prisma.unit.findFirst({ where: { name, deletedAt: null } }),
        () => prisma.unit.create({ data: { name } })
      )
    )
  );
  console.log("✓ Satuan:", units.map((u) => u.name).join(", "));

  // Kategori
  const kategoriPakaian = await findOrCreate(
    () => prisma.category.findFirst({ where: { name: "Pakaian", deletedAt: null } }),
    () => prisma.category.create({ data: { name: "Pakaian" } })
  );
  const kategoriMinuman = await findOrCreate(
    () => prisma.category.findFirst({ where: { name: "Minuman", deletedAt: null } }),
    () => prisma.category.create({ data: { name: "Minuman" } })
  );

  // Sub Kategori
  const subAtasan = await findOrCreate(
    () => prisma.subCategory.findFirst({ where: { name: "Atasan", categoryId: kategoriPakaian.id, deletedAt: null } }),
    () => prisma.subCategory.create({ data: { name: "Atasan", categoryId: kategoriPakaian.id } })
  );
  const subBawahan = await findOrCreate(
    () => prisma.subCategory.findFirst({ where: { name: "Bawahan", categoryId: kategoriPakaian.id, deletedAt: null } }),
    () => prisma.subCategory.create({ data: { name: "Bawahan", categoryId: kategoriPakaian.id } })
  );

  console.log("✓ Kategori & Sub Kategori");

  // Warna
  const colorData = [
    { name: "Merah", hex: "#EF4444" },
    { name: "Biru", hex: "#3B82F6" },
    { name: "Hitam", hex: "#111827" },
    { name: "Putih", hex: "#F9FAFB" },
  ];
  const colors = await Promise.all(
    colorData.map(({ name, hex }) =>
      findOrCreate(
        () => prisma.color.findFirst({ where: { name, deletedAt: null } }),
        () => prisma.color.create({ data: { name, hex } })
      )
    )
  );
  console.log("✓ Warna:", colors.map((c) => c.name).join(", "));

  // Ukuran
  const sizeNames = ["S", "M", "L", "XL"];
  const sizes = await Promise.all(
    sizeNames.map((name) =>
      findOrCreate(
        () => prisma.size.findFirst({ where: { name, deletedAt: null } }),
        () => prisma.size.create({ data: { name } })
      )
    )
  );
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

  void kategoriMinuman;
  void subBawahan;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
