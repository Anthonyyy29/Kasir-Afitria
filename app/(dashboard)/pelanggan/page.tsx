"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Users, Tag, Search, Check, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";

interface CustomerPrice { id: string; productVariantId: string; price: string; productVariant: { product: { name: string }; color: { name: string } | null; size: { name: string } | null }; }
interface Customer { id: string; name: string; phone: string | null; email: string | null; address: string | null; _count: { transactions: number }; }
interface CustomerDetail extends Customer { customerPrices: CustomerPrice[]; }
interface Variant { id: string; colorId: string | null; sizeId: string | null; basePrice: string; color: { name: string } | null; size: { name: string } | null; product: { name: string }; }

export default function PelangganPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("az");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [variantSearch, setVariantSearch] = useState("");
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});
  const [savingVariants, setSavingVariants] = useState<Set<string>>(new Set());
  const [savedVariants, setSavedVariants] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pelanggan");
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.toLowerCase();
  const filtered = [...customers]
    .filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone ?? "").includes(search)
    )
    .sort((a, b) => {
      switch (sortKey) {
        case "za": return b.name.localeCompare(a.name);
        case "txn-desc": return b._count.transactions - a._count.transactions;
        case "txn-asc": return a._count.transactions - b._count.transactions;
        default: return a.name.localeCompare(b.name);
      }
    });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", phone: "", email: "", address: "" });
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "" });
    setDialogOpen(true);
  }

  async function openPriceDialog(c: Customer) {
    setSelectedCustomer(null);
    setLocalPrices({});
    setVariantSearch("");
    setPriceDialogOpen(true);

    const [detailRes, produkRes] = await Promise.all([
      fetch(`/api/pelanggan/${c.id}`),
      allVariants.length === 0 ? fetch("/api/produk") : Promise.resolve(null),
    ]);

    if (detailRes.ok) {
      const detail: CustomerDetail = await detailRes.json();
      setSelectedCustomer(detail);
      const prices: Record<string, string> = {};
      for (const cp of detail.customerPrices) {
        prices[cp.productVariantId] = String(cp.price);
      }
      setLocalPrices(prices);
    }

    if (produkRes?.ok) {
      const products = await produkRes.json();
      const variants: Variant[] = [];
      for (const p of products) {
        for (const v of p.variants) {
          variants.push({ ...v, product: { name: p.name } });
        }
      }
      setAllVariants(variants);
    }
  }

  async function handleSave() {
    setSaving(true);
    const res = editing
      ? await fetch(`/api/pelanggan/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/pelanggan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast({ title: editing ? "Pelanggan diperbarui" : "Pelanggan ditambahkan" });
      setDialogOpen(false);
      load();
    } else {
      toast({ title: "Gagal", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Pindahkan pelanggan "${c.name}" ke sampah?`)) return;
    const res = await fetch(`/api/pelanggan/${c.id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Pelanggan dipindahkan ke sampah" }); load(); }
    else toast({ title: "Gagal menghapus", variant: "destructive" });
  }

  async function handlePriceBlur(variantId: string) {
    if (!selectedCustomer) return;
    const value = localPrices[variantId] ?? "";
    const prevPrice = selectedCustomer.customerPrices.find(cp => cp.productVariantId === variantId);
    const prevValue = prevPrice ? String(prevPrice.price) : "";

    if (value === prevValue) return;

    setSavingVariants(prev => new Set(prev).add(variantId));

    if (value === "") {
      if (prevPrice) {
        await fetch(`/api/pelanggan/${selectedCustomer.id}/harga?variantId=${variantId}`, { method: "DELETE" });
        setSelectedCustomer(prev => prev ? {
          ...prev,
          customerPrices: prev.customerPrices.filter(cp => cp.productVariantId !== variantId),
        } : prev);
      }
    } else {
      const price = parseFloat(value);
      if (isNaN(price) || price <= 0) {
        setSavingVariants(prev => { const s = new Set(prev); s.delete(variantId); return s; });
        return;
      }
      const res = await fetch(`/api/pelanggan/${selectedCustomer.id}/harga`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId: variantId, price }),
      });
      if (res.ok) {
        const saved = await res.json();
        setSelectedCustomer(prev => {
          if (!prev) return prev;
          const existing = prev.customerPrices.find(cp => cp.productVariantId === variantId);
          if (existing) {
            return { ...prev, customerPrices: prev.customerPrices.map(cp => cp.productVariantId === variantId ? saved : cp) };
          }
          return { ...prev, customerPrices: [...prev.customerPrices, saved] };
        });
        setSavedVariants(prev => new Set(prev).add(variantId));
        setTimeout(() => setSavedVariants(prev => { const s = new Set(prev); s.delete(variantId); return s; }), 1500);
      }
    }

    setSavingVariants(prev => { const s = new Set(prev); s.delete(variantId); return s; });
  }

  function handleExport() {
    if (!selectedCustomer) return;
    const rows = allVariants.map(v => ({
      "ID Varian (jangan diubah)": v.id,
      "Produk": v.product.name,
      "Warna": v.color?.name ?? "-",
      "Ukuran": v.size?.name ?? "-",
      "Harga Dasar": parseFloat(v.basePrice),
      "Harga Khusus": localPrices[v.id] ? parseFloat(localPrices[v.id]) : "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Lebar kolom
    ws["!cols"] = [
      { wch: 38 }, // ID Varian
      { wch: 24 }, // Produk
      { wch: 14 }, // Warna
      { wch: 12 }, // Ukuran
      { wch: 16 }, // Harga Dasar
      { wch: 16 }, // Harga Khusus
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Harga Khusus");
    XLSX.writeFile(wb, `harga-khusus-${selectedCustomer.name.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedCustomer || !e.target.files?.[0]) return;
    setImporting(true);

    try {
      const file = e.target.files[0];
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

      const items = rows
        .filter(r => r["ID Varian (jangan diubah)"])
        .map(r => ({
          productVariantId: String(r["ID Varian (jangan diubah)"]),
          price: r["Harga Khusus"] ? parseFloat(String(r["Harga Khusus"])) : null,
        }));

      if (items.length === 0) {
        toast({ title: "File tidak valid atau kosong", variant: "destructive" });
        setImporting(false);
        e.target.value = "";
        return;
      }

      const res = await fetch(`/api/pelanggan/${selectedCustomer.id}/harga/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });

      if (res.ok) {
        const { upserted, deleted } = await res.json();
        toast({ title: `Import berhasil — ${upserted} harga diset, ${deleted} dihapus` });

        // Refresh data pelanggan & localPrices
        const detail: CustomerDetail = await fetch(`/api/pelanggan/${selectedCustomer.id}`).then(r => r.json());
        setSelectedCustomer(detail);
        const prices: Record<string, string> = {};
        for (const cp of detail.customerPrices) {
          prices[cp.productVariantId] = String(cp.price);
        }
        setLocalPrices(prices);
      } else {
        toast({ title: "Gagal import", variant: "destructive" });
      }
    } catch {
      toast({ title: "File tidak bisa dibaca", variant: "destructive" });
    }

    setImporting(false);
    e.target.value = "";
  }

  const variantLabel = (v: Variant) => {
    const parts = [v.product.name];
    if (v.color) parts.push(v.color.name);
    if (v.size) parts.push(v.size.name);
    return parts.join(" — ");
  };

  const filteredVariants = allVariants.filter(v =>
    variantLabel(v).toLowerCase().includes(variantSearch.toLowerCase())
  );

  const specialPriceCount = Object.values(localPrices).filter(v => v !== "").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pelanggan</h1>
          <p className="text-gray-500">{customers.length} pelanggan</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah </span>Pelanggan</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari nama / nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
            <SelectItem value="txn-desc">Transaksi Terbanyak</SelectItem>
            <SelectItem value="txn-asc">Transaksi Tersedikit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border rounded-lg bg-white">Tidak ada pelanggan</div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="border rounded-lg bg-white overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{c.name}</p>
                      {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                      {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
                      {c.address && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.address}</p>}
                    </div>
                    <Badge variant="secondary" className="shrink-0">{c._count.transactions}x</Badge>
                  </div>
                </div>
                <div className="flex border-t">
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs rounded-none h-9 text-blue-600" onClick={() => openPriceDialog(c)}>
                    <Tag className="h-3.5 w-3.5" />Harga
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs rounded-none h-9 border-l" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-1 text-xs rounded-none h-9 border-l text-red-500 hover:text-red-700" onClick={() => handleDelete(c)}>
                    <Trash2 className="h-3.5 w-3.5" />Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Transaksi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{c.phone ?? "-"}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{c.address ?? "-"}</TableCell>
                      <TableCell><Badge variant="secondary">{c._count.transactions}x</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" title="Harga Khusus" onClick={() => openPriceDialog(c)}><Tag className="h-4 w-4 text-blue-500" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialog tambah/edit pelanggan */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle>
            <DialogDescription className="sr-only">{editing ? "Edit data pelanggan" : "Isi data pelanggan baru"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {[
              { key: "name", label: "Nama", placeholder: "Nama pelanggan", required: true },
              { key: "phone", label: "Nomor HP", placeholder: "08xxxxxxxxxx" },
              { key: "email", label: "Email", placeholder: "email@contoh.com" },
              { key: "address", label: "Alamat", placeholder: "Alamat lengkap" },
            ].map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  placeholder={field.placeholder}
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog harga khusus pelanggan */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pr-6">
              <div>
                <DialogTitle>Harga Khusus — {selectedCustomer?.name ?? "..."}</DialogTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {specialPriceCount > 0
                    ? `${specialPriceCount} varian dengan harga khusus`
                    : "Belum ada harga khusus — isi kolom untuk menetapkan"}
                </p>
              </div>
              {selectedCustomer && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </Button>
                  <label>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={importing} asChild>
                      <span>
                        {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Import
                      </span>
                    </Button>
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} disabled={importing} />
                  </label>
                </div>
              )}
            </div>
            <DialogDescription className="sr-only">Kelola harga khusus varian produk untuk pelanggan ini</DialogDescription>
          </DialogHeader>

          {!selectedCustomer ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Cari produk / varian..."
                  value={variantSearch}
                  onChange={(e) => setVariantSearch(e.target.value)}
                />
              </div>

              {/* Tabel */}
              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[52vh] overflow-y-auto overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Produk</TableHead>
                        <TableHead>Warna</TableHead>
                        <TableHead>Ukuran</TableHead>
                        <TableHead className="text-right">Harga Dasar</TableHead>
                        <TableHead className="text-right w-[160px]">Harga Khusus (Rp)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVariants.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                            {allVariants.length === 0 ? "Memuat produk..." : "Tidak ada produk ditemukan"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredVariants.map((v) => {
                          const hasSpecial = !!(localPrices[v.id] && localPrices[v.id] !== "");
                          const isSaving = savingVariants.has(v.id);
                          const isSaved = savedVariants.has(v.id);
                          return (
                            <TableRow key={v.id} className={hasSpecial ? "bg-blue-50/60" : ""}>
                              <TableCell className="font-medium text-sm">{v.product.name}</TableCell>
                              <TableCell className="text-sm text-gray-600">{v.color?.name ?? "-"}</TableCell>
                              <TableCell className="text-sm text-gray-600">{v.size?.name ?? "-"}</TableCell>
                              <TableCell className="text-right text-sm text-gray-500">{formatRupiah(v.basePrice)}</TableCell>
                              <TableCell className="text-right">
                                <div className="relative flex items-center justify-end gap-1.5">
                                  <Input
                                    type="number"
                                    placeholder="—"
                                    value={localPrices[v.id] ?? ""}
                                    onChange={(e) => setLocalPrices(prev => ({ ...prev, [v.id]: e.target.value }))}
                                    onBlur={() => handlePriceBlur(v.id)}
                                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                                    className={[
                                      "w-24 sm:w-32 text-right text-sm h-8",
                                      hasSpecial ? "border-blue-400 bg-white font-medium text-blue-700" : "",
                                    ].join(" ")}
                                    disabled={isSaving}
                                  />
                                  <div className="w-4 flex-shrink-0">
                                    {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                                    {isSaved && !isSaving && <Check className="h-3.5 w-3.5 text-green-500" />}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Ketik harga lalu tekan <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd> atau klik di luar untuk menyimpan. Kosongkan untuk menghapus harga khusus.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
