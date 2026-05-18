# Setup Cron Auto-Cleanup Sampah

Script ini menghapus permanen item di sampah yang sudah lebih dari 30 hari.

## Setup di VPS

Jalankan `crontab -e` dan tambahkan:

```
0 3 * * * cd /opt/kasir && /usr/bin/flock -n /tmp/kasir-cleanup.lock docker compose run --rm -T app npm run cleanup:trash >> /var/log/kasir-cleanup.log 2>&1
```

Jadwal: setiap hari jam 03:00 WIB.
`flock -n` mencegah dua eksekusi berjalan bersamaan.

## Test Manual

```bash
cd /opt/kasir && docker compose run --rm -T app npm run cleanup:trash
```

## Output

Script menghasilkan JSON log per eksekusi:

```json
{
  "at": "2026-05-18T20:00:00.000Z",
  "cutoff": "2026-04-18T20:00:00.000Z",
  "deleted": { "pelanggan": 2, "produk": 1 },
  "skipped": 1,
  "skippedIds": ["pengguna:abc123"]
}
```

## Deskripsi Algoritma

Script menghapus item yang `deletedAt < 30 hari lalu` dengan urutan:

1. **Transaksi** — langsung hapus (TransactionItem CASCADE)
2. **Varian** — skip jika masih ada di TransactionItem
3. **Produk** — skip jika varian-nya masih ada di TransactionItem
4. **Pelanggan** — FK SetNull otomatis, CustomerPrice CASCADE
5. **Pengguna** — skip jika masih ada transaksi (kasirId)
6. **Master data** (kategori, sub-kategori, satuan, warna, ukuran) — skip jika masih ada produk/varian aktif

Output berisi:
- `at`: waktu eksekusi
- `cutoff`: tanggal cutoff (30 hari lalu)
- `deleted`: jumlah item dihapus per entitas
- `skipped`: jumlah item yang di-skip (karena masih ada referensi)
- `skippedIds`: list ID yang di-skip
