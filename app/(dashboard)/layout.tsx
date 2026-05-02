import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { prisma } from "@/lib/prisma";

async function getLowStockCount(): Promise<number> {
  try {
    const variants = await prisma.productVariant.findMany({
      select: { stock: true, product: { select: { lowStockThreshold: true } } },
    });
    return variants.filter((v) => v.stock <= v.product.lowStockThreshold).length;
  } catch {
    return 0;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const lowStockCount = session.user.role === "ADMIN" ? await getLowStockCount() : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar lowStockCount={lowStockCount} />
      <main className="pl-64">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
