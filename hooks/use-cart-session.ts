"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  variantInfo: string;
  price: number;
  basePrice: number;
  quantity: number;
  stock: number;
  unit: string;
}

export interface CartSessionData {
  id: string;
  customerId: string | null;
  kasirId: string;
  items: CartItem[];
  discountAmount: number;
  discountReason: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; name: string; phone: string | null } | null;
}

interface SyncPayload {
  customerId?: string | null;
  items?: CartItem[];
  discountAmount?: number;
  discountReason?: string | null;
}

const ACTIVE_CART_KEY = "kasir_active_cart_id";

export function useCartSession() {
  const [sessions, setSessions] = useState<CartSessionData[]>([]);
  const [activeCartId, setActiveCartId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSyncRef = useRef<SyncPayload>({});

  const activeSession = sessions.find((s) => s.id === activeCartId) ?? null;

  const fetchSessions = useCallback(async (): Promise<CartSessionData[]> => {
    const res = await fetch("/api/cart");
    if (!res.ok) return [];
    return res.json();
  }, []);

  const activateCart = useCallback((id: string, allSessions: CartSessionData[]) => {
    setActiveCartId(id);
    localStorage.setItem(ACTIVE_CART_KEY, id);
    setSessions(allSessions);
  }, []);

  const createNewCart = useCallback(async (existingSessions: CartSessionData[]): Promise<CartSessionData | null> => {
    const res = await fetch("/api/cart", { method: "POST" });
    if (!res.ok) return null;
    const newCart: CartSessionData = await res.json();
    const updated = [...existingSessions, newCart];
    activateCart(newCart.id, updated);
    return newCart;
  }, [activateCart]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const data = await fetchSessions();
      const stored = localStorage.getItem(ACTIVE_CART_KEY);
      const validStored = data.find((s) => s.id === stored);

      if (validStored) {
        setSessions(data);
        setActiveCartId(validStored.id);
      } else if (data.length > 0) {
        setSessions(data);
        setActiveCartId(data[0].id);
        localStorage.setItem(ACTIVE_CART_KEY, data[0].id);
      } else {
        await createNewCart([]);
      }
      setIsLoading(false);
    }
    init();
  }, [fetchSessions, createNewCart]);

  const createSession = useCallback(async (): Promise<string | null> => {
    const res = await fetch("/api/cart", { method: "POST" });
    if (!res.ok) return null;
    const newCart: CartSessionData = await res.json();
    setSessions((prev) => [...prev, newCart]);
    setActiveCartId(newCart.id);
    localStorage.setItem(ACTIVE_CART_KEY, newCart.id);
    return newCart.id;
  }, []);

  const switchSession = useCallback((id: string) => {
    setActiveCartId(id);
    localStorage.setItem(ACTIVE_CART_KEY, id);
  }, []);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    const res = await fetch(`/api/cart/${id}`, { method: "DELETE" });
    if (!res.ok) return;

    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (id === activeCartId) {
        if (remaining.length > 0) {
          setActiveCartId(remaining[0].id);
          localStorage.setItem(ACTIVE_CART_KEY, remaining[0].id);
        } else {
          setActiveCartId(null);
          localStorage.removeItem(ACTIVE_CART_KEY);
        }
      }
      return remaining;
    });
  }, [activeCartId]);

  // If all sessions deleted, auto-create a new one
  useEffect(() => {
    if (!isLoading && sessions.length === 0 && activeCartId === null) {
      createNewCart([]);
    }
  }, [sessions.length, activeCartId, isLoading, createNewCart]);

  // Debounced sync: merges partial payloads, sends all at once
  const syncToDb = useCallback((id: string, data: SyncPayload) => {
    pendingSyncRef.current = { ...pendingSyncRef.current, ...data };
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const payload = pendingSyncRef.current;
      pendingSyncRef.current = {};
      await fetch(`/api/cart/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...payload } : s))
      );
    }, 500);
  }, []);

  return {
    sessions,
    activeCartId,
    activeSession,
    isLoading,
    createSession,
    switchSession,
    deleteSession,
    syncToDb,
  };
}
