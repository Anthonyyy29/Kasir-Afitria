# Search & Sort Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah search dan sort dropdown ke semua halaman daftar di Kasir Afitria — MasterDataPage (5 halaman), Produk, Pelanggan, Riwayat, dan Pengguna.

**Architecture:** Client-side only. Data sudah di-load penuh ke client saat halaman dibuka. Sort dan filter dilakukan langsung di array JavaScript tanpa request API baru. Sort dropdown menggunakan komponen `Select` dari shadcn/ui yang sudah ada. Riwayat: search tetap server-side (tombol Cari), sort baru adalah client-side terhadap data yang sudah di-fetch.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (`Select`, `Input`), lucide-react.

---

## File Map

| File | Perubahan |
|------|-----------|
| `components/master/master-data-page.tsx` | Tambah search + sort dropdown. Semua 5 halaman master otomatis dapat fitur ini. |
| `app/(dashboard)/produk/page.tsx` | Tambah sort dropdown + filter kategori. |
| `app/(dashboard)/pelanggan/page.tsx` | Tambah sort dropdown. |
| `app/(dashboard)/riwayat/page.tsx` | Tambah sort dropdown (client-side terhadap hasil fetch). |
| `app/(dashboard)/pengguna/page.tsx` | Tambah search + sort dropdown. |

---

## Task 1: MasterDataPage — Search + Sort

**Files:**
- Modify: `components/master/master-data-page.tsx`

### Langkah-langkah

- [ ] **Step 1.1: Tambah imports ke master-data-page.tsx**

Ganti baris import lucide dan tambah import Select:

```tsx
// Ganti baris lama:
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

// Jadi:
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react";
```

Tambahkan baris baru setelah import Card:
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

- [ ] **Step 1.2: Tambah state search dan sortKey**

Di dalam fungsi `MasterDataPage`, setelah baris `const [form, setForm] = ...`:

```tsx
const [search, setSearch] = useState("");
const [sortKey, setSortKey] = useState<"az" | "za">("az");
```

- [ ] **Step 1.3: Tambah computed `displayed` sebelum return**

Tepat sebelum `return (`, tambahkan:

```tsx
const displayed = [...items]
  .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()))
  .sort((a, b) =>
    sortKey === "az" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
  );
```

- [ ] **Step 1.4: Tambah toolbar antara header dan Card**

Ganti bagian ini:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">{items.length} data</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah </span>{title}
        </Button>
      </div>

      <Card>
```

Menjadi:
```tsx
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500">{items.length} data</p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Tambah </span>{title}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={`Cari ${title.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as "az" | "za")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
```

- [ ] **Step 1.5: Ganti `items.map` dan update empty state di TableBody**

Ganti seluruh blok kondisional di TableBody:

```tsx
// Ganti:
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + extraFields.length} className="text-center text-gray-400 py-8">
                    Belum ada data
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (

// Jadi:
              {displayed.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + extraFields.length} className="text-center text-gray-400 py-8">
                    {items.length === 0 ? "Belum ada data" : "Tidak ada data ditemukan"}
                  </TableCell>
                </TableRow>
              ) : (
                displayed.map((item) => (
```

- [ ] **Step 1.6: Verifikasi TypeScript**

```bash
cd /opt/kasir && npm run lint
```

Expected: Tidak ada error TypeScript/ESLint.

- [ ] **Step 1.7: Commit**

```bash
cd /opt/kasir && git add components/master/master-data-page.tsx && git commit -m "feat: tambah search dan sort ke halaman master data"
```

---

## Task 2: Produk — Sort + Filter Kategori

**Files:**
- Modify: `app/(dashboard)/produk/page.tsx`

### Langkah-langkah

- [ ] **Step 2.1: Tambah state sortKey dan categoryFilter**

Di dalam `ProdukPage`, setelah baris `const [search, setSearch] = useState("");`:

```tsx
const [sortKey, setSortKey] = useState("az");
const [categoryFilter, setCategoryFilter] = useState("all");
```

- [ ] **Step 2.2: Ganti computed `filtered`**

Ganti blok ini:
```tsx
  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.name.toLowerCase().includes(search.toLowerCase())
  );
```

Menjadi:
```tsx
  const filtered = (() => {
    let arr = products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.name.toLowerCase().includes(search.toLowerCase())
    );
    if (categoryFilter !== "all") arr = arr.filter((p) => p.categoryId === categoryFilter);
    return [...arr].sort((a, b) => {
      const sa = a.variants.reduce((s, v) => s + v.stock, 0);
      const sb = b.variants.reduce((s, v) => s + v.stock, 0);
      switch (sortKey) {
        case "az": return a.name.localeCompare(b.name);
        case "za": return b.name.localeCompare(a.name);
        case "stock-desc": return sb - sa;
        case "stock-asc": return sa - sb;
        case "variants-desc": return b.variants.length - a.variants.length;
        case "variants-asc": return a.variants.length - b.variants.length;
        default: return 0;
      }
    });
  })();
```

- [ ] **Step 2.3: Ganti toolbar search**

Ganti blok ini:
```tsx
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
```

Menjadi:
```tsx
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
            <SelectItem value="stock-desc">Stok Terbanyak</SelectItem>
            <SelectItem value="stock-asc">Stok Tersedikit</SelectItem>
            <SelectItem value="variants-desc">Varian Terbanyak</SelectItem>
            <SelectItem value="variants-asc">Varian Tersedikit</SelectItem>
          </SelectContent>
        </Select>
      </div>
```

- [ ] **Step 2.4: Verifikasi TypeScript**

```bash
cd /opt/kasir && npm run lint
```

Expected: Tidak ada error.

- [ ] **Step 2.5: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/produk/page.tsx" && git commit -m "feat: tambah sort dan filter kategori ke halaman produk"
```

---

## Task 3: Pelanggan — Sort

**Files:**
- Modify: `app/(dashboard)/pelanggan/page.tsx`

### Langkah-langkah

- [ ] **Step 3.1: Tambah import Select**

Setelah baris `import * as XLSX from "xlsx";`, tambahkan:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

- [ ] **Step 3.2: Tambah state sortKey**

Setelah baris `const [search, setSearch] = useState("");`:

```tsx
const [sortKey, setSortKey] = useState("az");
```

- [ ] **Step 3.3: Ganti computed `filtered`**

Ganti blok ini:
```tsx
  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? "").includes(search)
  );
```

Menjadi:
```tsx
  const filtered = [...customers]
    .filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone ?? "").includes(search)
    )
    .sort((a, b) => {
      switch (sortKey) {
        case "za": return b.name.localeCompare(a.name);
        case "txn-desc": return b._count.transactions - a._count.transactions;
        case "txn-asc": return a._count.transactions - b._count.transactions;
        default: return a.name.localeCompare(b.name);
      }
    });
```

- [ ] **Step 3.4: Tambah sort Select ke toolbar search**

Ganti blok ini:
```tsx
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari nama / nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
```

Menjadi:
```tsx
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input className="pl-9" placeholder="Cari nama / nomor HP..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
            <SelectItem value="txn-desc">Transaksi Terbanyak</SelectItem>
            <SelectItem value="txn-asc">Transaksi Tersedikit</SelectItem>
          </SelectContent>
        </Select>
      </div>
```

- [ ] **Step 3.5: Verifikasi TypeScript**

```bash
cd /opt/kasir && npm run lint
```

Expected: Tidak ada error.

- [ ] **Step 3.6: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/pelanggan/page.tsx" && git commit -m "feat: tambah sort ke halaman pelanggan"
```

---

## Task 4: Riwayat — Sort

**Files:**
- Modify: `app/(dashboard)/riwayat/page.tsx`

### Langkah-langkah

- [ ] **Step 4.1: Tambah import Select**

Di baris import shadcn/ui yang ada (setelah import Dialog), tambahkan:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

- [ ] **Step 4.2: Tambah state sortKey**

Setelah baris `const [printing, setPrinting] = ...`:

```tsx
const [sortKey, setSortKey] = useState("newest");
```

- [ ] **Step 4.3: Tambah computed `displayed` sebelum return**

Tepat sebelum `return (`:

```tsx
  const displayed = [...transactions].sort((a, b) => {
    switch (sortKey) {
      case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "total-desc": return Number(b.totalAmount) - Number(a.totalAmount);
      case "total-asc": return Number(a.totalAmount) - Number(b.totalAmount);
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
```

- [ ] **Step 4.4: Tambah sort Select ke filter Card**

Ganti baris Button "Cari" (di dalam filter Card):
```tsx
            <Button onClick={load} disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cari
            </Button>
```

Menjadi:
```tsx
            <Button onClick={load} disabled={loading} className="gap-2 shrink-0">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Cari
            </Button>
            <Select value={sortKey} onValueChange={setSortKey}>
              <SelectTrigger className="w-48 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Terbaru</SelectItem>
                <SelectItem value="oldest">Terlama</SelectItem>
                <SelectItem value="total-desc">Total Terbesar</SelectItem>
                <SelectItem value="total-asc">Total Terkecil</SelectItem>
              </SelectContent>
            </Select>
```

- [ ] **Step 4.5: Ganti `transactions.map` dengan `displayed.map` di mobile view**

```tsx
// Ganti:
            {transactions.map((t) => (
// Jadi:
            {displayed.map((t) => (
```

Ada dua tempat — mobile card list dan desktop table. Ganti keduanya.

- [ ] **Step 4.6: Ganti `transactions.map` dengan `displayed.map` di desktop table**

```tsx
// Ganti (di dalam desktop Table):
                    {transactions.map((t) => (
// Jadi:
                    {displayed.map((t) => (
```

- [ ] **Step 4.7: Verifikasi TypeScript**

```bash
cd /opt/kasir && npm run lint
```

Expected: Tidak ada error.

- [ ] **Step 4.8: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/riwayat/page.tsx" && git commit -m "feat: tambah sort ke halaman riwayat pesanan"
```

---

## Task 5: Pengguna — Search + Sort

**Files:**
- Modify: `app/(dashboard)/pengguna/page.tsx`

### Langkah-langkah

- [ ] **Step 5.1: Update imports**

Ganti baris import lucide:
```tsx
// Ganti:
import { Plus, Pencil, Trash2, Loader2, Shield, UserCircle } from "lucide-react";

// Jadi:
import { Plus, Pencil, Trash2, Loader2, Shield, UserCircle, Search } from "lucide-react";
```

Select sudah diimport di pengguna/page.tsx. Verifikasi ada baris ini (jika belum, tambahkan setelah import Badge):
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

- [ ] **Step 5.2: Tambah state search dan sortKey**

Setelah baris `const [form, setForm] = ...`:

```tsx
const [search, setSearch] = useState("");
const [sortKey, setSortKey] = useState("az");
```

- [ ] **Step 5.3: Tambah computed `displayed` sebelum return**

Tepat sebelum `return (`:

```tsx
  const displayed = [...users]
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortKey) {
        case "za": return b.name.localeCompare(a.name);
        case "admin-first": return a.role === "ADMIN" ? -1 : b.role === "ADMIN" ? 1 : 0;
        case "kasir-first": return a.role === "KASIR" ? -1 : b.role === "KASIR" ? 1 : 0;
        default: return a.name.localeCompare(b.name);
      }
    });
```

- [ ] **Step 5.4: Tambah toolbar antara header dan blok loading**

Ganti bagian ini:
```tsx
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : (
```

Menjadi:
```tsx
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Cari pengguna..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortKey} onValueChange={setSortKey}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="az">Nama A-Z</SelectItem>
            <SelectItem value="za">Nama Z-A</SelectItem>
            <SelectItem value="admin-first">Admin Dulu</SelectItem>
            <SelectItem value="kasir-first">Kasir Dulu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border rounded-lg bg-white">Tidak ada pengguna ditemukan</div>
      ) : (
```

- [ ] **Step 5.5: Ganti `users.map` dengan `displayed.map` di mobile view**

```tsx
// Ganti:
            {users.map((u) => (
// Jadi:
            {displayed.map((u) => (
```

- [ ] **Step 5.6: Ganti `users.map` dengan `displayed.map` di desktop table**

```tsx
// Ganti (di dalam desktop Table):
                  {users.map((u) => (
// Jadi:
                  {displayed.map((u) => (
```

- [ ] **Step 5.7: Verifikasi TypeScript**

```bash
cd /opt/kasir && npm run lint
```

Expected: Tidak ada error.

- [ ] **Step 5.8: Commit**

```bash
cd /opt/kasir && git add "app/(dashboard)/pengguna/page.tsx" && git commit -m "feat: tambah search dan sort ke halaman pengguna"
```

---

## Task 6: Deploy

- [ ] **Step 6.1: Push ke GitHub untuk trigger deploy**

```bash
cd /opt/kasir && git push origin main
```

Expected: GitHub Actions pipeline terpicu. Monitor di tab Actions repo.

- [ ] **Step 6.2: Verifikasi di kasir-afitria.my.id**

Cek manual di browser:
- [ ] `/produk/kategori` — search muncul, sort A-Z / Z-A berfungsi
- [ ] `/produk/satuan` — sama
- [ ] `/produk/warna` — sama
- [ ] `/produk/ukuran` — sama
- [ ] `/produk/sub-kategori` — sama
- [ ] `/produk` — search + filter kategori + sort berfungsi; filter kategori menyaring produk dengan benar
- [ ] `/pelanggan` — search + sort berfungsi; sort transaksi terbanyak menampilkan pelanggan dengan transaksi paling banyak di atas
- [ ] `/riwayat` — sort Terbaru/Terlama/Total berfungsi terhadap data yang sudah di-load
- [ ] `/pengguna` — search + sort berfungsi; empty state muncul jika search tidak cocok
