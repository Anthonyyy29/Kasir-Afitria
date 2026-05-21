"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);

  // Default open on desktop, closed on mobile
  useEffect(() => {
    setOpen(window.innerWidth >= 1024);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Backdrop — mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[35] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar isOpen={open} onClose={() => setOpen(false)} />

      {/* Top header */}
      <header
        className={cn(
          "fixed top-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 z-30",
          "transition-[left] duration-300 ease-in-out",
          open ? "left-0 lg:left-64" : "left-0"
        )}
      >
        <button
          onClick={() => setOpen((o) => !o)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-gray-800 text-sm lg:hidden">Afitria Sock</span>
      </header>

      {/* Page content */}
      <main
        className={cn(
          "pt-14 transition-[padding-left] duration-300 ease-in-out",
          open ? "lg:pl-64" : ""
        )}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
