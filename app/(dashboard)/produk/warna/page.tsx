"use client";

import { MasterDataPage } from "@/components/master/master-data-page";

export default function WarnaPage() {
  return (
    <MasterDataPage
      title="Warna"
      apiUrl="/api/warna"
      extraFields={[{ key: "hex", label: "Kode Warna (HEX)", placeholder: "#FF0000", type: "color" }]}
      renderExtra={(item) =>
        item.hex ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border" style={{ backgroundColor: String(item.hex) }} />
            <span className="text-xs text-gray-500">{String(item.hex)}</span>
          </div>
        ) : null
      }
    />
  );
}
