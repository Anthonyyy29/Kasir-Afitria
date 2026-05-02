import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { colorId, sizeId, basePrice, stock, sku } = body;

  const variant = await prisma.productVariant.update({
    where: { id },
    data: { colorId: colorId || null, sizeId: sizeId || null, basePrice, stock, sku: sku || null },
    include: { color: true, size: true },
  });

  return NextResponse.json(variant);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.productVariant.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
