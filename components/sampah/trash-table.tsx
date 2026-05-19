"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TrashType } from "@/lib/soft-delete";

interface TrashItem {
  id: string;
  label: string;
  info: string | null;
  deletedAt: string;
}

interface TrashTableProps {
  type: TrashType;
  onCountChange?: (count: number) => void;
}

export function TrashTable({ type, onCountChange }: TrashTableProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmItem, setConfirmItem] = useState<TrashItem | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // id yang sedang diproses

  useEffect(() => {
    fetch(`/api/sampah?type=${type}`)
      .then(r => r.json())
      .then(data => {
        setItems(data);
        onCountChange?.(data.length);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function handleRestore(item: TrashItem) {
    setActionLoading(item.id);
    const res = await fetch(`/api/sampah/${type}/${item.id}/restore`, { method: "POST" });
    if (res.ok) {
      const newItems = items.filter(i => i.id !== item.id);
      setItems(newItems);
      onCountChange?.(newItems.length);
      toast({ title: `${item.label} dipulihkan` });
    } else {
      const body = await res.json().catch(() => ({}));
      toast({ title: "Gagal memulihkan", description: body.error, variant: "destructive" });
    }
    setActionLoading(null);
  }

  async function handlePermanentDelete(item: TrashItem) {
    setConfirmItem(null);
    setActionLoading(item.id);
    const res = await fetch(`/api/sampah/${type}/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      const newItems = items.filter(i => i.id !== item.id);
      setItems(newItems);
      onCountChange?.(newItems.length);
      toast({ title: `${item.label} dihapus permanen` });
    } else {
      const body = await res.json().catch(() => ({}));
      toast({ title: "Tidak bisa dihapus", description: body.error, variant: "destructive" });
    }
    setActionLoading(null);
  }

  function daysLeft(deletedAt: string): number {
    const elapsed = (Date.now() - new Date(deletedAt).getTime()) / 86400000;
    return Math.max(0, Math.ceil(30 - elapsed));
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  if (items.length === 0) return (
    <div className="text-center py-12 text-gray-400">Tidak ada item di sampah</div>
  );

  return (
    <>
      <div className="border rounded-lg overflow-hidden overflow-x-auto">
        <Table className="min-w-[560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nama / Identifier</TableHead>
              <TableHead>Info</TableHead>
              <TableHead>Dihapus pada</TableHead>
              <TableHead>Sisa hari</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const days = daysLeft(item.deletedAt);
              const isLoading = actionLoading === item.id;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-sm text-gray-500">{item.info ?? "—"}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(item.deletedAt).toLocaleDateString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm font-medium ${days <= 3 ? "text-red-500" : days <= 7 ? "text-yellow-500" : "text-gray-500"}`}>
                      {days} hari
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" title="Pulihkan" onClick={() => handleRestore(item)} disabled={isLoading}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4 text-green-600" />}
                      </Button>
                      <Button variant="ghost" size="icon" title="Hapus permanen" onClick={() => setConfirmItem(item)} disabled={isLoading} className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirm dialog hapus permanen */}
      <Dialog open={!!confirmItem} onOpenChange={() => setConfirmItem(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Hapus Permanen?</DialogTitle>
            <DialogDescription>
              &quot;{confirmItem?.label}&quot; akan dihapus dari database selamanya dan tidak bisa dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setConfirmItem(null)}>Batal</Button>
            <Button variant="destructive" onClick={() => confirmItem && handlePermanentDelete(confirmItem)}>
              Hapus Permanen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
