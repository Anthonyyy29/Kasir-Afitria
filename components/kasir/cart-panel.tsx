"use client";

import { useState } from "react";
import { ShoppingCart, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/utils";
import type { CartSessionData, CartItem } from "@/hooks/use-cart-session";

interface CartPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: CartSessionData[];
  activeCartId: string | null;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => Promise<void>;
}

function calcTotal(items: CartItem[], discountAmount: number): number {
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  return Math.max(0, subtotal - discountAmount);
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff} dtk lalu`;
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  return `${Math.floor(diff / 3600)} jam lalu`;
}

export function CartPanelButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" className="relative gap-2" onClick={onClick}>
      <ShoppingCart className="h-4 w-4" />
      <span className="hidden sm:inline">Keranjang Aktif</span>
      {count > 1 && (
        <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
          {count}
        </span>
      )}
    </Button>
  );
}

export function CartPanel({
  open,
  onOpenChange,
  sessions,
  activeCartId,
  onSwitch,
  onDelete,
  onCreateNew,
}: CartPanelProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
    setConfirmId(null);
  }

  async function handleCreateNew() {
    setCreating(true);
    await onCreateNew();
    setCreating(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Keranjang Aktif
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {sessions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Belum ada keranjang.</p>
          )}
          {sessions.map((s) => {
            const isActive = s.id === activeCartId;
            const total = calcTotal(s.items, s.discountAmount);
            const label = s.customer?.name ?? "Tanpa pelanggan";
            const isConfirming = confirmId === s.id;

            return (
              <div
                key={s.id}
                className={`rounded-lg border p-3 flex items-center gap-3 ${
                  isActive ? "border-blue-400 bg-blue-50" : "border-gray-200"
                }`}
              >
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{label}</p>
                  <p className="text-xs text-gray-500">
                    {s.items.length} item &middot; {s.items.reduce((sum, i) => sum + i.quantity, 0)} pcs &middot; {formatRupiah(total)} &middot; {timeAgo(s.createdAt)}
                  </p>
                </div>

                {isConfirming ? (
                  <div className="flex gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                    >
                      Batalkan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setConfirmId(null)}
                    >
                      Tidak
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {!isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => { onSwitch(s.id); onOpenChange(false); }}
                      >
                        Buka
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                      onClick={() => setConfirmId(s.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={creating}
          onClick={handleCreateNew}
        >
          <Plus className="h-4 w-4" />
          Buat Keranjang Baru
        </Button>
      </DialogContent>
    </Dialog>
  );
}
