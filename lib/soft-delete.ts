export const TRASH_RETENTION_DAYS = 30;

export const cutoffDate = () =>
  new Date(Date.now() - TRASH_RETENTION_DAYS * 86400000);

export const notDeleted = { deletedAt: null } as const;

export type TrashType =
  | "pelanggan"
  | "transaksi"
  | "produk"
  | "varian"
  | "pengguna"
  | "kategori"
  | "sub-kategori"
  | "satuan"
  | "warna"
  | "ukuran";

export const TRASH_MODELS: Record<TrashType, { label: string }> = {
  pelanggan: { label: "Pelanggan" },
  transaksi: { label: "Transaksi" },
  produk: { label: "Produk" },
  varian: { label: "Varian" },
  pengguna: { label: "Pengguna" },
  kategori: { label: "Kategori" },
  "sub-kategori": { label: "Sub-Kategori" },
  satuan: { label: "Satuan" },
  warna: { label: "Warna" },
  ukuran: { label: "Ukuran" },
};
