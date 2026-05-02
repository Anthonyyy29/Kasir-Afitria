"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Download, Loader2, TrendingUp, ShoppingCart, Percent, Award } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import * as XLSX from "xlsx";

interface DailySale { date: string; total: number; count: number; }
interface TopProduct { productName: string; totalQty: number; totalRevenue: number; }
interface Transaction { id: string; transactionNumber: string; createdAt: string; customer: { name: string }; kasir: { name: string }; totalAmount: string; discountAmount: string; items: { id: string }[]; }
interface ReportData { summary: { totalRevenue: number; totalDiscount: number; totalTransactions: number }; dailySales: DailySale[]; topProducts: TopProduct[]; transactions: Transaction[]; }

export default function LaporanPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/laporan?start=${startDate}T00:00:00&end=${endDate}T23:59:59`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  function exportExcel() {
    if (!data) return;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Ringkasan
    const summary = [
      ["Laporan Penjualan"],
      ["Periode", `${startDate} s/d ${endDate}`],
      [],
      ["Total Pendapatan", data.summary.totalRevenue],
      ["Total Diskon", data.summary.totalDiscount],
      ["Total Transaksi", data.summary.totalTransactions],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Ringkasan");

    // Sheet 2: Transaksi
    const trxData = [
      ["No Transaksi", "Tanggal", "Pelanggan", "Kasir", "Items", "Diskon", "Total"],
      ...data.transactions.map((t) => [
        t.transactionNumber,
        formatDate(t.createdAt),
        t.customer.name,
        t.kasir.name,
        t.items.length,
        Number(t.discountAmount),
        Number(t.totalAmount),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trxData), "Transaksi");

    // Sheet 3: Penjualan per hari
    const dailyData = [
      ["Tanggal", "Pendapatan", "Jumlah Transaksi"],
      ...data.dailySales.map((d) => [d.date, d.total, d.count]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyData), "Per Hari");

    // Sheet 4: Top Produk
    const topData = [
      ["Produk", "Qty Terjual", "Total Pendapatan"],
      ...data.topProducts.map((p) => [p.productName, p.totalQty, p.totalRevenue]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topData), "Top Produk");

    XLSX.writeFile(wb, `laporan-${startDate}-${endDate}.xlsx`);
  }

  const chartData = data?.dailySales.map((d) => ({
    date: new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    pendapatan: d.total,
    transaksi: d.count,
  })) ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Laporan Penjualan</h1>
          <p className="text-gray-500">Analisis data penjualan</p>
        </div>
        <Button onClick={exportExcel} disabled={!data} className="gap-2">
          <Download className="h-4 w-4" />Export Excel
        </Button>
      </div>

      {/* Filter Tanggal */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Dari Tanggal</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai Tanggal</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tampilkan"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Total Pendapatan</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><p className="text-2xl font-bold">{formatRupiah(data.summary.totalRevenue)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Total Transaksi</CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.summary.totalTransactions}</p>
                <p className="text-xs text-gray-500 mt-1">Rata-rata {data.summary.totalTransactions > 0 ? formatRupiah(data.summary.totalRevenue / data.summary.totalTransactions) : "Rp 0"}/transaksi</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between">
                <CardTitle className="text-sm text-gray-600">Total Diskon</CardTitle>
                <Percent className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatRupiah(data.summary.totalDiscount)}</p>
                <p className="text-xs text-gray-500 mt-1">{data.summary.totalRevenue > 0 ? ((data.summary.totalDiscount / (data.summary.totalRevenue + data.summary.totalDiscount)) * 100).toFixed(1) : 0}% dari gross</p>
              </CardContent>
            </Card>
          </div>

          {/* Chart Pendapatan Harian */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Pendapatan per Hari</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => [formatRupiah(v), "Pendapatan"]} />
                      <Bar dataKey="pendapatan" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Jumlah Transaksi per Hari</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="transaksi" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Top Produk */}
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-base">Top 10 Produk</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Pendapatan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topProducts.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-gray-400 py-6">Tidak ada data</TableCell></TableRow>
                    ) : (
                      data.topProducts.map((p, i) => (
                        <TableRow key={p.productName}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-gray-50 text-gray-400"}`}>{i + 1}</span>
                              <span className="text-sm">{p.productName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{p.totalQty}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRupiah(p.totalRevenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Riwayat Transaksi */}
            <Card>
              <CardHeader><CardTitle className="text-base">Riwayat Transaksi</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No / Tanggal</TableHead>
                        <TableHead>Pelanggan</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.transactions.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center text-gray-400 py-6">Tidak ada transaksi</TableCell></TableRow>
                      ) : (
                        data.transactions.slice(0, 50).map((t) => (
                          <TableRow key={t.id}>
                            <TableCell>
                              <p className="text-xs font-medium">{t.transactionNumber}</p>
                              <p className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleDateString("id-ID")}</p>
                            </TableCell>
                            <TableCell className="text-sm">{t.customer.name}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[10px]">{t.items.length}</Badge></TableCell>
                            <TableCell className="text-right">
                              <p className="text-sm font-medium">{formatRupiah(t.totalAmount)}</p>
                              {Number(t.discountAmount) > 0 && <p className="text-[10px] text-red-500">-{formatRupiah(t.discountAmount)}</p>}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
