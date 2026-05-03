import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
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
    <DashboardShell lowStockCount={lowStockCount}>
      {children}
    </DashboardShell>
  );
}
