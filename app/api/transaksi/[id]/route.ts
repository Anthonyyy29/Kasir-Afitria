import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      customer: true,
      kasir: { select: { name: true } },
      items: { include: { productVariant: { include: { product: true, color: true, size: true } } } },
    },
  });

  if (!transaction) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(transaction);
}
