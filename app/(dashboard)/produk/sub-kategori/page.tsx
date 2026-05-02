"use client";

import { useEffect, useState } from "react";
import { MasterDataPage } from "@/components/master/master-data-page";

export default function SubKategoriPage() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/kategori").then((r) => r.json()).then(setCategories);
  }, []);

  return (
    <MasterDataPage
      title="Sub Kategori"
      apiUrl="/api/sub-kategori"
      extraFields={[{
        key: "categoryId",
        label: "Kategori",
        options: categories,
        displayKey: "category",
      }]}
    />
  );
}
