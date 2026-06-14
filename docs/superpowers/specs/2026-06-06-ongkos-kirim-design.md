# Fitur Ongkos Kirim

**Tanggal:** 2026-06-06
**Status:** Approved

## Ringkasan

Menambah kolom `shippingCost` (ongkos kirim) pada transaksi kasir. Diisi manual oleh kasir tiap transaksi, muncul di struk thermal dan A4, posisi setelah diskon sebelum total.

## Formula Total

```
totalAmount = subtotal - discountAmount + shippingCost
changeAmount = paymentAmount - totalAmount
```

Sebelumnya: `totalAmount = subtotal - discountAmount`

## Database

### Transaction
Tambah field:
```prisma
shippingCost  Decimal  @default(0) @db.Decimal(15, 2)
```

### CartSession
Tambah field:
```prisma
shippingCost  Float  @default(0)
```

Migration: `ALTER TABLE` dengan `DEFAULT 0` — aman untuk data lama (ongkir = 0 otomatis).

## API

### `/api/transaksi` (POST)
- Terima `shippingCost` dari body (opsional, default 0)
- Hitung ulang `totalAmount = subtotal - discountAmount + shippingCost`
- Simpan `shippingCost` ke record Transaction

### `/api/cart` (POST) & `/api/cart/[id]` (PATCH)
- Terima dan simpan `shippingCost` ke CartSession
- Digunakan untuk persist state ongkir antar reload

## UI Kasir (`app/(dashboard)/kasir/page.tsx`)

Tambah state `shippingCost: number` (default 0).

Tampilan ringkasan order (setelah baris diskon):
```
Subtotal         Rp 150.000
Diskon (alasan)  -Rp 10.000
Ongkos Kirim     [input]       ← baru
─────────────────────────────
TOTAL            Rp 145.000
```

- Input type number, placeholder "0", selalu tampil (kasir bisa isi kapan saja)
- Kirim ke cart API saat nilai berubah (debounce atau onBlur)
- Sertakan dalam payload POST `/api/transaksi`

## Halaman Riwayat (`app/(dashboard)/riwayat/page.tsx`)

Tambah `shippingCost` ke interface `Transaction`.

Di detail transaksi, tampilkan baris ongkir **conditional** (hanya jika `shippingCost > 0`):
```
Subtotal         Rp 150.000
Diskon           -Rp 10.000
Ongkos Kirim     +Rp 5.000    ← conditional
TOTAL            Rp 145.000
```

## PDF (`lib/pdf.ts`)

Tambah `shippingCost` ke interface `TransactionData`.

**Thermal & A4:** Tambah baris `Ongkos Kirim` setelah baris diskon, **conditional** (hanya jika > 0):
```
...(Number(trx.shippingCost) > 0
  ? [["Ongkos Kirim", `+${formatRupiah(trx.shippingCost)}`]]
  : []),
```

**Surat jalan:** Tidak berubah.

## File yang Berubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah `shippingCost` di `Transaction` dan `CartSession` |
| `prisma/migrations/...` | Migration baru |
| `app/api/transaksi/route.ts` | Terima `shippingCost`, update formula total |
| `app/api/cart/route.ts` | Terima dan simpan `shippingCost` |
| `app/api/cart/[id]/route.ts` | Terima dan simpan `shippingCost` |
| `hooks/use-cart-session.ts` | Tambah `shippingCost` ke `CartSessionData` interface |
| `app/(dashboard)/kasir/page.tsx` | Tambah state + input ongkir |
| `app/(dashboard)/riwayat/page.tsx` | Tambah field + tampilan conditional |
| `lib/pdf.ts` | Tambah baris ongkir conditional di thermal & A4 |

## Out of Scope

- Ongkir default per pelanggan
- Preset daftar ongkir
- Ongkir di surat jalan PDF
- Ongkir di laporan/grafik (totalAmount sudah include ongkir otomatis)
