import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrashType, TRASH_MODELS } from "@/lib/soft-delete";
import { revalidateTag } from "next/cache";

export async function POST(
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
        await prisma.customer.update({ where: { id }, data: { deletedAt: null } });
        break;

      case "transaksi":
        await prisma.transaction.update({ where: { id }, data: { deletedAt: null } });
        break;

      case "produk":
        await prisma.$transaction([
          prisma.product.update({ where: { id }, data: { deletedAt: null } }),
          prisma.productVariant.updateMany({
            where: { productId: id, deletedCascade: true },
            data: { deletedAt: null, deletedCascade: false },
          }),
        ]);
        break;

      case "varian":
        await prisma.productVariant.update({ where: { id }, data: { deletedAt: null } });
        break;

      case "pengguna":
        await prisma.user.update({ where: { id }, data: { deletedAt: null } });
        break;

      case "kategori":
        await prisma.category.update({ where: { id }, data: { deletedAt: null } });
        revalidateTag("kategori", {});
        break;

      case "sub-kategori":
        await prisma.subCategory.update({ where: { id }, data: { deletedAt: null } });
        revalidateTag("sub-kategori", {});
        revalidateTag("kategori", {});
        break;

      case "satuan":
        await prisma.unit.update({ where: { id }, data: { deletedAt: null } });
        revalidateTag("satuan", {});
        break;

      case "warna":
        await prisma.color.update({ where: { id }, data: { deletedAt: null } });
        revalidateTag("warna", {});
        break;

      case "ukuran":
        await prisma.size.update({ where: { id }, data: { deletedAt: null } });
        revalidateTag("ukuran", {});
        break;

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
