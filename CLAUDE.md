# Kasir Mamak — Project Context

## Ringkasan Proyek
Aplikasi kasir berbasis web (Next.js 16 + Supabase + Prisma) untuk satu toko.
Repository: https://github.com/Anthonyyy29/Kasir-Afitria

## Tech Stack
- **Framework**: Next.js 16 (App Router, TypeScript)
- **UI**: Tailwind CSS + shadcn/ui (komponen manual, bukan CLI)
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma 6
- **Auth**: NextAuth v4 (session JWT, tanpa password)
- **Grafik**: Recharts
- **Export**: SheetJS (xlsx) untuk Excel, jsPDF + jspdf-autotable untuk struk PDF
- **Deploy**: Vercel (app) + Supabase (database)

## Sistem Login
Tidak ada password. Login hanya dengan memilih nama pengguna dari daftar kartu.
- Halaman login: `app/login/page.tsx` — fetch `/api/users`, tampilkan kartu per user
- Auth provider: `lib/auth.ts` — terima `userId` saja, tidak validasi password
- Field `password` di tabel User diisi `-` (dummy), `email` diisi `{timestamp}@local`

## Role
| Role | Akses |
|------|-------|
| ADMIN | Semua fitur: produk, pelanggan, laporan, pengguna, kasir |
| KASIR | Hanya dashboard dan kasir |

## Struktur Halaman
```
/login                    → Pilih pengguna (tanpa password)
/dashboard                → Ringkasan + grafik 7 hari
/kasir                    → Antarmuka kasir utama
/produk                   → Daftar produk + variasi
/produk/kategori          → CRUD jenis
/produk/sub-kategori      → CRUD sub jenis
/produk/satuan            → CRUD satuan barang
/produk/warna             → CRUD warna (dengan color picker)
/produk/ukuran            → CRUD ukuran
/pelanggan                → CRUD pelanggan + harga khusus per varian
/laporan                  → Bagan penjualan + export Excel
/pengguna                 → CRUD pengguna (Admin only)
```

## Alur Kasir
1. Pilih pelanggan → harga otomatis menyesuaikan harga khusus pelanggan tsb
2. Klik produk/varian untuk tambah ke keranjang
3. Opsional: input potongan harga + alasan (teks bebas)
4. Klik Bayar → input jumlah uang → kembalian otomatis
5. Transaksi tersimpan → struk PDF bisa diunduh/dicetak

## Database Schema (Prisma)
Tabel utama: `User`, `Customer`, `Product`, `ProductVariant`, `CustomerPrice`, `Transaction`, `TransactionItem`
Master data: `Unit`, `Category`, `SubCategory`, `Color`, `Size`

### Harga per Pelanggan
- Setiap `ProductVariant` punya `basePrice` (harga default)
- Tabel `CustomerPrice` menyimpan harga khusus per `(customerId, productVariantId)`
- Saat kasir memilih pelanggan, sistem otomatis pakai harga khusus jika ada

## Variasi Produk
- Kombinasi `Color` + `Size` sekaligus (misal: Merah-L, Biru-XL)
- Stok dihitung per varian
- Notifikasi stok tipis: sidebar menampilkan badge jika `stock <= lowStockThreshold`

## API Routes
```
GET/POST        /api/users
PUT/DELETE      /api/users/[id]
GET/POST        /api/produk
GET/PUT/DELETE  /api/produk/[id]
POST            /api/produk/[id]/varian
PUT/DELETE      /api/varian/[id]
GET/POST        /api/pelanggan
GET/PUT/DELETE  /api/pelanggan/[id]
POST/DELETE     /api/pelanggan/[id]/harga
GET/POST        /api/transaksi
GET             /api/transaksi/[id]
GET             /api/laporan
GET/POST        /api/kategori  |  PUT/DELETE /api/kategori/[id]
GET/POST        /api/sub-kategori  |  PUT/DELETE /api/sub-kategori/[id]
GET/POST/PUT/DELETE  /api/satuan/[id] | /api/warna/[id] | /api/ukuran/[id]
```

## Next.js 16 Breaking Change — Params sebagai Promise
Semua dynamic route params harus di-await:
```ts
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
}
```

## Environment Variables
```
DATABASE_URL=     # Supabase connection string (Transaction pooler)
NEXTAUTH_URL=     # URL app (http://localhost:3000 dev, https://... production)
NEXTAUTH_SECRET=  # Random string panjang
```

## Perintah Penting
```bash
npm run dev          # Jalankan lokal
npm run db:push      # Push schema ke Supabase
npm run db:seed      # Isi data awal (akun demo + contoh produk)
npm run build        # Build production
npx prisma studio    # GUI database
```

## Catatan Teknis
- `prisma.config.ts` load `.env` via `import "dotenv/config"` — butuh package `dotenv`
- `next.config.ts` pakai `serverExternalPackages` (bukan `experimental.serverComponentsExternalPackages`)
- Komponen shadcn/ui dibuat manual karena nama folder mengandung spasi
- Badge variant `warning` dan `success` ditambahkan manual di `components/ui/badge.tsx`
- `postcss.config.js` butuh `autoprefixer` terinstall secara eksplisit
