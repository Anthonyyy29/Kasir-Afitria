"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2, Shield, UserCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User { id: string; name: string; role: "ADMIN" | "KASIR"; }

export default function PenggunaPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", role: "KASIR" });
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("az");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", role: "KASIR" });
    setDialogOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, role: u.role });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const res = editing
      ? await fetch(`/api/users/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      : await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });

    if (res.ok) {
      toast({ title: editing ? "Pengguna diperbarui" : "Pengguna ditambahkan" });
      setDialogOpen(false);
      load();
    } else {
      const err = await res.json();
      toast({ title: "Gagal", description: err.error, variant: "destructive" });
    }
    setSaving(false);
  }

  async function handleDelete(u: User) {
    if (u.id === session?.user?.id) {
      toast({ title: "Tidak bisa menghapus akun yang sedang digunakan", variant: "destructive" });
      return;
    }
    if (!confirm(`Hapus pengguna "${u.name}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (res.ok) { toast({ title: "Pengguna dihapus" }); load(); }
    else toast({ title: "Gagal menghapus", variant: "destructive" });
  }

  const q = search.toLowerCase();
  const displayed = [...users]
    .filter((u) => u.name.toLowerCase().includes(q))
    .sort((a, b) => {
      switch (sortKey) {
        case "za": return b.name.localeCompare(a.name);
        case "admin-first": return a.role === "ADMIN" ? -1 : b.role === "ADMIN" ? 1 : 0;
        case "kasir-first": return a.role === "KASIR" ? -1 : b.role === "KASIR" ? 1 : 0;
        default: return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
          <p className="text-gray-500">Tambah atau ubah pengguna yang bisa mengakses kasir</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Tambah </span>Pengguna</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Cari pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
            <SelectItem value="admin-first">Admin Dulu</SelectItem>
            <SelectItem value="kasir-first">Kasir Dulu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border rounded-lg bg-white">Tidak ada pengguna ditemukan</div>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="lg:hidden space-y-2">
            {displayed.map((u) => (
              <div key={u.id} className="border rounded-lg bg-white px-4 py-3 flex items-center gap-3">
                <div className={`rounded-full p-1.5 shrink-0 ${u.role === "ADMIN" ? "bg-purple-100" : "bg-blue-100"}`}>
                  {u.role === "ADMIN"
                    ? <Shield className="h-4 w-4 text-purple-600" />
                    : <UserCircle className="h-4 w-4 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className="text-[10px]">
                      {u.role === "ADMIN" ? "Admin" : "Kasir"}
                    </Badge>
                    {u.id === session?.user?.id && <Badge variant="success" className="text-[10px]">Aktif</Badge>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700" disabled={u.id === session?.user?.id}>
                    <Trash2 className="h-4 w-4" />
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
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`rounded-full p-1.5 ${u.role === "ADMIN" ? "bg-purple-100" : "bg-blue-100"}`}>
                            {u.role === "ADMIN"
                              ? <Shield className="h-4 w-4 text-purple-600" />
                              : <UserCircle className="h-4 w-4 text-blue-600" />}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                          {u.role === "ADMIN" ? "Admin" : "Kasir"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.id === session?.user?.id && (
                          <Badge variant="success">Sedang aktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700" disabled={u.id === session?.user?.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
            <DialogDescription className="sr-only">{editing ? "Edit data pengguna" : "Isi data pengguna baru"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input placeholder="Nama pengguna" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="KASIR">Kasir — hanya bisa transaksi</SelectItem>
                  <SelectItem value="ADMIN">Admin — akses penuh</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
