import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;

  const original = await prisma.product.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.product.create({
    data: {
      name: `${original.name} (Salinan)`,
      description: original.description,
      unitId: original.unitId,
      categoryId: original.categoryId,
      subCategoryId: original.subCategoryId,
      lowStockThreshold: original.lowStockThreshold,
      variants: {
        create: original.variants.map((v) => ({
          colorId: v.colorId,
          sizeId: v.sizeId,
          basePrice: v.basePrice,
          stock: 0,
          sku: v.sku ? `${v.sku}-COPY` : null,
        })),
      },
    },
  });

  return NextResponse.json(copy, { status: 201 });
}
