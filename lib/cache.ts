import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";

export const getCachedKategori = unstable_cache(
  () => prisma.category.findMany({ include: { subCategories: true }, orderBy: { name: "asc" } }),
  ["kategori"],
  { tags: ["kategori"], revalidate: 3600 }
);

export const getCachedSubKategori = unstable_cache(
  () => prisma.subCategory.findMany({ include: { category: true }, orderBy: { name: "asc" } }),
  ["sub-kategori"],
  { tags: ["sub-kategori"], revalidate: 3600 }
);

export const getCachedSatuan = unstable_cache(
  () => prisma.unit.findMany({ orderBy: { name: "asc" } }),
  ["satuan"],
  { tags: ["satuan"], revalidate: 3600 }
);

export const getCachedWarna = unstable_cache(
  () => prisma.color.findMany({ orderBy: { name: "asc" } }),
  ["warna"],
  { tags: ["warna"], revalidate: 3600 }
);

export const getCachedUkuran = unstable_cache(
  () => prisma.size.findMany({ orderBy: { name: "asc" } }),
  ["ukuran"],
  { tags: ["ukuran"], revalidate: 3600 }
);
