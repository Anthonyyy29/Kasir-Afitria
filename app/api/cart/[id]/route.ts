import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getCartAndVerify(id: string, userId: string, userRole: string) {
  const cart = await prisma.cartSession.findUnique({ where: { id } });
  if (!cart) return null;
  if (cart.kasirId !== userId && userRole !== "ADMIN") return "forbidden";
  return cart;
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const cart = await prisma.cartSession.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    return NextResponse.json(cart);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { customerId, items, discountAmount, discountReason } = body;

    const updated = await prisma.cartSession.update({
      where: { id },
      data: {
        ...(customerId !== undefined && { customerId: customerId ?? null }),
        ...(items !== undefined && { items }),
        ...(discountAmount !== undefined && { discountAmount }),
        ...(discountReason !== undefined && { discountReason: discountReason ?? null }),
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const result = await getCartAndVerify(id, session.user.id, session.user.role as string);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.cartSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
