# Riwayat Pesanan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah halaman `/riwayat` di sidebar untuk melihat semua transaksi selesai, dengan search, filter tanggal, modal detail item, dan cetak ulang nota/struk/surat jalan.

**Architecture:** Extend GET `/api/transaksi` dengan param `search`, tambah menu item di sidebar, buat halaman baru `app/(dashboard)/riwayat/page.tsx`. Semua fungsi PDF sudah ada di `lib/pdf.ts` — tinggal disambungkan.

**Tech Stack:** Next.js App Router, Prisma, shadcn/ui (Dialog, Table, Card, Badge, Button, Input), jsPDF via `lib/pdf.ts`, Tailwind CSS, TypeScript

---

### Task 1: Extend GET `/api/transaksi` dengan filter `search`

**Files:**
- Modify: `app/api/transaksi/route.ts`

- [ ] **Step 1: Tambah parsing `search` param dan update `where` clause**

Buka `app/api/transaksi/route.ts`. Di dalam fungsi `GET`, setelah baris `const limit = ...`, tambah:

```typescript
const search = searchParams.get("search")?.trim() ?? "";
```

Lalu ganti blok `where`:

```typescript
const where = {
  deletedAt: null,
  ...(startDate && endDate
    ? { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }
    : {}),
  ...(session.user.role === "KASIR" ? { kasirId: session.user.id } : {}),
  ...(search
    ? {
        OR: [
          { transactionNumber: { contains: search, mode: "insensitive" as const } },
          { customer: { name: { contains: search, mode: "insensitive" as const } } },
        ],
      }
    : {}),
};
```

- [ ] **Step 2: Verifikasi type-check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
cd /opt/kasir && git add app/api/transaksi/route.ts && git commit -m "feat: add search filter to GET /api/transaksi"
```

---

### Task 2: Tambah menu "Riwayat Pesanan" di sidebar

**Files:**
- Modify: `components/layout/sidebar.tsx`

- [ ] **Step 1: Tambah import icon `History`**

Di `components/layout/sidebar.tsx`, baris import lucide-react:

```typescript
import {
  ShoppingCart, LayoutDashboard, Package, Users, BarChart3,
  Settings, LogOut, Tag, Layers, Ruler, Palette, ChevronDown, ChevronRight, Bell, X, Trash2, History,
} from "lucide-react";
```

- [ ] **Step 2: Tambah nav item di array `navItems`**

Tambahkan setelah item `{ label: "Kasir", ... }`:

```typescript
{ label: "Riwayat Pesanan", href: "/riwayat", icon: History },
```

Hasil array menjadi:

```typescript
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kasir", href: "/kasir", icon: ShoppingCart },
  { label: "Riwayat Pesanan", href: "/riwayat", icon: History },
  {
    label: "Produk",
    icon: Package,
    adminOnly: true,
    children: [
      // ...existing children unchanged
    ],
  },
  { label: "Pelanggan", href: "/pelanggan", icon: Users, adminOnly: true },
  { label: "Laporan", href: "/laporan", icon: BarChart3, adminOnly: true },
  { label: "Pengguna", href: "/pengguna", icon: Settings, adminOnly: true },
  { label: "Sampah", href: "/sampah", icon: Trash2, adminOnly: true },
];
```

Perhatikan: **tidak ada `adminOnly`** — kasir juga bisa akses (namun API sudah membatasi kasir hanya lihat transaksinya sendiri).

- [ ] **Step 3: Verifikasi type-check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
cd /opt/kasir && git add components/layout/sidebar.tsx && git commit -m "feat: add Riwayat Pesanan menu to sidebar"
```

---

### Task 3: Buat halaman `/riwayat`

**Files:**
- Create: `app/(dashboard)/riwayat/page.tsx`

- [ ] **Step 1: Buat file page dengan tipe data dan state awal**

Buat file `app/(dashboard)/riwayat/page.tsx`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, Download, Printer, FileText } from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";

interface TrxItem {
  id: string;
  productName: string;
  variantInfo: string;
  quantity: number;
  priceAtSale: string;
  subtotal: string;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  createdAt: string;
  customer: { name: string; phone?: string | null } | null;
  kasir: { name: string };
  subtotal: string;
  discountAmount: string;
  discountReason?: string | null;
  totalAmount: string;
  paymentAmount: string;
  changeAmount: string;
  items: TrxItem[];
}

export default function RiwayatPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedTrx, setSelectedTrx] = useState<Transaction | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [printing, setPrinting] = useState<"nota" | "struk" | "suratjalan" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      start: `${startDate}T00:00:00`,
      end: `${endDate}T23:59:59`,
      limit: "200",
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/transaksi?${params}`);
    if (res.ok) setTransactions(await res.json());
    setLoading(false);
  }, [startDate, endDate, search]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(trx: Transaction) {
    setDetailLoading(true);
    setDetailOpen(true);
    const res = await fetch(`/api/transaksi/${trx.id}`);
    if (res.ok) setSelectedTrx(await res.json());
    setDetailLoading(false);
  }

  async function handleDownloadNota() {
    if (!selectedTrx) return;
    setPrinting("nota");
    const { generateNotaPDF } = await import("@/lib/pdf");
    const doc = generateNotaPDF(selectedTrx as Parameters<typeof generateNotaPDF>[0]);
    doc.save(`nota-${selectedTrx.transactionNumber}.pdf`);
    setPrinting(null);
  }

  async function handleCetakStruk() {
    if (!selectedTrx) return;
    setPrinting("struk");
    const { generateReceiptPDF } = await import("@/lib/pdf");
    const doc = generateReceiptPDF(selectedTrx as Parameters<typeof generateReceiptPDF>[0]);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    setPrinting(null);
  }

  async function handleCetakSuratJalan() {
    if (!selectedTrx) return;
    setPrinting("suratjalan");
    const { generateSuratJalanPDF } = await import("@/lib/pdf");
    const doc = generateSuratJalanPDF(selectedTrx as Parameters<typeof generateSuratJalanPDF>[0]);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
    setPrinting(null);
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Riwayat Pesanan</h1>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48 space-y-1">
              <Label className="text-xs">Cari</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="No. transaksi / nama pelanggan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  onKeyDown={(e) => e.key === "Enter" && load()}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Dari</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-40" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Sampai</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-40" />
            </div>
            <Button onClick={load} disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Tidak ada transaksi ditemukan</div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="lg:hidden space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="border rounded-lg bg-white overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{t.transactionNumber}</p>
                      <p className="text-xs text-gray-400">{formatDate(t.createdAt)}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{t.customer?.name ?? "Umum"}</p>
                      <p className="text-xs text-gray-400">Kasir: {t.kasir.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{formatRupiah(t.totalAmount)}</p>
                      <Badge variant="secondary" className="text-[10px] mt-1">{t.items.length} item</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 gap-1 text-xs rounded-none h-9 text-blue-600"
                    onClick={() => openDetail(t)}
                  >
                    <Eye className="h-3.5 w-3.5" />Detail
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Transaksi</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Kasir</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.transactionNumber}</TableCell>
                        <TableCell>{t.customer?.name ?? <span className="text-gray-400">Umum</span>}</TableCell>
                        <TableCell className="text-sm text-gray-600">{t.kasir.name}</TableCell>
                        <TableCell className="text-sm">{formatDate(t.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{t.items.length}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-medium text-sm">{formatRupiah(t.totalAmount)}</p>
                          {Number(t.discountAmount) > 0 && (
                            <p className="text-[10px] text-red-500">-{formatRupiah(t.discountAmount)}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => openDetail(t)}>
                            <Eye className="h-3.5 w-3.5" />Detail
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription className="sr-only">Detail lengkap transaksi dan opsi cetak dokumen</DialogDescription>
          </DialogHeader>

          {detailLoading || !selectedTrx ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info header */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span className="text-gray-400">No. Transaksi</span>
                  <p className="font-mono font-medium">{selectedTrx.transactionNumber}</p>
                </div>
                <div>
                  <span className="text-gray-400">Tanggal</span>
                  <p>{formatDate(selectedTrx.createdAt)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Pelanggan</span>
                  <p>{selectedTrx.customer?.name ?? "Umum"}</p>
                </div>
                <div>
                  <span className="text-gray-400">Kasir</span>
                  <p>{selectedTrx.kasir.name}</p>
                </div>
              </div>

              {/* Items table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTrx.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.productName}</p>
                          {item.variantInfo && <p className="text-xs text-gray-400">{item.variantInfo}</p>}
                        </TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatRupiah(item.priceAtSale)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatRupiah(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatRupiah(selectedTrx.subtotal)}</span>
                </div>
                {Number(selectedTrx.discountAmount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Diskon
                      {selectedTrx.discountReason && (
                        <span className="text-gray-400 text-xs ml-1">({selectedTrx.discountReason})</span>
                      )}
                    </span>
                    <span>-{formatRupiah(selectedTrx.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-base border-t pt-1">
                  <span>Total</span>
                  <span>{formatRupiah(selectedTrx.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Bayar</span>
                  <span>{formatRupiah(selectedTrx.paymentAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Kembali</span>
                  <span>{formatRupiah(selectedTrx.changeAmount)}</span>
                </div>
              </div>

              {/* Print buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDownloadNota}
                  disabled={printing !== null}
                >
                  {printing === "nota" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download Nota
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCetakStruk}
                  disabled={printing !== null}
                >
                  {printing === "struk" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Cetak Struk
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCetakSuratJalan}
                  disabled={printing !== null}
                >
                  {printing === "suratjalan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Surat Jalan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verifikasi type-check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -40
```

Expected: tidak ada error.

- [ ] **Step 3: Build production untuk verifikasi final**

```bash
cd /opt/kasir && npm run build 2>&1 | tail -20
```

Expected: `Route (app)` muncul `/riwayat` dalam output tanpa error.

- [ ] **Step 4: Commit**

```bash
cd /opt/kasir && git add app/\(dashboard\)/riwayat/page.tsx && git commit -m "feat: add halaman riwayat pesanan dengan search, filter, detail, dan cetak ulang"
```

---

### Task 4: Deploy dan verifikasi

**Files:** (tidak ada perubahan file)

- [ ] **Step 1: Push ke remote**

```bash
cd /opt/kasir && git push origin main
```

- [ ] **Step 2: Verifikasi di production**

Buka https://kasir-afitria.my.id dan:
1. Login sebagai Admin — pastikan menu "Riwayat Pesanan" muncul di sidebar
2. Login sebagai Kasir — pastikan menu juga muncul, dan hanya menampilkan transaksi milik kasir tersebut
3. Klik tombol Detail di salah satu transaksi — modal terbuka dengan data lengkap
4. Coba tombol Download Nota, Cetak Struk, dan Surat Jalan
5. Coba search dengan nomor transaksi dan nama pelanggan
6. Coba filter tanggal
