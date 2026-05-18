import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { notDeleted } from "./soft-delete";

export const getCachedKategori = unstable_cache(
  () => prisma.category.findMany({ where: notDeleted, include: { subCategories: { where: notDeleted } }, orderBy: { name: "asc" } }),
  ["kategori"],
  { tags: ["kategori"], revalidate: 3600 }
);

export const getCachedSubKategori = unstable_cache(
  () => prisma.subCategory.findMany({ where: notDeleted, include: { category: true }, orderBy: { name: "asc" } }),
  ["sub-kategori"],
  { tags: ["sub-kategori"], revalidate: 3600 }
);

export const getCachedSatuan = unstable_cache(
  () => prisma.unit.findMany({ where: notDeleted, orderBy: { name: "asc" } }),
  ["satuan"],
  { tags: ["satuan"], revalidate: 3600 }
);

export const getCachedWarna = unstable_cache(
  () => prisma.color.findMany({ where: notDeleted, orderBy: { name: "asc" } }),
  ["warna"],
  { tags: ["warna"], revalidate: 3600 }
);

export const getCachedUkuran = unstable_cache(
  () => prisma.size.findMany({ where: notDeleted, orderBy: { name: "asc" } }),
  ["ukuran"],
  { tags: ["ukuran"], revalidate: 3600 }
);
