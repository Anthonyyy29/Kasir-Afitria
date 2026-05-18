"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrashTable } from "./trash-table";
import { TrashType } from "@/lib/soft-delete";

const MAIN_TABS: { value: TrashType; label: string }[] = [
  { value: "pelanggan", label: "Pelanggan" },
  { value: "transaksi", label: "Transaksi" },
  { value: "produk", label: "Produk" },
  { value: "varian", label: "Varian" },
  { value: "pengguna", label: "Pengguna" },
];

const MASTER_TYPES: { value: TrashType; label: string }[] = [
  { value: "kategori", label: "Kategori" },
  { value: "sub-kategori", label: "Sub-Kategori" },
  { value: "satuan", label: "Satuan" },
  { value: "warna", label: "Warna" },
  { value: "ukuran", label: "Ukuran" },
];

export function TrashPageClient() {
  const [masterType, setMasterType] = useState<TrashType>("kategori");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Kelola Memori (Sampah)</h1>
        <p className="text-gray-500 text-sm">Item dihapus otomatis setelah 30 hari</p>
      </div>

      <Tabs defaultValue="pelanggan">
        <TabsList className="flex-wrap h-auto gap-1">
          {MAIN_TABS.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
          <TabsTrigger value="master">Master Data</TabsTrigger>
        </TabsList>

        {MAIN_TABS.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <TrashTable type={tab.value} />
          </TabsContent>
        ))}

        <TabsContent value="master">
          <div className="mb-4">
            <Select value={masterType} onValueChange={v => setMasterType(v as TrashType)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MASTER_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TrashTable key={masterType} type={masterType} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
