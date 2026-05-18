import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTransactionNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

    if (startDate && isNaN(new Date(startDate).getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    if (endDate && isNaN(new Date(endDate).getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const where = {
      deletedAt: null,
      ...(startDate && endDate
        ? { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
        : {}),
      ...(session.user.role === "KASIR" ? { kasirId: session.user.id } : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        customer: true,
        kasir: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { customerId, items, discountAmount, discountReason, paymentAmount } = body;

    const subtotal = items.reduce(
      (sum: number, item: { priceAtSale: number; quantity: number }) =>
        sum + item.priceAtSale * item.quantity,
      0
    );
    const totalAmount = subtotal - (discountAmount ?? 0);
    const changeAmount = paymentAmount - totalAmount;

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          transactionNumber: generateTransactionNumber(),
          kasirId: session.user.id,
          customerId,
          subtotal,
          discountAmount: discountAmount ?? 0,
          discountReason: discountReason || null,
          totalAmount,
          paymentAmount,
          changeAmount,
          items: {
            create: items.map((item: {
              productVariantId: string;
              productName: string;
              variantInfo: string;
              quantity: number;
              priceAtSale: number;
            }) => ({
              productVariantId: item.productVariantId,
              productName: item.productName,
              variantInfo: item.variantInfo,
              quantity: item.quantity,
              priceAtSale: item.priceAtSale,
              subtotal: item.priceAtSale * item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          kasir: { select: { name: true } },
          items: true,
        },
      });

      // Kurangi stok per varian
      for (const item of items) {
        await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return created;
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
