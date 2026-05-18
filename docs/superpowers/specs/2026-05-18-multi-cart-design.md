# Multi-Cart (Keranjang Paralel) — Design Spec

**Tanggal:** 2026-05-18  
**Status:** Approved  
**Scope:** Halaman `/kasir` — kemampuan menyimpan beberapa keranjang belanja aktif sekaligus

---

## Latar Belakang & Masalah

Saat ini halaman `/kasir` hanya mendukung satu keranjang aktif. Jika Pelanggan A sedang dalam proses order (belum fix, masih mungkin tambah/kurang barang), dan Pelanggan B datang, kasir tidak bisa mulai melayani Pelanggan B tanpa menghapus progres Pelanggan A.

Kebutuhan: kasir harus bisa meng-hold order Pelanggan A, melayani Pelanggan B, lalu kembali ke Pelanggan A kapanpun.

**Skala:** hingga 10+ keranjang aktif secara bersamaan.  
**Device:** kasir sering ganti device, sehingga state harus persist di server (database), bukan hanya di browser.

---

## Keputusan Desain

| Keputusan | Pilihan | Alasan |
|-----------|---------|--------|
| UI pattern | Panel/modal daftar keranjang | Lebih scalable untuk 10+ keranjang vs. tab row |
| Penyimpanan | Database (`CartSession`) | Harus survive browser close dan ganti device |
| Items format | JSON di dalam CartSession | Cart bersifat sementara, tidak perlu query per item |
| Lifecycle | Manual delete oleh kasir | Tidak ada auto-expire; kasir yang memutuskan batalkan |
| Akses | Semua role (ADMIN + KASIR) | Keduanya bisa jaga kasir |

---

## Database Schema

Tambah model baru di `prisma/schema.prisma`:

```prisma
model CartSession {
  id         String   @id @default(cuid())
  customerId String?
  kasirId    String
  items      Json     @default("[]")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  customer Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)
  kasir    User      @relation(fields: [kasirId], references: [id])
}
```

**Catatan skema:**
- `customerId` nullable — kasir boleh buat keranjang sebelum pelanggan dipilih
- `kasirId` wajib — setiap keranjang tercatat siapa yang membuat
- Tidak pakai `deletedAt` — batalkan keranjang = hard delete (data sementara, tidak perlu audit trail)
- Tambah relasi `cartSessions CartSession[]` di model `User` dan `Customer`

**Format JSON `items`:**
```json
[
  {
    "variantId": "clx...",
    "productName": "Kaos Polos",
    "variantInfo": "Merah - L",
    "quantity": 2,
    "price": 75000,
    "subtotal": 150000
  }
]
```

---

## API Endpoints

Semua endpoint protected oleh middleware NextAuth yang sudah ada.

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/cart` | List semua CartSession milik kasir yang login |
| `POST` | `/api/cart` | Buat CartSession baru (kosong) |
| `GET` | `/api/cart/[id]` | Ambil 1 CartSession beserta data customer |
| `PUT` | `/api/cart/[id]` | Update `items` dan/atau `customerId` |
| `DELETE` | `/api/cart/[id]` | Hard delete (batalkan keranjang) |

**Aturan akses:**
- `GET /api/cart` hanya return keranjang milik `kasirId` = user yang sedang login
- Operasi pada `[id]` harus verify bahwa `kasirId` milik user yang login (atau role ADMIN)

---

## Komponen UI

### Tombol di Header Kasir
Posisi: header halaman `/kasir`, sebelah kanan informasi pelanggan aktif.

```
[🛒 Keranjang Aktif (2) ▾]
```

Badge angka = jumlah CartSession aktif. Klik → buka panel.

### Panel Daftar Keranjang (Modal/Dropdown)
```
┌─────────────────────────────────────────┐
│  Keranjang Aktif                    [×] │
├─────────────────────────────────────────┤
│  ● Bu Sari • 3 item • 10 menit lalu    │
│    Rp 150.000              [Buka] [×]   │
├─────────────────────────────────────────┤
│    Pak Budi • 1 item • 2 menit lalu     │
│    Rp 45.000               [Buka] [×]   │
├─────────────────────────────────────────┤
│  [+ Buat Keranjang Baru]                │
└─────────────────────────────────────────┘
```

- `●` menandai keranjang yang sedang aktif
- `[×]` per row → konfirmasi batalkan → hard delete
- `[Buka]` → switch ke keranjang tersebut
- `[+ Buat Keranjang Baru]` → POST `/api/cart` → switch ke keranjang baru

### State Aktif
- `activeCartId` disimpan di `localStorage` per device
- Saat kasir ganti device: buka panel → pilih keranjang dari daftar → lanjut
- Saat buka `/kasir` dan tidak ada `activeCartId` valid: otomatis buat CartSession baru

---

## Flow Lengkap

1. Kasir buka `/kasir` → cek `localStorage` untuk `activeCartId`
2. Jika tidak ada atau ID tidak valid → POST `/api/cart` → set sebagai aktif
3. Kasir pilih pelanggan, tambah item → PUT `/api/cart/[id]` setiap perubahan
4. Pelanggan baru datang → klik panel → `+ Buat Keranjang Baru` → keranjang lama tersimpan otomatis
5. Switch antar keranjang lewat `[Buka]` di panel
6. Proses pembayaran selesai → transaksi tersimpan → DELETE `/api/cart/[id]` (cleanup otomatis)
7. Batalkan → `[×]` di panel → konfirmasi dialog → DELETE `/api/cart/[id]`

---

## File yang Perlu Dibuat / Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | Tambah model `CartSession` + relasi ke `User` dan `Customer` |
| `prisma/migrations/...` | Migration baru untuk tabel `cart_sessions` |
| `app/api/cart/route.ts` | GET list + POST create |
| `app/api/cart/[id]/route.ts` | GET detail + PUT update + DELETE |
| `app/(dashboard)/kasir/page.tsx` | Integrasikan cart state management |
| `components/kasir/cart-panel.tsx` | Komponen panel daftar keranjang (baru) |
| `components/kasir/cart-panel-button.tsx` | Tombol trigger panel dengan badge (baru) |

---

## Error Handling

- Jika `PUT /api/cart/[id]` gagal (network error) → tampilkan toast error, jangan clear keranjang lokal
- Jika `activeCartId` di localStorage tidak ditemukan di DB (sudah dihapus device lain) → otomatis buat CartSession baru
- Batalkan keranjang yang sedang aktif → switch ke keranjang lain yang ada, atau buat baru jika kosong

---

## Out of Scope

- Notifikasi real-time antar device (misal: kasir A lihat keranjang kasir B live) — tidak diperlukan
- Keranjang yang bisa diakses/diedit kasir lain — setiap keranjang milik kasir yang membuat
- Auto-expire keranjang — lifecycle sepenuhnya manual
