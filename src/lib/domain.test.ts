import { describe, expect, it } from "vitest";
import {
  attachFile,
  createOrder,
  customerStats,
  isOverdue,
  lastOrderItems,
  markPaid,
  markShipped,
  normalizeInstagramId,
  orderTotal,
  updateCustomer,
  type Product,
  type ShopState,
} from "./domain";

const products: Product[] = [
  { id: "p1", name: "شمع کوچک", price: 260_000 },
  { id: "p2", name: "شمع بزرگ", price: 420_000 },
];

const T0 = "2026-11-10T08:00:00.000Z";
const hoursAfter = (iso: string, h: number) =>
  new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

function baseState(): ShopState {
  return {
    customers: [
      {
        id: "c1",
        name: "تینا امینی",
        instagramId: "tina_98",
        phone: "09120000001",
        city: "تهران",
        address: "خیابان نمونه، پلاک ۱",
        note: "",
      },
    ],
    orders: [],
  };
}

function stateWithOrder() {
  return createOrder(baseState(), {
    id: "o1",
    customerId: "c1",
    items: [
      { productId: "p1", quantity: 2 },
      { productId: "p2", quantity: 1 },
    ],
    products,
    now: T0,
  });
}

describe("createOrder", () => {
  it("adds an order awaiting payment with a price snapshot", () => {
    const state = stateWithOrder();
    expect(state.orders).toHaveLength(1);
    const order = state.orders[0];
    expect(order.status).toBe("awaiting_payment");
    expect(order.createdAt).toBe(T0);
    expect(orderTotal(order)).toBe(2 * 260_000 + 420_000);
  });

  it("keeps the old total when the product price changes later", () => {
    const order = stateWithOrder().orders[0];
    products[0].price = 300_000;
    expect(orderTotal(order)).toBe(940_000);
    products[0].price = 260_000;
  });

  it("rejects an order with no items", () => {
    expect(() =>
      createOrder(baseState(), { id: "o1", customerId: "c1", items: [], products, now: T0 }),
    ).toThrow();
  });

  it("rejects a quantity below one", () => {
    expect(() =>
      createOrder(baseState(), {
        id: "o1",
        customerId: "c1",
        items: [{ productId: "p1", quantity: 0 }],
        products,
        now: T0,
      }),
    ).toThrow();
  });

  it("rejects an unknown customer or product", () => {
    expect(() =>
      createOrder(baseState(), {
        id: "o1",
        customerId: "nope",
        items: [{ productId: "p1", quantity: 1 }],
        products,
        now: T0,
      }),
    ).toThrow();
    expect(() =>
      createOrder(baseState(), {
        id: "o1",
        customerId: "c1",
        items: [{ productId: "nope", quantity: 1 }],
        products,
        now: T0,
      }),
    ).toThrow();
  });
});

describe("markPaid", () => {
  it("moves an awaiting order to paid and stamps the time", () => {
    const paidAt = hoursAfter(T0, 3);
    const order = markPaid(stateWithOrder(), "o1", paidAt).orders[0];
    expect(order.status).toBe("paid");
    expect(order.paidAt).toBe(paidAt);
  });

  it("does not change an order that is already paid", () => {
    const first = markPaid(stateWithOrder(), "o1", hoursAfter(T0, 3));
    const second = markPaid(first, "o1", hoursAfter(T0, 9));
    expect(second.orders[0].paidAt).toBe(hoursAfter(T0, 3));
  });
});

describe("attachFile", () => {
  const file = { name: "receipt.png", type: "image/png", size: 1200, dataUrl: "data:image/png;base64,AA==" };

  it("is refused before the customer has paid", () => {
    expect(() => attachFile(stateWithOrder(), "o1", file)).toThrow();
  });

  it("is stored once the order is paid", () => {
    const paid = markPaid(stateWithOrder(), "o1", hoursAfter(T0, 1));
    expect(attachFile(paid, "o1", file).orders[0].attachment?.name).toBe("receipt.png");
  });
});

describe("markShipped", () => {
  it("is refused before payment", () => {
    expect(() => markShipped(stateWithOrder(), "o1", "2648", hoursAfter(T0, 1))).toThrow();
  });

  it("needs a tracking code", () => {
    const paid = markPaid(stateWithOrder(), "o1", hoursAfter(T0, 1));
    expect(() => markShipped(paid, "o1", "   ", hoursAfter(T0, 2))).toThrow();
  });

  it("stores the tracking code and the ship time", () => {
    const paid = markPaid(stateWithOrder(), "o1", hoursAfter(T0, 1));
    const order = markShipped(paid, "o1", " 264814731125 ", hoursAfter(T0, 5)).orders[0];
    expect(order.status).toBe("shipped");
    expect(order.trackingCode).toBe("264814731125");
    expect(order.shippedAt).toBe(hoursAfter(T0, 5));
  });
});

describe("isOverdue", () => {
  it("flags a paid order that has waited more than 48 hours", () => {
    const paid = markPaid(stateWithOrder(), "o1", T0).orders[0];
    expect(isOverdue(paid, hoursAfter(T0, 47))).toBe(false);
    expect(isOverdue(paid, hoursAfter(T0, 49))).toBe(true);
  });

  it("never flags unpaid or shipped orders", () => {
    const state = stateWithOrder();
    expect(isOverdue(state.orders[0], hoursAfter(T0, 500))).toBe(false);
    const shipped = markShipped(markPaid(state, "o1", T0), "o1", "1", hoursAfter(T0, 1)).orders[0];
    expect(isOverdue(shipped, hoursAfter(T0, 500))).toBe(false);
  });
});

describe("updateCustomer", () => {
  it("changes profile fields", () => {
    const state = updateCustomer(baseState(), "c1", { instagramId: "@Tina.New ", city: "کرج" });
    expect(state.customers[0].instagramId).toBe("tina.new");
    expect(state.customers[0].city).toBe("کرج");
  });

  it("ignores fields that are not part of the profile", () => {
    const patch = { id: "hacked", ordersCount: 99 } as unknown as Parameters<typeof updateCustomer>[2];
    const state = updateCustomer(baseState(), "c1", patch);
    expect(state.customers[0].id).toBe("c1");
    expect(state.customers[0]).not.toHaveProperty("ordersCount");
  });
});

describe("normalizeInstagramId", () => {
  it("strips the @, spaces and upper case", () => {
    expect(normalizeInstagramId("  @Noora.Candle ")).toBe("noora.candle");
  });
});

describe("customerStats and lastOrderItems", () => {
  it("counts orders and sums only paid money", () => {
    let state = stateWithOrder();
    state = createOrder(state, {
      id: "o2",
      customerId: "c1",
      items: [{ productId: "p2", quantity: 1 }],
      products,
      now: hoursAfter(T0, 24),
    });
    state = markPaid(state, "o1", hoursAfter(T0, 2));
    const stats = customerStats(state, "c1");
    expect(stats.ordersCount).toBe(2);
    expect(stats.paidTotal).toBe(940_000);
    expect(stats.awaitingPayment).toBe(1);
    expect(stats.toShip).toBe(1);
    expect(stats.lastOrderAt).toBe(hoursAfter(T0, 24));
  });

  it("returns the items of the most recent order for a repeat purchase", () => {
    let state = stateWithOrder();
    state = createOrder(state, {
      id: "o2",
      customerId: "c1",
      items: [{ productId: "p2", quantity: 3 }],
      products,
      now: hoursAfter(T0, 24),
    });
    expect(lastOrderItems(state, "c1")).toEqual([{ productId: "p2", quantity: 3 }]);
    expect(lastOrderItems(state, "nobody")).toEqual([]);
  });
});
