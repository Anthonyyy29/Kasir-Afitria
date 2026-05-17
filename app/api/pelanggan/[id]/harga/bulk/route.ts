import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Expects: [{ productVariantId, price }] — price null/0 = hapus harga khusus
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id: customerId } = await params;
    const items: { productVariantId: string; price: number | null }[] = await req.json();

    if (!Array.isArray(items)) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

    const toUpsert = items.filter(i => i.price && i.price > 0);
    const toDelete = items.filter(i => !i.price || i.price <= 0).map(i => i.productVariantId);

    await prisma.$transaction([
      ...toUpsert.map(i =>
        prisma.customerPrice.upsert({
          where: { customerId_productVariantId: { customerId, productVariantId: i.productVariantId } },
          update: { price: i.price! },
          create: { customerId, productVariantId: i.productVariantId, price: i.price! },
        })
      ),
      ...(toDelete.length > 0
        ? [prisma.customerPrice.deleteMany({
            where: { customerId, productVariantId: { in: toDelete } },
          })]
        : []),
    ]);

    return NextResponse.json({ upserted: toUpsert.length, deleted: toDelete.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
