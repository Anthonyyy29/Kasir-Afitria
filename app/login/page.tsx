"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2, UserCircle, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  role: "ADMIN" | "KASIR";
}

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(user: User) {
    setSelecting(user.id);
    const result = await signIn("credentials", {
      userId: user.id,
      redirect: false,
    });
    if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="bg-blue-600 rounded-2xl p-4 shadow-lg mb-4">
          <ShoppingCart className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Kasir Mamak</h1>
        <p className="text-gray-500 mt-1">Siapa yang akan menggunakan kasir sekarang?</p>
      </div>

      {/* User cards */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Memuat daftar pengguna...</span>
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-4 max-w-lg">
          {users.map((user) => {
            const isAdmin = user.role === "ADMIN";
            const isLoading = selecting === user.id;

            return (
              <button
                key={user.id}
                onClick={() => handleSelect(user)}
                disabled={selecting !== null}
                className={cn(
                  "group flex flex-col items-center gap-3 w-40 p-6 rounded-2xl border-2 bg-white shadow-sm transition-all duration-150",
                  "hover:shadow-md hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed",
                  isAdmin
                    ? "border-purple-200 hover:border-purple-400"
                    : "border-blue-200 hover:border-blue-400",
                  isLoading && "border-blue-500 shadow-md -translate-y-1"
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                ) : (
                  <div className={cn(
                    "rounded-full p-3",
                    isAdmin ? "bg-purple-100" : "bg-blue-100"
                  )}>
                    {isAdmin
                      ? <Shield className="h-8 w-8 text-purple-600" />
                      : <UserCircle className="h-8 w-8 text-blue-600" />
                    }
                  </div>
                )}
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <span className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block",
                    isAdmin
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {isAdmin ? "Admin" : "Kasir"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center text-gray-400">
          <p>Belum ada pengguna terdaftar.</p>
          <p className="text-sm mt-1">Jalankan <code className="bg-gray-100 px-1 rounded">npm run db:seed</code> terlebih dahulu.</p>
        </div>
      )}
    </div>
  );
}
