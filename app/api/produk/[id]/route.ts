import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        unit: true,
        category: true,
        subCategory: true,
        variants: { include: { color: true, size: true, customerPrices: { include: { customer: true } } } },
      },
    });

    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { name, description, unitId, categoryId, subCategoryId, lowStockThreshold, variants } = body;

  type VariantInput = { colorId?: string; sizeId?: string; basePrice: number; stock: number; sku?: string };

  try {
    const product = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: { name, description, unitId, categoryId, subCategoryId: subCategoryId || null, lowStockThreshold },
      });

      if (Array.isArray(variants)) {
        const existingVariants = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true, colorId: true, sizeId: true, _count: { select: { transactionItems: true } } },
        });

        const existingMap = new Map(
          existingVariants.map((ev) => [`${ev.colorId ?? ""}|${ev.sizeId ?? ""}`, ev])
        );
        const newKeys = new Set(variants.map((v: VariantInput) => `${v.colorId || ""}|${v.sizeId || ""}`));

        for (const ev of existingVariants) {
          const key = `${ev.colorId ?? ""}|${ev.sizeId ?? ""}`;
          if (!newKeys.has(key) && ev._count.transactionItems === 0) {
            await tx.productVariant.delete({ where: { id: ev.id } });
          }
        }

        for (const v of variants as VariantInput[]) {
          const key = `${v.colorId || ""}|${v.sizeId || ""}`;
          const existing = existingMap.get(key);
          if (existing) {
            await tx.productVariant.update({
              where: { id: existing.id },
              data: { basePrice: v.basePrice, stock: v.stock ?? 0, sku: v.sku || null },
            });
          } else {
            await tx.productVariant.create({
              data: {
                productId: id,
                colorId: v.colorId || null,
                sizeId: v.sizeId || null,
                basePrice: v.basePrice,
                stock: v.stock ?? 0,
                sku: v.sku || null,
              },
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id: updated.id },
        include: { unit: true, category: true, subCategory: true, variants: { include: { color: true, size: true } } },
      });
    }, { maxWait: 10000, timeout: 30000 });

    return NextResponse.json(product);
  } catch (err) {
    console.error("[PUT /api/produk/[id]] error:", err);
    return NextResponse.json({ error: "Gagal menyimpan produk", detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
