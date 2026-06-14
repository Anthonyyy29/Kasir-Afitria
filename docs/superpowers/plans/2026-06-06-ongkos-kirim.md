# Ongkos Kirim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah field `shippingCost` (ongkos kirim) pada transaksi — diisi manual oleh kasir, masuk ke kalkulasi total, tampil di struk thermal & A4.

**Architecture:** Field baru `shippingCost` ditambah di model `Transaction` (Prisma) dan `CartSession` (untuk persist antar reload). Formula total diubah: `totalAmount = subtotal - discountAmount + shippingCost`. UI kasir dapat input ongkir setelah baris subtotal. Riwayat dan PDF menampilkan ongkir secara conditional (hanya jika > 0).

**Tech Stack:** Next.js App Router (TypeScript), Prisma 6, PostgreSQL, jsPDF + jspdf-autotable

---

## File yang Berubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `shippingCost` di `Transaction` dan `CartSession` |
| `app/api/transaksi/route.ts` | Terima `shippingCost`, update formula totalAmount |
| `app/api/cart/[id]/route.ts` | Terima `shippingCost` di PUT body |
| `hooks/use-cart-session.ts` | Tambah `shippingCost` ke `CartSessionData` dan `SyncPayload` |
| `app/(dashboard)/kasir/page.tsx` | State + input ongkir, restore dari session, sync ke DB, kirim saat checkout |
| `app/(dashboard)/riwayat/page.tsx` | Tambah `shippingCost` ke interface `Transaction`, tampilkan conditional |
| `lib/pdf.ts` | Tambah `shippingCost` ke `TransactionData`, baris conditional di thermal & A4 |

---

## Task 1: Schema & Migration

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Tambah `shippingCost` di model `Transaction`**

Di `prisma/schema.prisma`, cari model `Transaction` dan tambah field setelah `discountReason`:

```prisma
model Transaction {
  id                String            @id @default(cuid())
  transactionNumber String            @unique
  kasirId           String
  customerId        String?
  subtotal          Decimal           @db.Decimal(15, 2)
  discountAmount    Decimal           @default(0) @db.Decimal(15, 2)
  discountReason    String?
  shippingCost      Decimal           @default(0) @db.Decimal(15, 2)
  totalAmount       Decimal           @db.Decimal(15, 2)
  paymentAmount     Decimal           @db.Decimal(15, 2)
  changeAmount      Decimal           @db.Decimal(15, 2)
  deletedAt         DateTime?
  createdAt         DateTime          @default(now())
  kasir             User              @relation(fields: [kasirId], references: [id])
  customer          Customer?         @relation(fields: [customerId], references: [id], onDelete: SetNull)
  items             TransactionItem[]

  @@index([deletedAt])
}
```

- [ ] **Step 2: Tambah `shippingCost` di model `CartSession`**

Di `prisma/schema.prisma`, cari model `CartSession` dan tambah field setelah `discountReason`:

```prisma
model CartSession {
  id             String    @id @default(cuid())
  customerId     String?
  kasirId        String
  items          Json      @default("[]")
  discountAmount Float     @default(0)
  discountReason String?
  shippingCost   Float     @default(0)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  customer       Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  kasir          User      @relation(fields: [kasirId], references: [id])
}
```

- [ ] **Step 3: Jalankan migration**

```bash
cd /opt/kasir && npx prisma migrate dev --name add_shipping_cost
```

Expected output:
```
✔ Generated Prisma Client
The following migration(s) have been applied:
...add_shipping_cost
```

- [ ] **Step 4: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada output error (atau hanya warning yang tidak berkaitan).

- [ ] **Step 5: Commit**

```bash
cd /opt/kasir && git add prisma/schema.prisma prisma/migrations/ && git commit -m "feat: add shippingCost field to Transaction and CartSession"
```

---

## Task 2: Update API Transaksi

**Files:**
- Modify: `app/api/transaksi/route.ts`

- [ ] **Step 1: Update POST handler untuk terima `shippingCost`**

Di `app/api/transaksi/route.ts`, ganti bagian POST handler berikut:

Ganti:
```ts
const { customerId, items, discountAmount, discountReason, paymentAmount } = body;

const subtotal = items.reduce(
  (sum: number, item: { priceAtSale: number; quantity: number }) =>
    sum + item.priceAtSale * item.quantity,
  0
);
const totalAmount = subtotal - (discountAmount ?? 0);
const changeAmount = paymentAmount - totalAmount;
```

Dengan:
```ts
const { customerId, items, discountAmount, discountReason, shippingCost, paymentAmount } = body;

const subtotal = items.reduce(
  (sum: number, item: { priceAtSale: number; quantity: number }) =>
    sum + item.priceAtSale * item.quantity,
  0
);
const totalAmount = subtotal - (discountAmount ?? 0) + (shippingCost ?? 0);
const changeAmount = paymentAmount - totalAmount;
```

- [ ] **Step 2: Simpan `shippingCost` ke record transaksi**

Di dalam `tx.transaction.create({ data: { ... } })`, tambah `shippingCost` setelah `discountReason`:

Ganti:
```ts
data: {
  transactionNumber: generateTransactionNumber(),
  kasirId: session.user.id,
  customerId,
  subtotal,
  discountAmount: discountAmount ?? 0,
  discountReason: discountReason || null,
  totalAmount,
  paymentAmount,
  changeAmount,
```

Dengan:
```ts
data: {
  transactionNumber: generateTransactionNumber(),
  kasirId: session.user.id,
  customerId,
  subtotal,
  discountAmount: discountAmount ?? 0,
  discountReason: discountReason || null,
  shippingCost: shippingCost ?? 0,
  totalAmount,
  paymentAmount,
  changeAmount,
```

- [ ] **Step 3: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error baru.

- [ ] **Step 4: Commit**

```bash
cd /opt/kasir && git add app/api/transaksi/route.ts && git commit -m "feat: accept and store shippingCost in transaksi API"
```

---

## Task 3: Update API Cart

**Files:**
- Modify: `app/api/cart/[id]/route.ts`

- [ ] **Step 1: Tambah `shippingCost` ke PUT body parsing**

Di `app/api/cart/[id]/route.ts`, ganti bagian PUT handler:

Ganti:
```ts
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
```

Dengan:
```ts
const body = await req.json();
const { customerId, items, discountAmount, discountReason, shippingCost } = body;

const updated = await prisma.cartSession.update({
  where: { id },
  data: {
    ...(customerId !== undefined && { customerId: customerId ?? null }),
    ...(items !== undefined && { items }),
    ...(discountAmount !== undefined && { discountAmount }),
    ...(discountReason !== undefined && { discountReason: discountReason ?? null }),
    ...(shippingCost !== undefined && { shippingCost }),
  },
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
cd /opt/kasir && git add "app/api/cart/[id]/route.ts" && git commit -m "feat: accept shippingCost in cart session PUT"
```

---

## Task 4: Update Hook `use-cart-session`

**Files:**
- Modify: `hooks/use-cart-session.ts`

- [ ] **Step 1: Tambah `shippingCost` ke `CartSessionData` dan `SyncPayload`**

Di `hooks/use-cart-session.ts`, ganti kedua interface:

Ganti:
```ts
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
```

Dengan:
```ts
export interface CartSessionData {
  id: string;
  customerId: string | null;
  kasirId: string;
  items: CartItem[];
  discountAmount: number;
  discountReason: string | null;
  shippingCost: number;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
}

interface SyncPayload {
  customerId?: string | null;
  items?: CartItem[];
  discountAmount?: number;
  discountReason?: string | null;
  shippingCost?: number;
}
```

- [ ] **Step 2: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error baru.

- [ ] **Step 3: Commit**

```bash
cd /opt/kasir && git add hooks/use-cart-session.ts && git commit -m "feat: add shippingCost to CartSessionData and SyncPayload types"
```

---

## Task 5: Update UI Kasir

**Files:**
- Modify: `app/(dashboard)/kasir/page.tsx`

- [ ] **Step 1: Tambah state `shippingCost`**

Di `app/(dashboard)/kasir/page.tsx`, setelah baris `const [paymentAmount, setPaymentAmount] = useState("");` (sekitar baris 43), tambah:

```ts
const [shippingCost, setShippingCost] = useState(0);
```

- [ ] **Step 2: Update kalkulasi `total`**

Ganti:
```ts
const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
const total = subtotal;
```

Dengan:
```ts
const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
const total = subtotal + shippingCost;
```

- [ ] **Step 3: Restore `shippingCost` saat switch session**

Di `useEffect` yang mendengarkan `activeCartId` (sekitar baris 62-81), tambah restore shippingCost setelah `setCart(activeSession.items)`:

Ganti:
```ts
  useEffect(() => {
    if (!activeSession || sessionLoading) return;
    isSwitchingRef.current = true;
    setCart(activeSession.items);
```

Dengan:
```ts
  useEffect(() => {
    if (!activeSession || sessionLoading) return;
    isSwitchingRef.current = true;
    setCart(activeSession.items);
    setShippingCost(activeSession.shippingCost ?? 0);
```

- [ ] **Step 4: Sertakan `shippingCost` dalam sync ke DB**

Di `useEffect` yang memanggil `syncToDb` (sekitar baris 83-91), ganti:

```ts
  useEffect(() => {
    if (isSwitchingRef.current || !activeCartId || sessionLoading) return;
    syncToDb(activeCartId, {
      customerId: selectedCustomer?.id ?? null,
      items: cart,
      discountAmount: 0,
      discountReason: null,
    });
  }, [cart, selectedCustomer, activeCartId, syncToDb, sessionLoading]);
```

Dengan:

```ts
  useEffect(() => {
    if (isSwitchingRef.current || !activeCartId || sessionLoading) return;
    syncToDb(activeCartId, {
      customerId: selectedCustomer?.id ?? null,
      items: cart,
      discountAmount: 0,
      discountReason: null,
      shippingCost,
    });
  }, [cart, selectedCustomer, shippingCost, activeCartId, syncToDb, sessionLoading]);
```

- [ ] **Step 5: Tambah input ongkir di UI summary**

Di section `{/* Summary & Checkout */}` (sekitar baris 422-435), ganti:

```tsx
<div className="space-y-1 text-sm">
  <div className="flex justify-between text-gray-600">
    <span>Subtotal</span>
    <span>{formatRupiah(subtotal)}</span>
  </div>
</div>

<div className="border-t pt-2 flex justify-between font-bold text-base">
  <span>Total</span>
  <span className="text-blue-600">{formatRupiah(total)}</span>
</div>
```

Dengan:

```tsx
<div className="space-y-1 text-sm">
  <div className="flex justify-between text-gray-600">
    <span>Subtotal</span>
    <span>{formatRupiah(subtotal)}</span>
  </div>
  <div className="flex justify-between items-center text-gray-600">
    <span>Ongkos Kirim</span>
    <input
      type="number"
      min="0"
      value={shippingCost || ""}
      onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
      placeholder="0"
      className="w-32 text-right text-sm border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  </div>
</div>

<div className="border-t pt-2 flex justify-between font-bold text-base">
  <span>Total</span>
  <span className="text-blue-600">{formatRupiah(total)}</span>
</div>
```

- [ ] **Step 6: Sertakan `shippingCost` dalam payload checkout**

Di `handleCheckout()`, ganti:

```ts
body: JSON.stringify({
  customerId: selectedCustomer.id,
  items: cart.map((i) => ({
    productVariantId: i.variantId,
    productName: i.productName,
    variantInfo: i.variantInfo,
    quantity: i.quantity,
    priceAtSale: i.price,
  })),
  discountAmount: 0,
  discountReason: null,
  paymentAmount: payment,
}),
```

Dengan:

```ts
body: JSON.stringify({
  customerId: selectedCustomer.id,
  items: cart.map((i) => ({
    productVariantId: i.variantId,
    productName: i.productName,
    variantInfo: i.variantInfo,
    quantity: i.quantity,
    priceAtSale: i.price,
  })),
  discountAmount: 0,
  discountReason: null,
  shippingCost,
  paymentAmount: payment,
}),
```

- [ ] **Step 7: Reset `shippingCost` setelah checkout berhasil**

Di `handleCheckout()`, setelah `setCart([]);` dan `setPaymentAmount("");`, tambah:

```ts
setShippingCost(0);
```

- [ ] **Step 8: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error baru.

- [ ] **Step 9: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/kasir/page.tsx" && git commit -m "feat: add ongkos kirim input to kasir page"
```

---

## Task 6: Update Halaman Riwayat

**Files:**
- Modify: `app/(dashboard)/riwayat/page.tsx`

- [ ] **Step 1: Tambah `shippingCost` ke interface `Transaction`**

Di `app/(dashboard)/riwayat/page.tsx`, ganti interface `Transaction`:

Ganti:
```ts
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
```

Dengan:
```ts
interface Transaction {
  id: string;
  transactionNumber: string;
  createdAt: string;
  customer: { name: string; phone?: string | null } | null;
  kasir: { name: string };
  subtotal: string;
  discountAmount: string;
  discountReason?: string | null;
  shippingCost: string;
  totalAmount: string;
  paymentAmount: string;
  changeAmount: string;
  items: TrxItem[];
}
```

- [ ] **Step 2: Tambah baris ongkir conditional di detail transaksi**

Di section `{/* Summary */}` (sekitar baris 330-352), ganti:

```tsx
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
```

Dengan:

```tsx
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
{Number(selectedTrx.shippingCost) > 0 && (
  <div className="flex justify-between text-gray-700">
    <span>Ongkos Kirim</span>
    <span>+{formatRupiah(selectedTrx.shippingCost)}</span>
  </div>
)}
<div className="flex justify-between font-semibold text-base border-t pt-1">
```

- [ ] **Step 3: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error baru.

- [ ] **Step 4: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/riwayat/page.tsx" && git commit -m "feat: show ongkos kirim in riwayat detail"
```

---

## Task 7: Update PDF

**Files:**
- Modify: `lib/pdf.ts`

- [ ] **Step 1: Tambah `shippingCost` ke interface `TransactionData`**

Di `lib/pdf.ts`, ganti interface `TransactionData`:

Ganti:
```ts
interface TransactionData {
  transactionNumber: string;
  createdAt: string;
  kasir: { name: string };
  customer: { name: string; phone?: string | null; address?: string | null };
  items: TransactionItem[];
  subtotal: string | number;
  discountAmount: string | number;
  discountReason?: string | null;
  totalAmount: string | number;
  paymentAmount: string | number;
  changeAmount: string | number;
}
```

Dengan:
```ts
interface TransactionData {
  transactionNumber: string;
  createdAt: string;
  kasir: { name: string };
  customer: { name: string; phone?: string | null; address?: string | null };
  items: TransactionItem[];
  subtotal: string | number;
  discountAmount: string | number;
  discountReason?: string | null;
  shippingCost?: string | number;
  totalAmount: string | number;
  paymentAmount: string | number;
  changeAmount: string | number;
}
```

- [ ] **Step 2: Tambah baris ongkir di thermal PDF (`generateReceiptPDF`)**

Di `generateReceiptPDF`, ganti bagian `const rows`. Logika: tampilkan Subtotal jika diskon **atau** ongkir > 0:

Ganti:
```ts
const rows = [
  ...(Number(trx.discountAmount) > 0
    ? [
        ["Subtotal", formatRupiah(trx.subtotal)],
        [`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`],
      ]
    : []),
  ["Total Qty", `${totalQty} item`],
  ["TOTAL", formatRupiah(trx.totalAmount)],
];
```

Dengan:
```ts
const hasBreakdown = Number(trx.discountAmount) > 0 || Number(trx.shippingCost ?? 0) > 0;
const rows = [
  ...(hasBreakdown ? [["Subtotal", formatRupiah(trx.subtotal)]] : []),
  ...(Number(trx.discountAmount) > 0
    ? [[`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`]]
    : []),
  ...(Number(trx.shippingCost ?? 0) > 0
    ? [["Ongkos Kirim", `+${formatRupiah(trx.shippingCost!)}`]]
    : []),
  ["Total Qty", `${totalQty} item`],
  ["TOTAL", formatRupiah(trx.totalAmount)],
];
```

- [ ] **Step 3: Tambah baris ongkir di nota A4 (`generateNotaPDF`)**

Di `generateNotaPDF`, ganti bagian `const summaryRows`. Logika yang sama: tampilkan Subtotal jika diskon **atau** ongkir > 0:

Ganti:
```ts
const summaryRows: [string, string, boolean][] = [
  ...(Number(trx.discountAmount) > 0
    ? [
        ["Subtotal", formatRupiah(trx.subtotal), false] as [string, string, boolean],
        [`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`, false] as [string, string, boolean],
      ]
    : []),
  ["Total Qty", `${totalQtyNota} item`, false],
  ["TOTAL", formatRupiah(trx.totalAmount), true],
];
```

Dengan:
```ts
const hasBreakdownNota = Number(trx.discountAmount) > 0 || Number(trx.shippingCost ?? 0) > 0;
const summaryRows: [string, string, boolean][] = [
  ...(hasBreakdownNota ? [["Subtotal", formatRupiah(trx.subtotal), false] as [string, string, boolean]] : []),
  ...(Number(trx.discountAmount) > 0
    ? [[`Diskon${trx.discountReason ? ` (${trx.discountReason})` : ""}`, `-${formatRupiah(trx.discountAmount)}`, false] as [string, string, boolean]]
    : []),
  ...(Number(trx.shippingCost ?? 0) > 0
    ? [["Ongkos Kirim", `+${formatRupiah(trx.shippingCost!)}`, false] as [string, string, boolean]]
    : []),
  ["Total Qty", `${totalQtyNota} item`, false],
  ["TOTAL", formatRupiah(trx.totalAmount), true],
];
```

- [ ] **Step 4: Verifikasi TypeScript compile**

```bash
cd /opt/kasir && npx tsc --noEmit 2>&1 | head -20
```

Expected: tidak ada error.

- [ ] **Step 5: Commit**

```bash
cd /opt/kasir && git add lib/pdf.ts && git commit -m "feat: add ongkos kirim row to thermal and A4 PDF"
```

---

## Verifikasi Akhir

- [ ] **Build production**

```bash
cd /opt/kasir && npm run build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully`

- [ ] **Test manual di browser**
  1. Buka halaman Kasir
  2. Pilih pelanggan, tambah produk ke keranjang
  3. Input ongkos kirim (misal: 15000) → pastikan Total berubah
  4. Klik Bayar → input nominal → checkout
  5. Cetak Struk (thermal) → verifikasi baris "Ongkos Kirim" muncul
  6. Cetak Nota (A4) → verifikasi baris "Ongkos Kirim" muncul
  7. Buka Riwayat → klik transaksi tadi → verifikasi baris "Ongkos Kirim" muncul di detail
  8. Buat transaksi tanpa ongkir → verifikasi baris "Ongkos Kirim" **tidak** muncul di riwayat & PDF
