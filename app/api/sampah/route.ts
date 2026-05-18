import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TrashType, TRASH_MODELS } from "@/lib/soft-delete";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const type = req.nextUrl.searchParams.get("type") as TrashType;
    if (!type || !TRASH_MODELS[type])
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    const where = { deletedAt: { not: null } };
    const orderBy = { deletedAt: "desc" as const };

    switch (type) {
      case "pelanggan": {
        const rows = await prisma.customer.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: r.phone ?? "-",
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "transaksi": {
        const rows = await prisma.transaction.findMany({
          where,
          orderBy,
          include: { customer: true },
        });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.transactionNumber,
            info:
              "Rp " +
              Number(r.totalAmount).toLocaleString("id-ID") +
              (r.customer?.name ? " — " + r.customer.name : ""),
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "produk": {
        const rows = await prisma.product.findMany({
          where,
          orderBy,
          include: { _count: { select: { variants: true } } },
        });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: r._count.variants + " varian",
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "varian": {
        const rows = await prisma.productVariant.findMany({
          where,
          orderBy,
          include: { product: true, color: true, size: true },
        });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label:
              r.product.name +
              (r.color ? " — " + r.color.name : "") +
              (r.size ? " — " + r.size.name : ""),
            info: null,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "pengguna": {
        const rows = await prisma.user.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: r.email,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "kategori": {
        const rows = await prisma.category.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: null,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "sub-kategori": {
        const rows = await prisma.subCategory.findMany({
          where,
          orderBy,
          include: { category: true },
        });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: r.category.name,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "satuan": {
        const rows = await prisma.unit.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: null,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "warna": {
        const rows = await prisma.color.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: r.hex ?? null,
            deletedAt: r.deletedAt,
          }))
        );
      }

      case "ukuran": {
        const rows = await prisma.size.findMany({ where, orderBy });
        return NextResponse.json(
          rows.map((r) => ({
            id: r.id,
            label: r.name,
            info: null,
            deletedAt: r.deletedAt,
          }))
        );
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
