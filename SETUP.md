# Setup Guide — Kasir Mamak

## Langkah 1: Buat Database di Supabase

1. Buka https://supabase.com dan buat akun (gratis)
2. Klik **New Project**, isi nama project
3. Setelah project dibuat, buka **Settings > Database**
4. Di bagian **Connection string**, pilih tab **URI**
5. Salin URL tersebut (format: `postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres`)

## Langkah 2: Konfigurasi .env

Edit file `.env` dan isi dengan URL Supabase:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="ganti-dengan-string-acak-panjang"
```

Untuk generate NEXTAUTH_SECRET, jalankan:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Langkah 3: Push Schema ke Database

```bash
npm run db:push
```

## Langkah 4: Isi Data Awal (Seed)

```bash
npm run db:seed
```

Setelah seed, akun yang tersedia:
- **Admin**: admin@kasir.com / admin123
- **Kasir**: kasir@kasir.com / kasir123

## Langkah 5: Jalankan Aplikasi

```bash
npm run dev
```

Buka http://localhost:3000

---

## Deploy ke Vercel

1. Push code ke GitHub
2. Buka https://vercel.com dan import repository
3. Di Environment Variables, isi:
   - `DATABASE_URL` = URL Supabase
   - `NEXTAUTH_URL` = URL domain Vercel Anda (misal: https://kasir-mamak.vercel.app)
   - `NEXTAUTH_SECRET` = string acak yang sudah dibuat
4. Deploy!

---

## Struktur Role

| Role  | Akses |
|-------|-------|
| ADMIN | Semua fitur: produk, pelanggan, laporan, kasir |
| KASIR | Hanya halaman kasir dan dashboard |
