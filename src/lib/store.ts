"use client";

import * as React from "react";
import seed from "@/data/seed.json";
import {
  attachFile,
  createOrder,
  markPaid,
  markShipped,
  removeAttachment,
  updateCustomer,
  type Attachment,
  type CustomerPatch,
  type Product,
  type ShopState,
} from "./domain";

/**
 * Demo persistence: static JSON seed + the visitor's own localStorage.
 * A real version replaces this file with API calls to a database behind seller login.
 */
const STORAGE_KEY = "order-link:shop:v1";

export const shop = seed.shop;
export const products: Product[] = seed.products;

const seedState: ShopState = {
  customers: seed.customers,
  orders: seed.orders as ShopState["orders"],
};

let state: ShopState = seedState;
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): ShopState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState;
    const parsed = JSON.parse(raw) as ShopState;
    if (Array.isArray(parsed.customers) && Array.isArray(parsed.orders)) return parsed;
  } catch {
    // Unreadable or blocked storage: fall back to the seed so the page still works.
  }
  return seedState;
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = readStorage();
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state = readStorage();
    for (const listener of listeners) listener();
  });
}

function commit(next: ShopState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the change still lives in memory for this tab.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureLoaded();
  return state;
}

function getServerSnapshot() {
  return seedState;
}

export function useShopState(): ShopState {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** False during server render and hydration, true once localStorage has been read. */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function newOrderId(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

const nowIso = () => new Date().toISOString();

export const shopActions = {
  updateCustomer(customerId: string, patch: CustomerPatch) {
    commit(updateCustomer(getSnapshot(), customerId, patch));
  },
  createOrder(customerId: string, items: { productId: string; quantity: number }[]): string {
    const id = newOrderId();
    commit(createOrder(getSnapshot(), { id, customerId, items, products, now: nowIso() }));
    return id;
  },
  markPaid(orderId: string) {
    commit(markPaid(getSnapshot(), orderId, nowIso()));
  },
  markShipped(orderId: string, trackingCode: string) {
    commit(markShipped(getSnapshot(), orderId, trackingCode, nowIso()));
  },
  attachFile(orderId: string, attachment: Attachment) {
    commit(attachFile(getSnapshot(), orderId, attachment));
  },
  removeAttachment(orderId: string) {
    commit(removeAttachment(getSnapshot(), orderId));
  },
  reset() {
    commit(seedState);
  },
};

export function orderUrl(orderId: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/o/${orderId}`;
}
