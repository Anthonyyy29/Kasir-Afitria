# Design: Halaman Riwayat Pesanan

**Date:** 2026-05-20  
**Status:** Approved

## Overview

Halaman baru `/riwayat` di sidebar dashboard untuk melihat semua transaksi yang sudah selesai, beserta kemampuan melihat detail dan mencetak ulang dokumen (nota, struk, surat jalan).

## Requirements

- Semua role bisa akses: Admin melihat semua transaksi, Kasir hanya melihat transaksi miliknya
- Search berdasarkan nomor transaksi atau nama pelanggan
- Filter rentang tanggal (default 30 hari terakhir)
- Lihat detail transaksi (daftar item, harga, subtotal, total, bayar, kembali)
- Cetak ulang 3 dokumen: Download Nota (PDF A5), Cetak Struk (thermal 80mm + auto-print), Cetak Surat Jalan (auto-print)
- Tampilan responsive (mobile: card view, desktop: tabel)

## Architecture

### Backend

API `/api/transaksi` (GET) sudah ada — tambahkan parameter `search` untuk filter by `transactionNumber` atau `customer.name` menggunakan Prisma `OR` + `contains`.

```
GET /api/transaksi?start=...&end=...&search=...
```

API `/api/transaksi/[id]` (GET) sudah ada untuk detail per transaksi.

### Frontend

**File baru:**
- `app/(dashboard)/riwayat/page.tsx` — halaman utama

**File diubah:**
- `app/api/transaksi/route.ts` — tambah filter `search`
- `components/layout/sidebar.tsx` (atau layout) — tambah menu item "Riwayat Pesanan"

### Data Flow

1. Page mount → fetch `/api/transaksi?start=<30 hari lalu>&end=<hari ini>`
2. User search/filter → re-fetch dengan params baru
3. Klik tombol detail → fetch `/api/transaksi/[id]` → tampilkan modal
4. Klik cetak → import `lib/pdf.ts` → generate + auto-print atau download

## UI Design

### Halaman Utama

```
Riwayat Pesanan

[🔍 Cari no. transaksi / pelanggan...]
[Dari: ____] [Sampai: ____] [Cari]

| No. Transaksi | Pelanggan | Kasir | Tanggal | Total | Aksi |
|---------------|-----------|-------|---------|-------|------|
| TRX-001       | Budi      | Admin | ...     | 150rb | [👁] |

Mobile: card view per transaksi
```

### Modal Detail

```
Detail Transaksi TRX-001              [✕]
Tanggal: ..  Kasir: ..  Pelanggan: ..

| Produk       | Qty | Harga    | Subtotal  |
|--------------|-----|----------|-----------|
| Kaus Kaki L  | 2   | Rp15.000 | Rp30.000  |

Subtotal: ..  Diskon: ..  Total: ..
Bayar: ..  Kembali: ..

[⬇ Download Nota]  [🖨 Cetak Struk]  [📋 Surat Jalan]
```

## Reuse

- `lib/pdf.ts`: `generateNotaPDF`, `generateReceiptPDF`, `generateSuratJalanPDF` — tidak perlu diubah
- UI components: `Dialog`, `Table`, `Badge`, `Button`, `Input`, `Card` dari shadcn/ui sudah tersedia
- `formatRupiah`, `formatDate` dari `lib/utils`

## Out of Scope

- Hapus / void transaksi dari halaman riwayat
- Export Excel (sudah ada di Laporan)
- Pagination (sudah ada limit 200 di API)
