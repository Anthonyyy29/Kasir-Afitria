# Rencana Migrasi: Vercel + Supabase → VPS Pribadi

Dokumen ini adalah blueprint pindah hosting Kasir Mamak dari Vercel + Supabase ke VPS Ubuntu/Debian milik sendiri. Disepakati 2026-05-17.

## Keputusan Arsitektur

| Aspek | Pilihan |
|-------|---------|
| Database | PostgreSQL lokal di VPS (bukan Supabase) |
| OS | Ubuntu/Debian (sudah ada) |
| Domain | Sudah siap, DNS A record ke IP VPS |
| Runtime | Docker + docker-compose |
| Reverse proxy & SSL | Nginx + Certbot **di host** (bukan dalam compose) |
| Auto-deploy | GitHub Actions on push to `main` (SSH ke VPS) |

**Alasan Nginx di host:** SSL renewal via certbot lebih simpel, dan Nginx tidak perlu di-rebuild setiap kali app deploy.

## Arsitektur Target

```
┌─────────────────────────────────────────────────────────────┐
│ VPS Ubuntu                                                  │
│                                                             │
│  Nginx (host) ──[443/80]── Internet                         │
│       │                                                     │
│       └─► localhost:3000                                    │
│                                                             │
│  ┌─────────── docker-compose ──────────┐                    │
│  │  ┌──────────┐      ┌─────────────┐  │                    │
│  │  │ app      │ ───► │ postgres    │  │                    │
│  │  │ (Next.js)│      │ (volume)    │  │                    │
│  │  │ :3000    │      │ :5432       │  │                    │
│  │  └──────────┘      └─────────────┘  │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  /backup/  ← cron pg_dump harian                            │
└─────────────────────────────────────────────────────────────┘
         ▲
         │  GitHub Actions SSH (on push main)
   GitHub repo
```

## File yang Harus Dibuat / Dimodifikasi

| File | Aksi | Tujuan |
|------|------|--------|
| `Dockerfile` | Baru | Multi-stage build Next.js standalone (deps → builder → runner, non-root user) |
| `.dockerignore` | Baru | Exclude `node_modules`, `.next`, `.env*`, `.git`, `docs/` |
| `docker-compose.yml` | Baru | Service `app` + `postgres:16-alpine` dengan healthcheck |
| `next.config.ts` | Edit | Tambah `output: 'standalone'` |
| `prisma/migrations/` | Baru | Convert dari `db:push` → `prisma migrate dev --name init`, commit folder migrations |
| `.github/workflows/deploy.yml` | Baru | SSH via `appleboy/ssh-action`: pull → build → `prisma migrate deploy` → restart |
| `scripts/backup-db.sh` | Baru | `pg_dump` harian, retain 14 hari |
| `deploy/nginx.conf.example` | Baru | Template Nginx untuk dicopy ke `/etc/nginx/sites-available/` |
| `.env.example` | Edit | Tambah `POSTGRES_PASSWORD` |

## Tahapan Eksekusi

### Tahap 1 — Persiapan Repo (di laptop)

1. Tambah `output: 'standalone'` ke `next.config.ts` → Docker image jauh lebih kecil.
2. Buat `Dockerfile` multi-stage:
   - Stage `deps`: `npm ci`
   - Stage `builder`: `prisma generate`, `npm run build`
   - Stage `runner`: copy `.next/standalone`, `.next/static`, `public`, `prisma`. CMD `node server.js`.
3. Buat `.dockerignore`.
4. Buat `docker-compose.yml`:
   - `postgres:16-alpine` dengan named volume `pgdata`, env `POSTGRES_PASSWORD`, **port tidak di-expose** ke host
   - `app` build dari Dockerfile, `depends_on` postgres healthcheck, bind `127.0.0.1:3000:3000`
   - Hostname `postgres` → `DATABASE_URL=postgresql://postgres:PASS@postgres:5432/kasir`
5. Generate Prisma migrations: `npx prisma migrate dev --name init`, commit folder `prisma/migrations/`.
6. Buat `deploy/nginx.conf.example`: reverse proxy ke `127.0.0.1:3000`, HTTP→HTTPS redirect, HSTS header.
7. Buat `scripts/backup-db.sh`: `docker exec postgres pg_dump ... | gzip > /backup/kasir-$(date +%F).sql.gz`, hapus file > 14 hari.
8. Buat `.github/workflows/deploy.yml`. Secrets dibutuhkan: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `SSH_PORT`.

### Tahap 2 — Setup VPS (manual, sekali saja)

1. **Hardening:** buat user non-root, SSH key only (disable password), `ufw allow 22,80,443`, install `fail2ban`, enable `unattended-upgrades`.
2. **Install Docker:** `curl -fsSL https://get.docker.com | sh`, tambah user ke group `docker`.
3. **Install Nginx + Certbot:** `apt install nginx python3-certbot-nginx`.
4. **Setup DNS:** A record domain → IP VPS, tunggu propagasi (`dig domain-kamu`).
5. **Clone repo:** `git clone https://github.com/Anthonyyy29/Kasir-Afitria.git /opt/kasir`.
6. **Buat `/opt/kasir/.env`** (jangan di-commit):
   ```
   POSTGRES_PASSWORD=<random panjang>
   DATABASE_URL=postgresql://postgres:<password>@postgres:5432/kasir
   DIRECT_URL=postgresql://postgres:<password>@postgres:5432/kasir
   NEXTAUTH_URL=https://domain-kamu
   NEXTAUTH_SECRET=<openssl rand -base64 32>
   ```
7. **First boot:**
   ```bash
   docker compose up -d postgres
   # tunggu healthy
   docker compose run --rm app npx prisma migrate deploy
   docker compose run --rm app npx prisma db seed   # opsional, kalau db kosong
   docker compose up -d app
   ```
8. **Setup Nginx:** copy `deploy/nginx.conf.example` ke `/etc/nginx/sites-available/kasir`, symlink ke `sites-enabled/`, `nginx -t && systemctl reload nginx`.
9. **SSL:** `certbot --nginx -d domain-kamu` (auto-renew via systemd timer).
10. **Cron backup:** `crontab -e` tambah `0 2 * * * /opt/kasir/scripts/backup-db.sh`.

### Tahap 3 — Migrasi Data dari Supabase

```bash
# dari laptop
pg_dump "<SUPABASE_DIRECT_URL>" --no-owner --no-acl --clean --if-exists > supabase-dump.sql
scp supabase-dump.sql user@vps:/tmp/

# di VPS
docker exec -i postgres psql -U postgres -d kasir < /tmp/supabase-dump.sql
```

Verifikasi: `SELECT COUNT(*) FROM "Transaction";` cocok dengan jumlah di Supabase.

### Tahap 4 — Aktifkan Auto-deploy

1. Generate SSH key khusus deploy di VPS: `ssh-keygen -t ed25519 -f ~/.ssh/github-deploy`, authorize key tersebut.
2. Add GitHub secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY` (private key), `SSH_PORT`.
3. Push commit dummy → cek Actions tab → cek `docker compose logs -f app` di VPS.
4. Test `https://domain-kamu/api/health` → return `{"status":"ok"}`.

## Yang Sudah Siap dari Audit Sebelumnya

- ✅ `/api/health` → langsung dipakai healthcheck + monitoring eksternal
- ✅ `middleware.ts` → jalan otomatis di Docker, proteksi server-side
- ✅ Security headers di `next.config.ts` → tetap aktif. Nginx tambah HSTS setelah HTTPS aktif
- ✅ `.env.example` → tinggal extend dengan `POSTGRES_PASSWORD`
- ✅ `lib/cache.ts` (`unstable_cache`) → filesystem cache di dalam container. Cache hilang saat restart — OK karena TTL 1 jam & auto-revalidate via tag

## Verifikasi End-to-End

1. `curl https://domain-kamu/api/health` → 200 `{"status":"ok","db":"connected"}`
2. `curl -I https://domain-kamu` → 200, ada header `strict-transport-security`
3. Edit README → push → GitHub Actions hijau → `docker compose ps` di VPS menunjukkan container baru
4. `ls /backup/` setelah jam 02:00, atau jalankan manual `bash scripts/backup-db.sh`
5. Test login real, buat transaksi, cek tersimpan di DB
6. Edit kategori → `/api/kategori` muncul data baru (revalidateTag bekerja)

## Catatan Penting

- **`NEXTAUTH_SECRET` harus baru** — generate ulang dengan `openssl rand -base64 32`, jangan reuse dari Vercel env.
- **`DATABASE_URL` dan `DIRECT_URL` boleh sama** — tidak perlu PgBouncer untuk skala satu toko, dua-duanya ke `postgres:5432`.
- **Rollback plan:** biarkan Vercel + Supabase tetap aktif minimal 7 hari setelah cutover ke VPS, sebagai safety net kalau ada masalah.
