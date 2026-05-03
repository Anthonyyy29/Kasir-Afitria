"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ShoppingCart, LayoutDashboard, Package, Users, BarChart3,
  Settings, LogOut, Tag, Layers, Ruler, Palette, ChevronDown, ChevronRight, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Kasir", href: "/kasir", icon: ShoppingCart },
  {
    label: "Produk",
    icon: Package,
    adminOnly: true,
    children: [
      { label: "Daftar Produk", href: "/produk", icon: Package },
      { label: "Kategori & Jenis", href: "/produk/kategori", icon: Tag },
      { label: "Sub Kategori", href: "/produk/sub-kategori", icon: Layers },
      { label: "Satuan", href: "/produk/satuan", icon: Ruler },
      { label: "Warna", href: "/produk/warna", icon: Palette },
      { label: "Ukuran", href: "/produk/ukuran", icon: Ruler },
    ],
  },
  { label: "Pelanggan", href: "/pelanggan", icon: Users, adminOnly: true },
  { label: "Laporan", href: "/laporan", icon: BarChart3, adminOnly: true },
  { label: "Pengguna", href: "/pengguna", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  lowStockCount?: number;
}

export function Sidebar({ lowStockCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [openGroups, setOpenGroups] = useState<string[]>(["Produk"]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const filteredItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="bg-blue-500 rounded-lg p-2">
          <ShoppingCart className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-white">Kasir Afitria</p>
          <p className="text-xs text-gray-400 capitalize">{session?.user?.role?.toLowerCase()}</p>
        </div>
      </div>

      {/* Low stock notification */}
      {lowStockCount > 0 && isAdmin && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-yellow-900/50 border border-yellow-700 rounded-lg px-3 py-2 text-yellow-300 text-xs">
          <Bell className="h-3.5 w-3.5 shrink-0" />
          <span>{lowStockCount} produk stok menipis</span>
          <Badge variant="warning" className="ml-auto text-[10px] px-1.5 py-0">
            {lowStockCount}
          </Badge>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          if (item.children) {
            const isOpen = openGroups.includes(item.label);
            const isActive = item.children.some((c) => c.href && pathname.startsWith(c.href));
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-3">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href!}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                          pathname === child.href
                            ? "bg-blue-600 text-white"
                            : "text-gray-400 hover:bg-gray-800 hover:text-white"
                        )}
                      >
                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="mb-3">
          <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{session?.user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-400 hover:text-white hover:bg-gray-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </aside>
  );
}
