---
title: Preview Keranjang
date: 2026-05-21
status: approved
---

# Preview Keranjang

## Tujuan

Kasir dapat menampilkan ringkasan isi keranjang kepada pelanggan sebelum transaksi dikonfirmasi, sehingga kedua pihak dapat melakukan cross-check barang yang dipesan.

## Alur

1. Kasir mengisi keranjang seperti biasa.
2. Kasir menekan tombol **"Preview"** di panel keranjang (di atas tombol Bayar).
3. Dialog preview terbuka — kasir menunjukkan layar ke pelanggan.
4. Pelanggan dan kasir cross-check daftar barang.
5. Kasir menutup dialog, lalu melanjutkan ke Bayar seperti biasa.

## UI

### Tombol Preview
- Posisi: di atas tombol Bayar, di dalam card Summary & Checkout (panel kanan).
- Label: "Preview" dengan ikon `Eye`.
- Disabled jika keranjang kosong.
- Variant: `outline`.

### Dialog Preview
- Judul: "Preview Pesanan"
- Sub-judul: nama pelanggan aktif, atau "Tanpa pelanggan" jika belum dipilih.
- Tabel item:

| No | Nama Produk | Varian | Qty | Harga | Subtotal |
|----|-------------|--------|-----|-------|----------|
| 1  | Kaos Polos  | Merah/L | 3  | Rp 50.000 | Rp 150.000 |

- Baris footer tabel (bold): kolom Qty diisi **total qty** (sum semua item), kolom Subtotal diisi **total harga**.
- Tombol: "Tutup" (menutup dialog, tidak ada aksi lain).
- Read-only — tidak ada edit, hapus, atau aksi transaksi.

## Komponen

Fitur ini sepenuhnya di `app/(dashboard)/kasir/page.tsx`:
- State baru: `previewOpen: boolean`
- Kalkulasi: `totalQty = cart.reduce((s, i) => s + i.quantity, 0)` (sudah tersedia `subtotal`)
- Dialog baru menggunakan komponen `Dialog` yang sudah diimport

Tidak ada komponen baru, tidak ada API call, tidak ada perubahan schema.

## Out of Scope
- Tombol cetak di dialog preview (sudah ada cetak nota setelah transaksi)
- Preview sebagai langkah wajib sebelum Bayar
