import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const subs = await prisma.subCategory.findMany({ include: { category: true }, orderBy: { name: "asc" } });
  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { name, categoryId } = await req.json();
  const sub = await prisma.subCategory.create({ data: { name, categoryId }, include: { category: true } });
  return NextResponse.json(sub);
}
