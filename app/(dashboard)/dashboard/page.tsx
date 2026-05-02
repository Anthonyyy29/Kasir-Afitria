import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { ShoppingCart, Users, TrendingUp, AlertTriangle } from "lucide-react";
import { DashboardChart } from "@/components/dashboard/dashboard-chart";

async function getDailySales() {
  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    select: { totalAmount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const map: Record<string, number> = {};
  for (const t of transactions) {
    const date = t.createdAt.toISOString().slice(0, 10);
    map[date] = (map[date] ?? 0) + Number(t.totalAmount);
  }
  return Object.entries(map).map(([date, total]) => ({ date, total }));
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [todayTransactions, totalCustomers, variants, dailySales] = await Promise.all([
    prisma.transaction.findMany({
      where: { createdAt: { gte: today, lt: tomorrow } },
      select: { totalAmount: true },
    }),
    isAdmin ? prisma.customer.count() : Promise.resolve(0),
    isAdmin
      ? prisma.productVariant.findMany({ select: { stock: true, product: { select: { lowStockThreshold: true } } } })
      : Promise.resolve([]),
    getDailySales(),
  ]);

  const todayRevenue = todayTransactions.reduce((sum, t) => sum + Number(t.totalAmount), 0);
  const lowStockCount = variants.filter((v) => v.stock <= v.product.lowStockThreshold).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Selamat datang, {session?.user?.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendapatan Hari Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{formatRupiah(todayRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">{todayTransactions.length} transaksi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Transaksi Hari Ini</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{todayTransactions.length}</p>
            <p className="text-xs text-gray-500 mt-1">transaksi selesai</p>
          </CardContent>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Pelanggan</CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
                <p className="text-xs text-gray-500 mt-1">pelanggan terdaftar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Stok Menipis</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
                <p className="text-xs text-gray-500 mt-1">varian perlu restock</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isAdmin && dailySales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Penjualan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardChart data={dailySales} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
