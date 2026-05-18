import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrashType, TRASH_MODELS } from "@/lib/soft-delete";

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { type, id } = await params;

    if (!TRASH_MODELS[type as TrashType])
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    switch (type as TrashType) {
      case "pelanggan":
        // FK Transaction.customerId → SetNull, FK CustomerPrice.customerId → CASCADE
        await prisma.customer.delete({ where: { id } });
        break;

      case "transaksi":
        // TransactionItem CASCADE delete
        await prisma.transaction.delete({ where: { id } });
        break;

      case "produk": {
        try {
          await prisma.$transaction(async (tx) => {
            const variantIds = await tx.productVariant.findMany({
              where: { productId: id },
              select: { id: true },
            });
            const txItemCount = await tx.transactionItem.count({
              where: { productVariantId: { in: variantIds.map((v) => v.id) } },
            });
            if (txItemCount > 0)
              throw Object.assign(new Error("FK"), { code: "FK_VIOLATION", count: txItemCount });
            // CASCADE ke ProductVariant → CASCADE ke CustomerPrice
            await tx.product.delete({ where: { id } });
          });
        } catch (err: unknown) {
          if (err instanceof Error && (err as { code?: string }).code === "FK_VIOLATION") {
            return NextResponse.json(
              { error: "Produk ini memiliki riwayat transaksi dan tidak bisa dihapus permanen" },
              { status: 409 }
            );
          }
          throw err;
        }
        break;
      }

      case "varian": {
        try {
          await prisma.$transaction(async (tx) => {
            const txCount = await tx.transactionItem.count({
              where: { productVariantId: id },
            });
            if (txCount > 0)
              throw Object.assign(new Error("FK"), { code: "FK_VIOLATION" });
            // CASCADE ke CustomerPrice
            await tx.productVariant.delete({ where: { id } });
          });
        } catch (err: unknown) {
          if (err instanceof Error && (err as { code?: string }).code === "FK_VIOLATION") {
            return NextResponse.json(
              { error: "Varian ini memiliki riwayat transaksi dan tidak bisa dihapus permanen" },
              { status: 409 }
            );
          }
          throw err;
        }
        break;
      }

      case "pengguna": {
        const kasirTxCount = await prisma.transaction.count({ where: { kasirId: id } });
        if (kasirTxCount > 0)
          return NextResponse.json(
            {
              error: "Pengguna ini memiliki histori transaksi dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        await prisma.user.delete({ where: { id } });
        break;
      }

      case "kategori": {
        const katProdCount = await prisma.product.count({ where: { categoryId: id, deletedAt: null } });
        if (katProdCount > 0)
          return NextResponse.json(
            {
              error:
                "Kategori ini masih direferensi oleh " +
                katProdCount +
                " produk dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        // CASCADE ke SubCategory
        await prisma.category.delete({ where: { id } });
        revalidateTag("kategori", {});
        break;
      }

      case "sub-kategori": {
        const subkatProdCount = await prisma.product.count({ where: { subCategoryId: id, deletedAt: null } });
        if (subkatProdCount > 0)
          return NextResponse.json(
            {
              error:
                "Sub-kategori ini masih direferensi oleh " +
                subkatProdCount +
                " produk dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        await prisma.subCategory.delete({ where: { id } });
        revalidateTag("sub-kategori", {});
        revalidateTag("kategori", {});
        break;
      }

      case "satuan": {
        const satuanProdCount = await prisma.product.count({ where: { unitId: id, deletedAt: null } });
        if (satuanProdCount > 0)
          return NextResponse.json(
            {
              error:
                "Satuan ini masih direferensi oleh " +
                satuanProdCount +
                " produk dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        await prisma.unit.delete({ where: { id } });
        revalidateTag("satuan", {});
        break;
      }

      case "warna": {
        const warnaProdCount = await prisma.productVariant.count({ where: { colorId: id, deletedAt: null } });
        if (warnaProdCount > 0)
          return NextResponse.json(
            {
              error:
                "Warna ini masih direferensi oleh " +
                warnaProdCount +
                " varian produk dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        await prisma.color.delete({ where: { id } });
        revalidateTag("warna", {});
        break;
      }

      case "ukuran": {
        const ukuranProdCount = await prisma.productVariant.count({ where: { sizeId: id, deletedAt: null } });
        if (ukuranProdCount > 0)
          return NextResponse.json(
            {
              error:
                "Ukuran ini masih direferensi oleh " +
                ukuranProdCount +
                " varian produk dan tidak bisa dihapus permanen",
            },
            { status: 409 }
          );
        await prisma.size.delete({ where: { id } });
        revalidateTag("ukuran", {});
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
