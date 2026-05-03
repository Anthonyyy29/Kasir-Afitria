"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, PackageSearch, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";

interface Variant { id: string; colorId: string | null; sizeId: string | null; basePrice: string; stock: number; sku: string | null; color: { name: string; hex: string | null } | null; size: { name: string } | null; }
interface Product { id: string; name: string; description: string | null; unitId: string; categoryId: string; subCategoryId: string | null; lowStockThreshold: number; unit: { name: string }; category: { name: string }; subCategory: { name: string } | null; variants: Variant[]; }
interface VariantForm { colorId: string; sizeId: string; basePrice: string; stock: string; sku: string; }

export default function ProdukPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subCategories, setSubCategories] = useState<{ id: string; name: string; categoryId: string }[]>([]);
  const [colors, setColors] = useState<{ id: string; name: string; hex: string | null }[]>([]);
  const [sizes, setSizes] = useState<{ id: string; name: string }[]>([]);

  const [form, setForm] = useState({ name: "", description: "", unitId: "", categoryId: "", subCategoryId: "", lowStockThreshold: "5" });
  const [variants, setVariants] = useState<VariantForm[]>([{ colorId: "", sizeId: "", basePrice: "", stock: "", sku: "" }]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/produk");
    if (res.ok) setProducts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/satuan").then((r) => r.json()),
      fetch("/api/kategori").then((r) => r.json()),
      fetch("/api/sub-kategori").then((r) => r.json()),
      fetch("/api/warna").then((r) => r.json()),
      fetch("/api/ukuran").then((r) => r.json()),
    ]).then(([u, c, sc, col, sz]) => {
      setUnits(u); setCategories(c); setSubCategories(sc); setColors(col); setSizes(sz);
    });
  }, [load]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.name.toLowerCase().includes(search.toLowerCase())
  );

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", unitId: "", categoryId: "", subCategoryId: "", lowStockThreshold: "5" });
    setVariants([{ colorId: "", sizeId: "", basePrice: "", stock: "", sku: "" }]);
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "", unitId: p.unitId, categoryId: p.categoryId, subCategoryId: p.subCategoryId ?? "", lowStockThreshold: String(p.lowStockThreshold) });
    setVariants(p.variants.map((v) => ({ colorId: v.colorId ?? "", sizeId: v.sizeId ?? "", basePrice: v.basePrice, stock: String(v.stock), sku: v.sku ?? "" })));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        ...form,
        subCategoryId: form.subCategoryId || null,
        lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
        variants: variants.map((v) => ({
          colorId: v.colorId || null,
          sizeId: v.sizeId || null,
          basePrice: parseFloat(v.basePrice) || 0,
          stock: parseInt(v.stock) || 0,
          sku: v.sku || null,
        })),
      };

      const res = editing
        ? await fetch(`/api/produk/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/produk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

      if (res.ok) {
        toast({ title: editing ? "Produk diperbarui" : "Produk ditambahkan" });
        setDialogOpen(false);
        load();
      } else {
        const err = await res.json();
        toast({ title: "Gagal", description: err.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Gagal", description: "Terjadi kesalahan jaringan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSalin(p: Product) {
    if (!confirm(`Salin produk "${p.name}"?`)) return;
    const res = await fetch(`/api/produk/${p.id}/salin`, { method: "POST" });
    if (res.ok) { toast({ title: "Produk disalin", description: `"${p.name} (Salinan)" berhasil dibuat` }); load(); }
    else toast({ title: "Gagal menyalin", variant: "destructive" });
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    const res = await fetch(`/api/produk/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Produk dihapus" }); load(); }
    else toast({ title: "Gagal menghapus", variant: "destructive" });
  }

  const toggleExpand = (id: string) => setExpanded((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const filteredSubs = subCategories.filter((s) => !form.categoryId || s.categoryId === form.categoryId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daftar Produk</h1>
          <p className="text-gray-500">{products.length} produk</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Tambah Produk</Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead>Varian</TableHead>
                  <TableHead>Stok Total</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-8">Tidak ada produk</TableCell></TableRow>
                ) : (
                  filtered.map((p) => {
                    const isExpanded = expanded.includes(p.id);
                    const totalStock = p.variants.reduce((s, v) => s + v.stock, 0);
                    const hasLowStock = p.variants.some((v) => v.stock <= p.lowStockThreshold);
                    return (
                      <Fragment key={p.id}>
                        <TableRow className="cursor-pointer" onClick={() => toggleExpand(p.id)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{p.name}</div>
                            {p.description && <div className="text-xs text-gray-400">{p.description}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{p.category.name}</div>
                            {p.subCategory && <div className="text-xs text-gray-400">{p.subCategory.name}</div>}
                          </TableCell>
                          <TableCell className="text-sm">{p.unit.name}</TableCell>
                          <TableCell><Badge variant="secondary">{p.variants.length} varian</Badge></TableCell>
                          <TableCell>
                            <span className={hasLowStock ? "text-yellow-600 font-medium" : ""}>{totalStock}</span>
                            {hasLowStock && <Badge variant="warning" className="ml-2 text-[10px]">Stok Tipis</Badge>}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleSalin(p)} title="Salin produk"><Copy className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={7} className="bg-gray-50 p-0">
                              <div className="px-8 py-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Varian Produk</p>
                                <div className="grid gap-2">
                                  {p.variants.map((v) => (
                                    <div key={v.id} className="flex items-center gap-4 bg-white rounded-lg border px-4 py-2.5 text-sm">
                                      <div className="flex items-center gap-2 min-w-[120px]">
                                        {v.color && (
                                          <div className="flex items-center gap-1.5">
                                            {v.color.hex && <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: v.color.hex }} />}
                                            <span>{v.color.name}</span>
                                          </div>
                                        )}
                                        {v.color && v.size && <span className="text-gray-300">/</span>}
                                        {v.size && <span>{v.size.name}</span>}
                                        {!v.color && !v.size && <span className="text-gray-400 italic">Default</span>}
                                      </div>
                                      <div className="text-gray-500">SKU: {v.sku || "-"}</div>
                                      <div className="font-medium text-blue-600">{formatRupiah(v.basePrice)}</div>
                                      <div className={`ml-auto font-medium ${v.stock <= p.lowStockThreshold ? "text-yellow-600" : "text-green-600"}`}>
                                        Stok: {v.stock}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription className="sr-only">{editing ? "Edit data produk dan variannya" : "Isi data produk baru beserta variannya"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nama Produk</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama produk" />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Deskripsi (opsional)</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                  <SelectContent>{units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Batas Stok Minimum</Label>
                <Input type="number" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Kategori (Jenis)</Label>
                <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v, subCategoryId: "" })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub Kategori (Sub Jenis)</Label>
                <Select value={form.subCategoryId || undefined} onValueChange={(v) => setForm({ ...form, subCategoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih sub kategori (opsional)" /></SelectTrigger>
                  <SelectContent>
                    {filteredSubs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Varian Produk</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setVariants([...variants, { colorId: "", sizeId: "", basePrice: "", stock: "", sku: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Tambah Varian
                </Button>
              </div>
              {variants.map((v, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Varian {i + 1}</span>
                    {variants.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => setVariants(variants.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Warna</Label>
                      <Select value={v.colorId || undefined} onValueChange={(val) => { const nv = [...variants]; nv[i].colorId = val; setVariants(nv); }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih warna" /></SelectTrigger>
                        <SelectContent>
                          {colors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Ukuran</Label>
                      <Select value={v.sizeId || undefined} onValueChange={(val) => { const nv = [...variants]; nv[i].sizeId = val; setVariants(nv); }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Pilih ukuran" /></SelectTrigger>
                        <SelectContent>
                          {sizes.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga Dasar (Rp)</Label>
                      <Input className="h-9" type="number" placeholder="0" value={v.basePrice} onChange={(e) => { const nv = [...variants]; nv[i].basePrice = e.target.value; setVariants(nv); }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stok Awal</Label>
                      <Input className="h-9" type="number" placeholder="0" value={v.stock} onChange={(e) => { const nv = [...variants]; nv[i].stock = e.target.value; setVariants(nv); }} />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">SKU (opsional)</Label>
                      <Input className="h-9" placeholder="SKU-001" value={v.sku} onChange={(e) => { const nv = [...variants]; nv[i].sku = e.target.value; setVariants(nv); }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.unitId || !form.categoryId}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
