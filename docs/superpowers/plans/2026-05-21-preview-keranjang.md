# Preview Keranjang Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah tombol "Preview" di panel keranjang yang membuka dialog read-only berisi daftar item, total qty, dan total harga untuk ditunjukkan ke pelanggan sebelum transaksi.

**Architecture:** Perubahan hanya di satu file (`app/(dashboard)/kasir/page.tsx`) — tambah state `previewOpen`, kalkulasi `totalQty`, tombol Preview, dan satu Dialog baru. Tidak ada API call, tidak ada file baru.

**Tech Stack:** Next.js, React, shadcn/ui (Dialog, Table, Button sudah diimport), lucide-react (tambah `Eye`)

---

### Task 1: Tambah state, kalkulasi, dan tombol Preview

**Files:**
- Modify: `app/(dashboard)/kasir/page.tsx`

- [ ] **Step 1: Tambah import `Eye` dari lucide-react**

Ubah baris 12:
```tsx
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Receipt, Loader2, UserCheck, Truck } from "lucide-react";
```
Menjadi:
```tsx
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Receipt, Loader2, UserCheck, Truck, Eye } from "lucide-react";
```

- [ ] **Step 2: Tambah state `previewOpen`**

Setelah baris `const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);`, tambahkan:
```tsx
const [previewOpen, setPreviewOpen] = useState(false);
```

- [ ] **Step 3: Tambah kalkulasi `totalQty`**

Setelah baris `const total = subtotal;`, tambahkan:
```tsx
const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
```

- [ ] **Step 4: Tambah tombol Preview di atas tombol Bayar**

Ganti blok tombol Bayar:
```tsx
            <Button
              className="w-full gap-2"
              disabled={cart.length === 0 || !selectedCustomer}
              onClick={() => { setPaymentAmount(String(total)); setCheckoutDialogOpen(true); }}
            >
              <Receipt className="h-4 w-4" />
              Bayar
            </Button>
```
Menjadi:
```tsx
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                disabled={cart.length === 0}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={cart.length === 0 || !selectedCustomer}
                onClick={() => { setPaymentAmount(String(total)); setCheckoutDialogOpen(true); }}
              >
                <Receipt className="h-4 w-4" />
                Bayar
              </Button>
            </div>
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/kasir/page.tsx
git commit -m "feat: tambah tombol preview di panel keranjang"
```

---

### Task 2: Tambah Dialog Preview

**Files:**
- Modify: `app/(dashboard)/kasir/page.tsx`

- [ ] **Step 1: Tambah dialog preview setelah CartPanel closing tag**

Cari blok `<CartPanel ... />` (setelah `onCreateNew`), lalu setelah tag penutupnya tambahkan dialog berikut:

```tsx
      {/* Dialog Preview Keranjang */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Pesanan
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedCustomer ? selectedCustomer.name : "Tanpa pelanggan"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">No</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center w-16">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={item.variantId}>
                    <TableCell className="py-2 text-gray-400">{idx + 1}</TableCell>
                    <TableCell className="py-2">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.variantInfo && <p className="text-xs text-gray-500">{item.variantInfo}</p>}
                    </TableCell>
                    <TableCell className="py-2 text-center text-sm">{item.quantity}</TableCell>
                    <TableCell className="py-2 text-right text-sm">{formatRupiah(item.price)}</TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium">{formatRupiah(item.price * item.quantity)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold bg-gray-50">
                  <TableCell colSpan={2} className="py-2 text-sm">Total</TableCell>
                  <TableCell className="py-2 text-center text-sm">{totalQty}</TableCell>
                  <TableCell />
                  <TableCell className="py-2 text-right text-sm text-blue-600">{formatRupiah(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 2: Commit dan push**

```bash
git add app/\(dashboard\)/kasir/page.tsx
git commit -m "feat: dialog preview pesanan dengan total qty dan total harga"
git push origin main
```
