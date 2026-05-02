"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Item {
  id: string;
  name: string;
  [key: string]: unknown;
}

interface MasterDataPageProps {
  title: string;
  apiUrl: string;
  extraFields?: {
    key: string;
    label: string;
    type?: string;
    placeholder?: string;
    options?: { id: string; name: string }[];
  }[];
  renderExtra?: (item: Item) => React.ReactNode;
}

export function MasterDataPage({ title, apiUrl, extraFields = [], renderExtra }: MasterDataPageProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ name: "" });

  async function load() {
    setLoading(true);
    const res = await fetch(apiUrl);
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    const initial: Record<string, string> = { name: "" };
    extraFields.forEach((f) => { initial[f.key] = ""; });
    setForm(initial);
    setDialogOpen(true);
  }

  function openEdit(item: Item) {
    setEditing(item);
    const initial: Record<string, string> = { name: item.name };
    extraFields.forEach((f) => { initial[f.key] = String(item[f.key] ?? ""); });
    setForm(initial);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = { ...form };

    const res = editing
      ? await fetch(`${apiUrl}/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      toast({ title: editing ? `${title} diperbarui` : `${title} ditambahkan`, variant: "default" });
      setDialogOpen(false);
      load();
    } else {
      const err = await res.json();
      toast({ title: "Gagal", description: err.error ?? "Terjadi kesalahan", variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(item: Item) {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    const res = await fetch(`${apiUrl}/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast({ title: `${title} dihapus` });
      load();
    } else {
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">{items.length} data</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah {title}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  {extraFields.map((f) => (
                    <TableHead key={f.key}>{f.label}</TableHead>
                  ))}
                  {renderExtra && <TableHead>Info</TableHead>}
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3 + extraFields.length} className="text-center text-gray-400 py-8">
                      Belum ada data
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      {extraFields.map((f) => (
                        <TableCell key={f.key}>{String(item[f.key] ?? "-")}</TableCell>
                      ))}
                      {renderExtra && <TableCell>{renderExtra(item)}</TableCell>}
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Tambah ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={`Nama ${title}`}
              />
            </div>
            {extraFields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label>{f.label}</Label>
                {f.options ? (
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    <option value="">Pilih {f.label}</option>
                    {f.options.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    placeholder={f.placeholder ?? f.label}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
