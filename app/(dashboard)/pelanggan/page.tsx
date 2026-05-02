"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, Users, Tag, X } from "lucide-react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "" });
  const [allVariants, setAllVariants] = useState<Variant[]>([]);
  const [priceForm, setPriceForm] = useState({ productVariantId: "", price: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/pelanggan");
    if (res.ok) setCustomers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );

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
    const res = await fetch(`/api/pelanggan/${c.id}`);
    if (res.ok) {
      const detail = await res.json();
      setSelectedCustomer(detail);
    }
    if (allVariants.length === 0) {
      const pRes = await fetch("/api/produk");
      if (pRes.ok) {
        const products = await pRes.json();
        const variants: Variant[] = [];
        for (const p of products) {
          for (const v of p.variants) {
            variants.push({ ...v, product: { name: p.name } });
          }
        }
        setAllVariants(variants);
      }
    }
    setPriceForm({ productVariantId: "", price: "" });
    setPriceDialogOpen(true);
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
    if (!confirm(`Hapus pelanggan "${c.name}"?`)) return;
    const res = await fetch(`/api/pelanggan/${c.id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Pelanggan dihapus" }); load(); }
    else toast({ title: "Gagal menghapus", variant: "destructive" });
  }

  async function handleAddPrice() {
    if (!selectedCustomer || !priceForm.productVariantId || !priceForm.price) return;
    setSaving(true);
    const res = await fetch(`/api/pelanggan/${selectedCustomer.id}/harga`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productVariantId: priceForm.productVariantId, price: parseFloat(priceForm.price) }),
    });
    if (res.ok) {
      toast({ title: "Harga khusus disimpan" });
      const detail = await fetch(`/api/pelanggan/${selectedCustomer.id}`).then((r) => r.json());
      setSelectedCustomer(detail);
      setPriceForm({ productVariantId: "", price: "" });
    } else toast({ title: "Gagal simpan harga", variant: "destructive" });
    setSaving(false);
  }

  async function handleDeletePrice(variantId: string) {
    if (!selectedCustomer) return;
    const res = await fetch(`/api/pelanggan/${selectedCustomer.id}/harga?variantId=${variantId}`, { method: "DELETE" });
    if (res.ok) {
      const detail = await fetch(`/api/pelanggan/${selectedCustomer.id}`).then((r) => r.json());
      setSelectedCustomer(detail);
      toast({ title: "Harga khusus dihapus" });
    }
  }

  const variantLabel = (v: Variant) => {
    const parts = [v.product.name];
    if (v.color) parts.push(v.color.name);
    if (v.size) parts.push(v.size.name);
    return parts.join(" - ");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pelanggan</h1>
          <p className="text-gray-500">{customers.length} pelanggan</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Tambah Pelanggan</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari nama / nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
          ) : (
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
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-400 py-8">Tidak ada pelanggan</TableCell></TableRow>
                ) : (
                  filtered.map((c) => (
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
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog tambah/edit pelanggan */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle></DialogHeader>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog harga khusus pelanggan */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Harga Khusus — {selectedCustomer?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              Harga di sini akan digunakan saat pelanggan ini dipilih di kasir. Jika tidak diatur, harga dasar produk yang berlaku.
            </div>

            {/* Form tambah harga */}
            <div className="space-y-3 border rounded-lg p-3">
              <p className="text-sm font-medium">Tambah Harga Khusus</p>
              <div className="space-y-2">
                <Label className="text-xs">Pilih Varian Produk</Label>
                <Select value={priceForm.productVariantId} onValueChange={(v) => setPriceForm({ ...priceForm, productVariantId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih produk / varian" /></SelectTrigger>
                  <SelectContent>
                    {allVariants.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {variantLabel(v)} — {formatRupiah(v.basePrice)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Harga Khusus (Rp)</Label>
                <Input type="number" placeholder="0" value={priceForm.price} onChange={(e) => setPriceForm({ ...priceForm, price: e.target.value })} />
              </div>
              <Button size="sm" onClick={handleAddPrice} disabled={saving || !priceForm.productVariantId || !priceForm.price} className="w-full">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Simpan Harga Khusus
              </Button>
            </div>

            {/* Daftar harga khusus yang sudah ada */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Harga Khusus Terdaftar ({selectedCustomer?.customerPrices.length ?? 0})</p>
              {selectedCustomer?.customerPrices.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Belum ada harga khusus</p>
              ) : (
                selectedCustomer?.customerPrices.map((cp) => (
                  <div key={cp.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">{cp.productVariant.product.name}</span>
                      {cp.productVariant.color && <span className="text-gray-500"> — {cp.productVariant.color.name}</span>}
                      {cp.productVariant.size && <span className="text-gray-500"> / {cp.productVariant.size.name}</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-blue-600">{formatRupiah(cp.price)}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => handleDeletePrice(cp.productVariantId)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
