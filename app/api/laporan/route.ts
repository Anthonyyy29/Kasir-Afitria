import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = new Date(searchParams.get("start") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    const endDate = new Date(searchParams.get("end") ?? new Date().toISOString());

    const transactions = await prisma.transaction.findMany({
      where: { deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
      include: {
        customer: { select: { name: true } },
        kasir: { select: { name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalRevenue = transactions.reduce((s, t) => s + Number(t.totalAmount), 0);
    const totalDiscount = transactions.reduce((s, t) => s + Number(t.discountAmount), 0);

    // Daily sales
    const dailyMap: Record<string, { total: number; count: number }> = {};
    for (const t of transactions) {
      const date = t.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[date]) dailyMap[date] = { total: 0, count: 0 };
      dailyMap[date].total += Number(t.totalAmount);
      dailyMap[date].count += 1;
    }
    const dailySales = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top products
    const productMap: Record<string, { productName: string; totalQty: number; totalRevenue: number }> = {};
    for (const t of transactions) {
      for (const item of t.items) {
        const key = item.productName;
        if (!productMap[key]) productMap[key] = { productName: key, totalQty: 0, totalRevenue: 0 };
        productMap[key].totalQty += item.quantity;
        productMap[key].totalRevenue += Number(item.subtotal);
      }
    }
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    return NextResponse.json({
      summary: { totalRevenue, totalDiscount, totalTransactions: transactions.length },
      dailySales,
      topProducts,
      transactions,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
