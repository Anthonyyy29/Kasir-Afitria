# Design Spec: Search & Sort Feature

**Date:** 2026-05-21  
**Status:** Approved

## Overview

Tambah fitur search dan sort ke semua halaman yang membutuhkan di Kasir Afitria. Search sudah ada di beberapa halaman; spec ini menambah sort dropdown dan memperluas search ke halaman yang belum punya.

## Approach

**Client-side sort** — data sudah di-load penuh ke client saat halaman dibuka. Sort dilakukan di JavaScript tanpa request baru ke server. Cepat, real-time, tidak perlu ubah API endpoint.

## UI Pattern

Toolbar di atas tabel/kartu, sejajar kiri-ke-kanan (responsive):

```
[ Cari...  🔍 ]  [ Filter Kategori ▼ ]  [ Urutkan: Nama A-Z ▼ ]
```

- Gunakan komponen `Input` + `Select` dari shadcn/ui yang sudah ada.
- Di mobile (card view) toolbar sama, hanya wrap ke baris berikutnya.
- Default sort: urutan yang dikembalikan API (tidak mengubah perilaku existing).

## Halaman dan Fitur

### 1. Produk (`/produk`)

**Sudah ada:** Search by nama/kategori (client-side).

**Ditambah:**
- Sort dropdown dengan opsi:
  - Nama A-Z (default)
  - Nama Z-A
  - Stok Total ↑ (terendah ke tertinggi)
  - Stok Total ↓ (tertinggi ke terendah)
  - Jumlah Varian ↑
  - Jumlah Varian ↓
- Filter kategori: Select dropdown "Semua Kategori" + daftar nama kategori. Filter diterapkan **sesudah** search, sebelum sort.

### 2. Pelanggan (`/pelanggan`)

**Sudah ada:** Search by nama/nomor HP (client-side).

**Ditambah:**
- Sort dropdown:
  - Nama A-Z (default)
  - Nama Z-A
  - Transaksi Terbanyak
  - Transaksi Tersedikit

### 3. Riwayat (`/riwayat`)

**Sudah ada:** Search by nomor transaksi/nama pelanggan + filter tanggal (server-side).

**Ditambah:**
- Sort dropdown (client-side, terhadap data yang sudah di-load):
  - Terbaru (default)
  - Terlama
  - Total ↑
  - Total ↓

### 4. Pengguna (`/pengguna`)

**Sudah ada:** Tidak ada search/sort.

**Ditambah:**
- Search by nama (client-side filter)
- Sort dropdown:
  - Nama A-Z
  - Nama Z-A
  - Admin Dulu
  - Kasir Dulu

### 5. Master Data — `MasterDataPage` component

Digunakan oleh 5 halaman: Kategori, Sub-Kategori, Satuan, Warna, Ukuran.

**Sudah ada:** Tidak ada search/sort.

**Ditambah** (ke komponen `MasterDataPage`):
- Search by nama (client-side, real-time)
- Sort dropdown:
  - Nama A-Z
  - Nama Z-A

Karena ini shared component, semua 5 halaman otomatis dapat fitur ini.

## Implementation Plan (garis besar)

### Files yang diubah:
1. `components/master/master-data-page.tsx` — tambah search state + sort state + filter logic
2. `app/(dashboard)/produk/page.tsx` — tambah sortKey state + categoryFilter state + derived sorted/filtered array + UI toolbar
3. `app/(dashboard)/pelanggan/page.tsx` — tambah sortKey state + derived sorted array + UI toolbar
4. `app/(dashboard)/riwayat/page.tsx` — tambah sortKey state + derived sorted array + UI toolbar
5. `app/(dashboard)/pengguna/page.tsx` — tambah search state + sortKey state + derived filtered+sorted array + UI toolbar

### Files baru: Tidak ada
Semua logic cukup inline di masing-masing komponen; shared component `MasterDataPage` sudah cukup sebagai abstraksi untuk master data.

## Constraints

- Tidak mengubah API endpoint apapun
- Tidak mengubah data fetching logic
- Sort tidak persist di localStorage (kembali ke default saat refresh)
- Search di Riwayat tetap server-side (tombol Cari ke API); sort-nya client-side terhadap data yang sudah di-fetch
