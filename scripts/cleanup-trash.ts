import { PrismaClient } from "@prisma/client";
import { cutoffDate } from "../lib/soft-delete";

const prisma = new PrismaClient();

async function main() {
  const cutoff = cutoffDate();
  const stats: Record<string, number> = {};
  const skipped: string[] = [];

  // 1. Transaksi — langsung delete (TransactionItem CASCADE)
  const oldTx = await prisma.transaction.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const tx of oldTx) {
    try {
      await prisma.transaction.delete({ where: { id: tx.id } });
      stats.transaksi = (stats.transaksi ?? 0) + 1;
    } catch {
      skipped.push(`transaksi:${tx.id}`);
    }
  }

  // 2. Varian — cek TransactionItem, skip jika ada
  const oldVariants = await prisma.productVariant.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const v of oldVariants) {
    try {
      let shouldSkip = false;
      await prisma.$transaction(async (tx) => {
        const txCount = await tx.transactionItem.count({ where: { productVariantId: v.id } });
        if (txCount > 0) {
          shouldSkip = true;
          return;
        }
        await tx.productVariant.delete({ where: { id: v.id } });
      });
      if (shouldSkip) {
        skipped.push(`varian:${v.id}`);
        continue;
      }
      stats.varian = (stats.varian ?? 0) + 1;
    } catch {
      skipped.push(`varian:${v.id}`);
    }
  }

  // 3. Produk — cek via varian, skip jika ada TransactionItem
  const oldProducts = await prisma.product.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const p of oldProducts) {
    try {
      let shouldSkip = false;
      await prisma.$transaction(async (tx) => {
        const variantIds = await tx.productVariant.findMany(
          { where: { productId: p.id }, select: { id: true } }
        );
        const txCount = await tx.transactionItem.count({
          where: { productVariantId: { in: variantIds.map((v) => v.id) } },
        });
        if (txCount > 0) {
          shouldSkip = true;
          return;
        }
        await tx.product.delete({ where: { id: p.id } });
      });
      if (shouldSkip) {
        skipped.push(`produk:${p.id}`);
        continue;
      }
      stats.produk = (stats.produk ?? 0) + 1;
    } catch {
      skipped.push(`produk:${p.id}`);
    }
  }

  // 4. Pelanggan — FK SetNull otomatis, CustomerPrice CASCADE
  const oldCustomers = await prisma.customer.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const c of oldCustomers) {
    try {
      await prisma.customer.delete({ where: { id: c.id } });
      stats.pelanggan = (stats.pelanggan ?? 0) + 1;
    } catch {
      skipped.push(`pelanggan:${c.id}`);
    }
  }

  // 5. Pengguna — skip jika punya transaksi
  const oldUsers = await prisma.user.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true },
  });
  for (const u of oldUsers) {
    try {
      let shouldSkip = false;
      await prisma.$transaction(async (tx) => {
        const txCount = await tx.transaction.count({ where: { kasirId: u.id } });
        if (txCount > 0) {
          shouldSkip = true;
          return;
        }
        await tx.user.delete({ where: { id: u.id } });
      });
      if (shouldSkip) {
        skipped.push(`pengguna:${u.id}`);
        continue;
      }
      stats.pengguna = (stats.pengguna ?? 0) + 1;
    } catch {
      skipped.push(`pengguna:${u.id}`);
    }
  }

  // 6. Master data — skip jika masih ada produk/varian aktif
  const masterCleanups: Array<{
    entity: string;
    findMany: () => Promise<Array<{ id: string }>>;
    checkRef: (id: string) => Promise<number>;
    deleteFn: (id: string) => Promise<unknown>;
  }> = [
    {
      entity: "kategori",
      findMany: () =>
        prisma.category.findMany({
          where: { deletedAt: { not: null, lt: cutoff } },
          select: { id: true },
        }),
      checkRef: (id) =>
        prisma.product.count({
          where: { categoryId: id, deletedAt: null },
        }),
      deleteFn: (id) => prisma.category.delete({ where: { id } }),
    },
    {
      entity: "sub-kategori",
      findMany: () =>
        prisma.subCategory.findMany({
          where: { deletedAt: { not: null, lt: cutoff } },
          select: { id: true },
        }),
      checkRef: (id) =>
        prisma.product.count({
          where: { subCategoryId: id, deletedAt: null },
        }),
      deleteFn: (id) => prisma.subCategory.delete({ where: { id } }),
    },
    {
      entity: "satuan",
      findMany: () =>
        prisma.unit.findMany({
          where: { deletedAt: { not: null, lt: cutoff } },
          select: { id: true },
        }),
      checkRef: (id) =>
        prisma.product.count({
          where: { unitId: id, deletedAt: null },
        }),
      deleteFn: (id) => prisma.unit.delete({ where: { id } }),
    },
    {
      entity: "warna",
      findMany: () =>
        prisma.color.findMany({
          where: { deletedAt: { not: null, lt: cutoff } },
          select: { id: true },
        }),
      checkRef: (id) =>
        prisma.productVariant.count({
          where: { colorId: id, deletedAt: null },
        }),
      deleteFn: (id) => prisma.color.delete({ where: { id } }),
    },
    {
      entity: "ukuran",
      findMany: () =>
        prisma.size.findMany({
          where: { deletedAt: { not: null, lt: cutoff } },
          select: { id: true },
        }),
      checkRef: (id) =>
        prisma.productVariant.count({
          where: { sizeId: id, deletedAt: null },
        }),
      deleteFn: (id) => prisma.size.delete({ where: { id } }),
    },
  ];

  for (const { entity, findMany, checkRef, deleteFn } of masterCleanups) {
    const items = await findMany();
    for (const item of items) {
      try {
        const refCount = await checkRef(item.id);
        if (refCount > 0) {
          skipped.push(`${entity}:${item.id}`);
          continue;
        }
        await deleteFn(item.id);
        stats[entity] = (stats[entity] ?? 0) + 1;
      } catch {
        skipped.push(`${entity}:${item.id}`);
      }
    }
  }

  const result = {
    at: new Date().toISOString(),
    cutoff: cutoff.toISOString(),
    deleted: stats,
    skipped: skipped.length,
    skippedIds: skipped,
  };
  console.log(JSON.stringify(result, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
