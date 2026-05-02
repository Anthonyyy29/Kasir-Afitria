import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    include: {
      unit: true,
      category: true,
      subCategory: true,
      variants: {
        include: { color: true, size: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, unitId, categoryId, subCategoryId, lowStockThreshold, variants } = body;

  const product = await prisma.product.create({
    data: {
      name,
      description,
      unitId,
      categoryId,
      subCategoryId: subCategoryId || null,
      lowStockThreshold: lowStockThreshold ?? 5,
      variants: {
        create: variants?.map((v: { colorId?: string; sizeId?: string; basePrice: number; stock: number; sku?: string }) => ({
          colorId: v.colorId || null,
          sizeId: v.sizeId || null,
          basePrice: v.basePrice,
          stock: v.stock,
          sku: v.sku || null,
        })) ?? [],
      },
    },
    include: { variants: { include: { color: true, size: true } }, unit: true, category: true, subCategory: true },
  });

  return NextResponse.json(product);
}
