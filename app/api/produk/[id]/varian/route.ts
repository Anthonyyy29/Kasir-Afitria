import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id } = await params;
    const body = await req.json();
    const { colorId, sizeId, basePrice, sku } = body;

    const variant = await prisma.productVariant.create({
      data: { productId: id, colorId: colorId || null, sizeId: sizeId || null, basePrice, sku: sku || null },
      include: { color: true, size: true },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
