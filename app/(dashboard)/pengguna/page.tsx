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
import { Plus, Pencil, Trash2, Loader2, Shield, UserCircle } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Pengguna</h1>
          <p className="text-gray-500">Tambah atau ubah pengguna yang bisa mengakses kasir</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Tambah Pengguna</Button>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
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
          )}
        </CardContent>
      </Card>

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
