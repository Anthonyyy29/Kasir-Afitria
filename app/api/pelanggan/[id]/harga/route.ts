import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();
  const { productVariantId, price } = body;

  const customerPrice = await prisma.customerPrice.upsert({
    where: { customerId_productVariantId: { customerId: id, productVariantId } },
    update: { price },
    create: { customerId: id, productVariantId, price },
    include: { productVariant: { include: { product: true, color: true, size: true } } },
  });

  return NextResponse.json(customerPrice);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const productVariantId = searchParams.get("variantId");

  if (!productVariantId) return NextResponse.json({ error: "variantId required" }, { status: 400 });

  await prisma.customerPrice.delete({
    where: { customerId_productVariantId: { customerId: id, productVariantId } },
  });

  return NextResponse.json({ success: true });
}
