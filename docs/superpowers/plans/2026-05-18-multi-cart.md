# Multi-Cart (Keranjang Paralel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kasir bisa mengelola hingga 10+ keranjang aktif sekaligus, disimpan di database agar survive ganti device.

**Architecture:** Tambah tabel `CartSession` di DB untuk menyimpan state keranjang per kasir. Sebuah hook `useCartSession` mengelola sesi-sesi tersebut dan sync ke DB via debounce. Komponen `CartPanel` (dialog) menampilkan daftar keranjang dan memungkinkan kasir berpindah, membuat, atau membatalkan keranjang. State aktif kasir (activeCartId) disimpan di localStorage.

**Tech Stack:** Prisma 6, Next.js 16 App Router, TypeScript, shadcn/ui Dialog, Lucide icons, NextAuth v4 session.

---

## File Map

| File | Aksi | Tanggung Jawab |
|------|------|----------------|
| `prisma/schema.prisma` | Modify | Tambah model `CartSession` + relasi ke `User` dan `Customer` |
| `prisma/migrations/..._add_cart_session/` | Create (auto) | Migration SQL untuk tabel baru |
| `app/api/cart/route.ts` | Create | GET list + POST create CartSession |
| `app/api/cart/[id]/route.ts` | Create | GET detail + PUT update + DELETE CartSession |
| `hooks/use-cart-session.ts` | Create | Hook: sessions list, active cart, CRUD, debounced sync |
| `components/kasir/cart-panel.tsx` | Create | Dialog daftar keranjang + tombol trigger |
| `app/(dashboard)/kasir/page.tsx` | Modify | Integrasikan hook + CartPanel, sync state, cleanup checkout |

---

## Task 1: Prisma Schema — Tambah CartSession

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Tambah model CartSession dan relasi ke schema**

Edit `prisma/schema.prisma`. Tambah model baru di bagian akhir file:

```prisma
model CartSession {
  id             String    @id @default(cuid())
  customerId     String?
  kasirId        String
  items          Json      @default("[]")
  discountAmount Float     @default(0)
  discountReason String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  customer       Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  kasir          User      @relation(fields: [kasirId], references: [id])
}
```

Tambah relasi ke model `User` (setelah baris `transactions Transaction[]`):
```prisma
  cartSessions   CartSession[]
```

Tambah relasi ke model `Customer` (setelah baris `customerPrices CustomerPrice[]`):
```prisma
  cartSessions   CartSession[]
```

- [ ] **Step 2: Jalankan migrasi**

```bash
docker exec kasir-app npx prisma migrate dev --name add_cart_session
```

Jika gagal (runner stage tidak support migrate dev), gunakan:
```bash
docker compose run --rm app npx prisma migrate dev --name add_cart_session
```

Expected output: `The following migration(s) have been created and applied: migrations/..._add_cart_session`

- [ ] **Step 3: Verifikasi tabel terbuat**

```bash
docker exec kasir-db psql -U postgres -d kasir -c "\d cart_sessions"
```

Expected: tabel dengan kolom `id`, `customer_id`, `kasir_id`, `items`, `discount_amount`, `discount_reason`, `created_at`, `updated_at`.

- [ ] **Step 4: Commit**

```bash
git -C /opt/kasir add prisma/schema.prisma prisma/migrations/
git -C /opt/kasir commit -m "feat: tambah model CartSession ke schema Prisma"
```

---

## Task 2: API — GET List + POST Create (`/api/cart`)

**Files:**
- Create: `app/api/cart/route.ts`

- [ ] **Step 1: Buat file route**

Buat `app/api/cart/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const carts = await prisma.cartSession.findMany({
      where: { kasirId: session.user.id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(carts);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const cart = await prisma.cartSession.create({
      data: { kasirId: session.user.id },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return NextResponse.json(cart, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git -C /opt/kasir add app/api/cart/route.ts
git -C /opt/kasir commit -m "feat: tambah GET + POST /api/cart"
```

---

## Task 3: API — GET Detail + PUT Update + DELETE (`/api/cart/[id]`)

**Files:**
- Create: `app/api/cart/[id]/route.ts`

- [ ] **Step 1: Buat file route**

Buat `app/api/cart/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getCartAndVerify(id: string, userId: string, userRole: string) {
  const cart = await prisma.cartSession.findUnique({ where: { id } });
  if (!cart) return null;
  if (cart.kasirId !== userId && userRole !== "ADMIN") return "forbidden";
  return cart;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cart = await prisma.cartSession.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    return NextResponse.json(cart);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { customerId, items, discountAmount, discountReason } = body;

    const updated = await prisma.cartSession.update({
      where: { id },
      data: {
        ...(customerId !== undefined && { customerId: customerId ?? null }),
        ...(items !== undefined && { items }),
        ...(discountAmount !== undefined && { discountAmount }),
        ...(discountReason !== undefined && { discountReason: discountReason ?? null }),
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.cartSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git -C /opt/kasir add app/api/cart/[id]/route.ts
git -C /opt/kasir commit -m "feat: tambah GET + PUT + DELETE /api/cart/[id]"
```

---

## Task 4: Hook — `useCartSession`

**Files:**
- Create: `hooks/use-cart-session.ts`

- [ ] **Step 1: Buat hook**

Buat `hooks/use-cart-session.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantInfo: string;
  price: number;
  basePrice: number;
  quantity: number;
  stock: number;
  unit: string;
}

export interface CartSessionData {
  id: string;
  customerId: string | null;
  kasirId: string;
  items: CartItem[];
  discountAmount: number;
  discountReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
}

interface SyncPayload {
  customerId?: string | null;
  items?: CartItem[];
  discountAmount?: number;
  discountReason?: string | null;
}

const ACTIVE_CART_KEY = "kasir_active_cart_id";

export function useCartSession() {
  const [sessions, setSessions] = useState<CartSessionData[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<SyncPayload>({});

  const activeSession = sessions.find((s) => s.id === activeCartId) ?? null;

  const fetchSessions = useCallback(async (): Promise<CartSessionData[]> => {
    const res = await fetch("/api/cart");
    if (!res.ok) return [];
    return res.json();
  }, []);

  const activateCart = useCallback((id: string, allSessions: CartSessionData[]) => {
    setActiveCartId(id);
    localStorage.setItem(ACTIVE_CART_KEY, id);
    setSessions(allSessions);
  }, []);

  const createNewCart = useCallback(async (existingSessions: CartSessionData[]): Promise<CartSessionData | null> => {
    const res = await fetch("/api/cart", { method: "POST" });
    if (!res.ok) return null;
    const newCart: CartSessionData = await res.json();
    const updated = [...existingSessions, newCart];
    activateCart(newCart.id, updated);
    return newCart;
  }, [activateCart]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const data = await fetchSessions();
      const stored = localStorage.getItem(ACTIVE_CART_KEY);
      const validStored = data.find((s) => s.id === stored);

      if (validStored) {
        setSessions(data);
        setActiveCartId(validStored.id);
      } else if (data.length > 0) {
        setSessions(data);
        setActiveCartId(data[0].id);
        localStorage.setItem(ACTIVE_CART_KEY, data[0].id);
      } else {
        await createNewCart([]);
      }
      setIsLoading(false);
    }
    init();
  }, [fetchSessions, createNewCart]);

  const createSession = useCallback(async (): Promise<string | null> => {
    const res = await fetch("/api/cart", { method: "POST" });
    if (!res.ok) return null;
    const newCart: CartSessionData = await res.json();
    setSessions((prev) => [...prev, newCart]);
    setActiveCartId(newCart.id);
    localStorage.setItem(ACTIVE_CART_KEY, newCart.id);
    return newCart.id;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveCartId(id);
    localStorage.setItem(ACTIVE_CART_KEY, id);
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
    if (!res.ok) return;

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (id === activeCartId) {
        if (remaining.length > 0) {
          setActiveCartId(remaining[0].id);
          localStorage.setItem(ACTIVE_CART_KEY, remaining[0].id);
        } else {
          // Will trigger createNewCart via the empty-sessions guard below
          setActiveCartId(null);
          localStorage.removeItem(ACTIVE_CART_KEY);
        }
      }
      return remaining;
    });
  }, [activeCartId]);

  // If all sessions deleted, auto-create a new one
  useEffect(() => {
    if (!isLoading && sessions.length === 0 && activeCartId === null) {
      createNewCart([]);
    }
  }, [sessions.length, activeCartId, isLoading, createNewCart]);

  // Debounced sync: merges partial payloads, sends all at once
  const syncToDb = useCallback((id: string, data: SyncPayload) => {
    pendingSyncRef.current = { ...pendingSyncRef.current, ...data };
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const payload = pendingSyncRef.current;
      pendingSyncRef.current = {};
      await fetch(`/api/cart/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...payload } : s))
      );
    }, 500);
  }, []);

  return {
    sessions,
    activeCartId,
    activeSession,
    isLoading,
    createSession,
    switchSession,
    deleteSession,
    syncToDb,
  };
}
```

- [ ] **Step 2: Type check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git -C /opt/kasir add hooks/use-cart-session.ts
git -C /opt/kasir commit -m "feat: tambah hook useCartSession untuk multi-cart management"
```

---

## Task 5: Komponen — CartPanel

**Files:**
- Create: `components/kasir/cart-panel.tsx`

- [ ] **Step 1: Pastikan direktori ada**

```bash
mkdir -p /opt/kasir/components/kasir
```

- [ ] **Step 2: Buat komponen CartPanel**

Buat `components/kasir/cart-panel.tsx`:

```typescript
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
                    {s.items.length} item &middot; {formatRupiah(total)} &middot; {timeAgo(s.createdAt)}
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
```

- [ ] **Step 3: Type check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -30
```

Expected: tidak ada error.

- [ ] **Step 4: Commit**

```bash
git -C /opt/kasir add components/kasir/cart-panel.tsx
git -C /opt/kasir commit -m "feat: tambah komponen CartPanel untuk multi-cart UI"
```

---

## Task 6: Integrasi ke Kasir Page

**Files:**
- Modify: `app/(dashboard)/kasir/page.tsx`

- [ ] **Step 1: Update imports**

Di `app/(dashboard)/kasir/page.tsx`, tambah import berikut setelah baris import yang sudah ada:

```typescript
import { useRef } from "react"; // tambah useRef ke destructure yang sudah ada
import { useCartSession, type CartItem } from "@/hooks/use-cart-session";
import { CartPanel, CartPanelButton } from "@/components/kasir/cart-panel";
```

Catatan: `useRef` sudah ada di import `{ useState, useEffect, useCallback }` — tambah saja `useRef` ke dalam destructure tersebut.

Hapus interface `CartItem` yang ada di baris 19 karena sekarang di-import dari hook.

- [ ] **Step 2: Tambah hook dan state baru**

Di dalam fungsi `KasirPage()`, setelah baris `const { toast } = useToast();`, tambah:

```typescript
const {
  sessions,
  activeCartId,
  activeSession,
  isLoading: sessionLoading,
  createSession,
  switchSession,
  deleteSession,
  syncToDb,
} = useCartSession();

const [isPanelOpen, setIsPanelOpen] = useState(false);
const isSwitchingRef = useRef(false);
```

- [ ] **Step 3: Tambah effect — restore state saat session aktif berganti**

Tambah effect berikut setelah `useEffect(() => { loadData(); }, [loadData]);`:

```typescript
// Restore cart state when active session changes
useEffect(() => {
  if (!activeSession || sessionLoading) return;
  isSwitchingRef.current = true;
  setCart(activeSession.items);
  setDiscountAmount(
    activeSession.discountAmount > 0 ? String(activeSession.discountAmount) : ""
  );
  setDiscountReason(activeSession.discountReason ?? "");

  if (activeSession.customerId) {
    setLoadingCustomer(true);
    fetch(`/api/pelanggan/${activeSession.customerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setSelectedCustomer(c ?? null))
      .catch(() => setSelectedCustomer(null))
      .finally(() => {
        setLoadingCustomer(false);
        isSwitchingRef.current = false;
      });
  } else {
    setSelectedCustomer(null);
    isSwitchingRef.current = false;
  }
}, [activeCartId, sessionLoading]); // hanya trigger saat cart ID berganti
```

- [ ] **Step 4: Tambah effect — sync state ke DB saat berubah**

Tambah setelah effect restore di atas:

```typescript
// Sync all cart state to DB (debounced 500ms)
// isSwitchingRef guards against syncing during session restore
useEffect(() => {
  if (isSwitchingRef.current || !activeCartId || sessionLoading) return;
  syncToDb(activeCartId, {
    customerId: selectedCustomer?.id ?? null,
    items: cart,
    discountAmount: parseFloat(discountAmount || "0"),
    discountReason: discountReason || null,
  });
}, [cart, selectedCustomer, discountAmount, discountReason, activeCartId, syncToDb, sessionLoading]);

- [ ] **Step 5: Update handleCheckout — hapus session setelah bayar**

Di dalam fungsi `handleCheckout`, ganti blok di dalam `if (res.ok)` — setelah baris `await loadData();` dan sebelum `toast({ title: "Transaksi berhasil!" });`, tambah:

```typescript
if (activeCartId) await deleteSession(activeCartId);
```

Sehingga blok if (res.ok) menjadi:
```typescript
if (res.ok) {
  const trx = await res.json();
  const trxWithUnit = {
    ...trx,
    items: trx.items.map((item: { productVariantId: string }) => ({
      ...item,
      unit: cart.find((c) => c.variantId === item.productVariantId)?.unit ?? "pcs",
    })),
  };
  setLastTransaction(trxWithUnit);
  setCart([]);
  setDiscountAmount("");
  setDiscountReason("");
  setPaymentAmount("");
  setCheckoutDialogOpen(false);
  setReceiptDialogOpen(true);
  await loadData();
  if (activeCartId) await deleteSession(activeCartId);
  toast({ title: "Transaksi berhasil!" });
}
```

- [ ] **Step 6: Tambah CartPanelButton ke header**

Di dalam JSX, cari bagian header dengan `<Select onValueChange={handleSelectCustomer}>` (sekitar baris 224). Tambah `CartPanelButton` setelah elemen `<div className="w-56">` yang berisi Select:

```tsx
<CartPanelButton
  count={sessions.length}
  onClick={() => setIsPanelOpen(true)}
/>
```

Sehingga baris-baris di area header produk menjadi:
```tsx
<div className="flex items-center gap-3">
  <div className="relative flex-1">
    <Search ... />
    <Input ... />
  </div>
  <div className="w-56">
    <Select ...>...</Select>
  </div>
  <CartPanelButton
    count={sessions.length}
    onClick={() => setIsPanelOpen(true)}
  />
  {loadingCustomer && <Loader2 ... />}
  {selectedCustomer && <Badge ... />}
</div>
```

- [ ] **Step 7: Tambah CartPanel component ke JSX**

Tepat sebelum `{/* Dialog Checkout */}` (baris sekitar 369), tambah:

```tsx
<CartPanel
  open={isPanelOpen}
  onOpenChange={setIsPanelOpen}
  sessions={sessions}
  activeCartId={activeCartId}
  onSwitch={(id) => { switchSession(id); setIsPanelOpen(false); }}
  onDelete={deleteSession}
  onCreateNew={async () => { await createSession(); setIsPanelOpen(false); }}
/>
```

- [ ] **Step 8: Build check**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -40
```

Expected: tidak ada error TypeScript.

```bash
cd /opt/kasir && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Step 9: Commit**

```bash
git -C /opt/kasir add app/\(dashboard\)/kasir/page.tsx
git -C /opt/kasir commit -m "feat: integrasi multi-cart ke halaman kasir"
```

---

## Smoke Test Manual

Setelah deploy atau `docker compose up --build`, verifikasi:

1. **Buka `/kasir`** → tombol `Keranjang Aktif` muncul di header
2. **Tambah produk** ke keranjang → buka panel → 1 sesi muncul, item count benar
3. **Buat keranjang baru** via panel → panel tutup, keranjang kosong aktif (badge angka 2 di tombol)
4. **Buka panel** → 2 sesi terlihat, yang aktif punya bullet biru
5. **Klik Buka** di sesi pertama → pindah ke sesi pertama, item tersebut
6. **Tutup browser, buka lagi** → sesi pertama masih aktif (localStorage + DB)
7. **Ganti device** (buka URL di HP/tab lain) → buka panel → pilih sesi → keranjang terbuka
8. **Batalkan sesi** → klik ×, konfirmasi → sesi hilang dari panel
9. **Batalkan sesi terakhir** → sesi baru kosong otomatis dibuat
10. **Proses bayar** → transaksi tersimpan → keranjang yang dibayar hilang dari panel

---

## Deploy

Push ke `main` → GitHub Actions otomatis build + `prisma migrate deploy` + restart container:

```bash
git -C /opt/kasir push origin main
```
