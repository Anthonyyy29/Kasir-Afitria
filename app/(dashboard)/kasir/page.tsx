"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, Receipt, Loader2, UserCheck, Truck, Eye, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatRupiah } from "@/lib/utils";
import { useCartSession, type CartItem } from "@/hooks/use-cart-session";
import { CartPanel, CartPanelButton } from "@/components/kasir/cart-panel";

interface Variant { id: string; colorId: string | null; sizeId: string | null; basePrice: string; color: { name: string; hex: string | null } | null; size: { name: string } | null; }
interface Product { id: string; name: string; unit: { name: string }; variants: Variant[]; }
interface Customer { id: string; name: string; phone: string | null; customerPrices: { productVariantId: string; price: string }[]; }

export default function KasirPage() {
  const { toast } = useToast();
  const {
    sessions,
    activeCartId,
    activeSession,
    isLoading: sessionLoading,
    createSession,
    switchSession,
    deleteSession,
    syncToDb,
  } = useCartSession();

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const isSwitchingRef = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Record<string, unknown> | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mobileTab, setMobileTab] = useState<"produk" | "keranjang">("produk");
  const [isCartCollapsed, setIsCartCollapsed] = useState(false);
  const [pendingCustomerId, setPendingCustomerId] = useState<string | null>(null);
  const [confirmChangeCustomer, setConfirmChangeCustomer] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const customerBoxRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const [pRes, cRes] = await Promise.all([fetch("/api/produk"), fetch("/api/pelanggan")]);
    if (pRes.ok) setProducts(await pRes.json());
    if (cRes.ok) setCustomers(await cRes.json());
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    setCustomerQuery(selectedCustomer?.name ?? "");
  }, [selectedCustomer]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerBoxRef.current && !customerBoxRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(customerQuery.trim().toLowerCase())
  );

  useEffect(() => {
    if (!activeSession || sessionLoading) return;
    isSwitchingRef.current = true;
    setCart(activeSession.items);
    setShippingCost(activeSession.shippingCost ?? 0);

    if (activeSession.customerId) {
      setLoadingCustomer(true);
      fetch(`/api/pelanggan/${activeSession.customerId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((c) => setSelectedCustomer(c ?? null))
        .catch(() => setSelectedCustomer(null))
        .finally(() => {
          setLoadingCustomer(false);
          isSwitchingRef.current = false;
        });
    } else {
      setSelectedCustomer(null);
      isSwitchingRef.current = false;
    }
  }, [activeCartId, sessionLoading]);

  useEffect(() => {
    if (isSwitchingRef.current || !activeCartId || sessionLoading) return;
    syncToDb(activeCartId, {
      customerId: selectedCustomer?.id ?? null,
      items: cart,
      discountAmount: 0,
      discountReason: null,
      shippingCost,
    });
  }, [cart, selectedCustomer, shippingCost, activeCartId, syncToDb, sessionLoading]);

  async function handleSelectCustomer(customerId: string) {
    if (!customerId) { setSelectedCustomer(null); recalcCartPrices(null); return; }
    // Jika sudah ada pelanggan & keranjang tidak kosong → minta konfirmasi dulu
    if (selectedCustomer && cart.length > 0 && customerId !== selectedCustomer.id) {
      setPendingCustomerId(customerId);
      setConfirmChangeCustomer(true);
      return;
    }
    await applyCustomer(customerId);
  }

  async function applyCustomer(customerId: string) {
    setLoadingCustomer(true);
    const res = await fetch(`/api/pelanggan/${customerId}`);
    if (res.ok) {
      const customer = await res.json();
      setSelectedCustomer(customer);
      recalcCartPrices(customer);
    }
    setLoadingCustomer(false);
  }

  function recalcCartPrices(customer: Customer | null) {
    setCart((prev) =>
      prev.map((item) => {
        if (!customer) return { ...item, price: item.basePrice };
        const cp = customer.customerPrices.find((p) => p.productVariantId === item.variantId);
        return { ...item, price: cp ? parseFloat(cp.price) : item.basePrice };
      })
    );
  }

  function getPrice(variantId: string, basePrice: string): number {
    if (!selectedCustomer) return parseFloat(basePrice);
    const cp = selectedCustomer.customerPrices.find((p) => p.productVariantId === variantId);
    return cp ? parseFloat(cp.price) : parseFloat(basePrice);
  }

  function addToCart(product: Product, variant: Variant) {
    const existing = cart.find((i) => i.variantId === variant.id);
    if (existing) {
      setCart(cart.map((i) => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      const vInfo = [variant.color?.name, variant.size?.name].filter(Boolean).join(" / ");
      const price = getPrice(variant.id, variant.basePrice);
      setCart([...cart, {
        variantId: variant.id,
        productId: product.id,
        productName: product.name,
        variantInfo: vInfo,
        price,
        basePrice: parseFloat(variant.basePrice),
        quantity: 1,
        unit: product.unit.name,
      }]);
    }
  }

  function updateQty(variantId: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.variantId === variantId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i)
    );
  }

  function setQty(variantId: string, value: number) {
    const qty = Math.max(1, isNaN(value) ? 1 : value);
    setCart((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
  }

  function removeFromCart(variantId: string) { setCart(cart.filter((i) => i.variantId !== variantId)); }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + shippingCost;
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);
  const payment = parseFloat(paymentAmount || "0");
  const change = payment - total;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCheckout() {
    if (!selectedCustomer) { toast({ title: "Pilih pelanggan terlebih dahulu", variant: "destructive" }); return; }
    if (cart.length === 0) { toast({ title: "Keranjang kosong", variant: "destructive" }); return; }
    if (payment < total) { toast({ title: "Jumlah bayar kurang", variant: "destructive" }); return; }

    setProcessing(true);
    const res = await fetch("/api/transaksi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: selectedCustomer.id,
        items: cart.map((i) => ({
          productVariantId: i.variantId,
          productName: i.productName,
          variantInfo: i.variantInfo,
          quantity: i.quantity,
          priceAtSale: i.price,
        })),
        discountAmount: 0,
        discountReason: null,
        shippingCost,
        paymentAmount: payment,
      }),
    });

    if (res.ok) {
      const trx = await res.json();
      const trxWithUnit = {
        ...trx,
        items: trx.items.map((item: { productVariantId: string }) => ({
          ...item,
          unit: cart.find((c) => c.variantId === item.productVariantId)?.unit ?? "pcs",
        })),
      };
      setLastTransaction(trxWithUnit);
      setCart([]);
      setPaymentAmount("");
      setShippingCost(0);
      setCheckoutDialogOpen(false);
      setReceiptDialogOpen(true);
      await loadData();
      if (activeCartId) await deleteSession(activeCartId);
      toast({ title: "Transaksi berhasil!" });
    } else {
      toast({ title: "Transaksi gagal", variant: "destructive" });
    }
    setProcessing(false);
  }

  async function printReceipt() {
    if (!lastTransaction) return;
    const { generateReceiptPDF } = await import("@/lib/pdf");
    const doc = await generateReceiptPDF(lastTransaction as unknown as Parameters<typeof generateReceiptPDF>[0]);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  }

  async function printNota() {
    if (!lastTransaction) return;
    const { generateNotaPDF } = await import("@/lib/pdf");
    const doc = await generateNotaPDF(lastTransaction as unknown as Parameters<typeof generateNotaPDF>[0]);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  }

  async function printSuratJalan() {
    if (!lastTransaction) return;
    const { generateSuratJalanPDF } = await import("@/lib/pdf");
    const doc = await generateSuratJalanPDF(lastTransaction as unknown as Parameters<typeof generateSuratJalanPDF>[0]);
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-4.5rem)] lg:h-[calc(100vh-5.5rem)]">
      {/* Tab switcher — mobile only */}
      <div className="flex lg:hidden rounded-lg bg-gray-100 p-1 gap-1 shrink-0">
        <button
          onClick={() => setMobileTab("produk")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mobileTab === "produk" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          Produk
        </button>
        <button
          onClick={() => setMobileTab("keranjang")}
          className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${mobileTab === "keranjang" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
        >
          Keranjang
          {cart.length > 0 && (
            <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {totalQty}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
      {/* Kiri: Produk */}
      <div className={`flex-1 flex-col gap-3 min-w-0 ${mobileTab === "keranjang" ? "hidden lg:flex" : "flex"}`}>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input className="pl-9" placeholder="Cari produk..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <CartPanelButton
              count={sessions.length}
              onClick={() => setIsPanelOpen(true)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative" ref={customerBoxRef}>
              <Input
                placeholder="Cari pelanggan..."
                value={customerQuery}
                onChange={(e) => { setCustomerQuery(e.target.value); setCustomerDropdownOpen(true); }}
                onFocus={(e) => { setCustomerDropdownOpen(true); e.target.select(); }}
                className={selectedCustomer ? "border-blue-400 bg-blue-50" : ""}
              />
              {customerDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-gray-400">Pelanggan tidak ditemukan</p>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleSelectCustomer(c.id);
                          setCustomerDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2"
                      >
                        <span>{c.name}</span>
                        {c.phone && <span className="text-xs text-gray-400">{c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {loadingCustomer && <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />}
            {selectedCustomer && <Badge variant="success" className="gap-1 whitespace-nowrap shrink-0"><UserCheck className="h-3 w-3" />{selectedCustomer.name}</Badge>}
          </div>
        </div>

        {!selectedCustomer && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm text-yellow-700">
            Pilih pelanggan terlebih dahulu agar harga khusus diterapkan.
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="shadow-none">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{product.name}</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => {
                    const price = getPrice(v.id, v.basePrice);
                    const hasCustomPrice = selectedCustomer?.customerPrices.some((cp) => cp.productVariantId === v.id);
                    const vLabel = [v.color?.name, v.size?.name].filter(Boolean).join("/") || "Default";
                    return (
                      <button
                        key={v.id}
                        onClick={() => addToCart(product, v)}
                        className={`group flex flex-col items-start border rounded-lg px-3 py-2 text-left transition-all hover:border-blue-400 hover:bg-blue-50 ${hasCustomPrice ? "border-green-400 bg-green-50" : ""}`}
                      >
                        <div className="flex items-center gap-1.5">
                          {v.color?.hex && <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: v.color.hex }} />}
                          <span className="text-xs font-medium">{vLabel}</span>
                        </div>
                        <span className="text-sm font-bold text-blue-600 mt-0.5">{formatRupiah(price)}</span>
                        {hasCustomPrice && <span className="text-[10px] text-green-600 font-medium">Harga khusus</span>}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Kanan: Cart */}
      <div className={`flex-col gap-3 w-full lg:transition-[width] lg:duration-200 ${isCartCollapsed ? "lg:w-10" : "lg:w-80"} ${mobileTab === "produk" ? "hidden lg:flex" : "flex"}`}>
        {/* Desktop collapsed strip */}
        {isCartCollapsed && (
          <div
            className="hidden lg:flex flex-col items-center gap-2 py-3 border rounded-xl bg-white cursor-pointer flex-1 hover:bg-gray-50 transition-colors"
            onClick={() => setIsCartCollapsed(false)}
          >
            <ChevronLeft className="h-4 w-4 text-gray-500 rotate-180" />
            {cart.length > 0 && (
              <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center leading-none">
                {totalQty > 99 ? "99+" : totalQty}
              </span>
            )}
          </div>
        )}

        {/* Expanded content: always on mobile, conditional on desktop */}
        <div className={`flex flex-col flex-1 gap-3 min-h-0 ${isCartCollapsed ? "flex lg:hidden" : "flex"}`}>
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="flex-1">Keranjang ({cart.length} item · {totalQty} pcs)</span>
              <button
                onClick={() => setIsCartCollapsed(true)}
                className="hidden lg:flex items-center justify-center h-5 w-5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                title="Sembunyikan keranjang"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <ShoppingCart className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Keranjang kosong</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.variantId} className="px-4 py-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.productName}</p>
                        {item.variantInfo && <p className="text-xs text-gray-500">{item.variantInfo}</p>}
                        <p className="text-xs text-blue-600 font-medium">{formatRupiah(item.price)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.variantId)} className="text-red-400 hover:text-red-600 ml-2 mt-0.5">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.variantId, -1)} className="rounded border w-6 h-6 flex items-center justify-center hover:bg-gray-100">
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => setQty(item.variantId, parseInt(e.target.value))}
                          onFocus={(e) => e.target.select()}
                          className="text-sm font-medium text-center border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-[width] duration-100"
                          style={{ width: `${Math.max(4, String(item.quantity).length + 3)}ch` }}
                        />
                        <button onClick={() => updateQty(item.variantId, 1)} className="rounded border w-6 h-6 flex items-center justify-center hover:bg-gray-100">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold">{formatRupiah(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary & Checkout */}
        <Card className="shadow-none">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span>Ongkos Kirim</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={shippingCost ? shippingCost.toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setShippingCost(digits ? parseInt(digits, 10) : 0);
                  }}
                  placeholder="0"
                  className="w-32 text-right text-sm border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border-t pt-2 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-blue-600">{formatRupiah(total)}</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                disabled={cart.length === 0}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={cart.length === 0 || !selectedCustomer}
                onClick={() => { setPaymentAmount(String(total)); setCheckoutDialogOpen(true); }}
              >
                <Receipt className="h-4 w-4" />
                Bayar
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>{/* end expanded content */}
      </div>
      </div>

      <CartPanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        sessions={sessions}
        activeCartId={activeCartId}
        onSwitch={(id) => { switchSession(id); setIsPanelOpen(false); }}
        onDelete={deleteSession}
        onCreateNew={async () => { await createSession(); setIsPanelOpen(false); }}
      />

      {/* Dialog konfirmasi ganti pelanggan */}
      <Dialog open={confirmChangeCustomer} onOpenChange={(open) => { if (!open) { setConfirmChangeCustomer(false); setPendingCustomerId(null); } }}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ganti Pelanggan?</DialogTitle>
            <DialogDescription>
              Keranjang sudah berisi barang untuk <strong>{selectedCustomer?.name}</strong>. Mengganti pelanggan akan menyesuaikan ulang harga khusus. Barang di keranjang tetap ada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setConfirmChangeCustomer(false); setPendingCustomerId(null); }}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setConfirmChangeCustomer(false);
                if (pendingCustomerId) await applyCustomer(pendingCustomerId);
                setPendingCustomerId(null);
              }}
            >
              Ganti Pelanggan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview Keranjang */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Pesanan
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {selectedCustomer ? selectedCustomer.name : "Tanpa pelanggan"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">No</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center w-16">Qty</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.map((item, idx) => (
                  <TableRow key={item.variantId}>
                    <TableCell className="py-2 text-gray-400">{idx + 1}</TableCell>
                    <TableCell className="py-2">
                      <p className="text-sm font-medium">{item.productName}</p>
                      {item.variantInfo && <p className="text-xs text-gray-500">{item.variantInfo}</p>}
                    </TableCell>
                    <TableCell className="py-2 text-center text-sm">{item.quantity}</TableCell>
                    <TableCell className="py-2 text-right text-sm">{formatRupiah(item.price)}</TableCell>
                    <TableCell className="py-2 text-right text-sm font-medium">{formatRupiah(item.price * item.quantity)}</TableCell>
                  </TableRow>
                ))}
                {shippingCost > 0 && (
                  <>
                    <TableRow className="border-t">
                      <TableCell colSpan={4} className="py-1 text-sm text-right text-gray-500">Subtotal</TableCell>
                      <TableCell className="py-1 text-right text-sm text-gray-500">{formatRupiah(subtotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={4} className="py-1 text-sm text-right text-gray-500">Ongkos Kirim</TableCell>
                      <TableCell className="py-1 text-right text-sm text-gray-500">+{formatRupiah(shippingCost)}</TableCell>
                    </TableRow>
                  </>
                )}
                <TableRow className="border-t-2 font-bold bg-gray-50">
                  <TableCell colSpan={2} className="py-2 text-sm">Total</TableCell>
                  <TableCell className="py-2 text-center text-sm">{totalQty}</TableCell>
                  <TableCell />
                  <TableCell className="py-2 text-right text-sm text-blue-600">{formatRupiah(total)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Checkout */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            <DialogDescription className="sr-only">Konfirmasi total belanja dan input jumlah uang diterima</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="overflow-x-auto">
            <Table>
              <TableBody>
                {cart.map((i) => (
                  <TableRow key={i.variantId}>
                    <TableCell className="py-1.5">
                      <p className="text-sm font-medium">{i.productName}</p>
                      {i.variantInfo && <p className="text-xs text-gray-500">{i.variantInfo}</p>}
                    </TableCell>
                    <TableCell className="py-1.5 text-center text-sm">x{i.quantity}</TableCell>
                    <TableCell className="py-1.5 text-right text-sm font-medium">{formatRupiah(i.price * i.quantity)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
              {shippingCost > 0 && (
                <>
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Ongkos Kirim</span><span>+{formatRupiah(shippingCost)}</span></div>
                  <div className="border-t pt-1.5" />
                </>
              )}
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-blue-600">{formatRupiah(total)}</span></div>
            </div>

            <div className="space-y-2">
              <Label>Jumlah Uang Diterima (Rp)</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="text-lg font-bold" />
              {payment >= total && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex justify-between text-sm">
                  <span className="text-green-700">Kembalian</span>
                  <span className="font-bold text-green-700">{formatRupiah(change)}</span>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Batal</Button>
            <Button onClick={handleCheckout} disabled={processing || payment < total} className="gap-2">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
              Selesaikan Transaksi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Struk */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Transaksi Berhasil!</DialogTitle>
            <DialogDescription className="sr-only">Transaksi selesai. Unduh nota atau cetak struk dan surat jalan.</DialogDescription>
          </DialogHeader>
          {lastTransaction && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{formatRupiah((lastTransaction as { totalAmount: number }).totalAmount)}</p>
                <p className="text-sm text-gray-500 mt-1">No: {(lastTransaction as { transactionNumber: string }).transactionNumber}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={printNota}>
                  <Printer className="h-4 w-4" />Cetak Nota
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={printReceipt}>
                  <Printer className="h-4 w-4" />Cetak Struk
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={printSuratJalan}>
                  <Truck className="h-4 w-4" />Surat Jalan
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
