export type OrderStatus = "awaiting_payment" | "paid" | "shipped";

export interface Product {
  id: string;
  name: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  instagramId: string;
  phone: string;
  city: string;
  address: string;
  note: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  /** Price at the time of ordering, so later price changes do not rewrite old orders. */
  unitPrice: number;
}

export interface Attachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  trackingCode?: string;
  attachment?: Attachment;
}

export interface ShopState {
  customers: Customer[];
  orders: Order[];
}

export const OVERDUE_HOURS = 48;

export const EDITABLE_CUSTOMER_FIELDS = [
  "name",
  "instagramId",
  "phone",
  "city",
  "address",
  "note",
] as const;

export type EditableCustomerField = (typeof EDITABLE_CUSTOMER_FIELDS)[number];
export type CustomerPatch = Partial<Pick<Customer, EditableCustomerField>>;

export function orderTotal(order: Order): number {
  return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function normalizeInstagramId(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function replaceOrder(state: ShopState, orderId: string, change: (order: Order) => Order): ShopState {
  if (!state.orders.some((order) => order.id === orderId)) {
    throw new Error(`Order ${orderId} not found`);
  }
  return {
    ...state,
    orders: state.orders.map((order) => (order.id === orderId ? change(order) : order)),
  };
}

export interface CreateOrderInput {
  id: string;
  customerId: string;
  items: { productId: string; quantity: number }[];
  products: Product[];
  now: string;
}

export function createOrder(state: ShopState, input: CreateOrderInput): ShopState {
  if (!state.customers.some((customer) => customer.id === input.customerId)) {
    throw new Error("Customer not found");
  }
  if (input.items.length === 0) {
    throw new Error("An order needs at least one item");
  }
  const items = input.items.map(({ productId, quantity }): OrderItem => {
    const product = input.products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error(`Product ${productId} not found`);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error("Quantity must be a whole number of at least 1");
    }
    return { productId, name: product.name, quantity, unitPrice: product.price };
  });
  const order: Order = {
    id: input.id,
    customerId: input.customerId,
    items,
    status: "awaiting_payment",
    createdAt: input.now,
  };
  return { ...state, orders: [...state.orders, order] };
}

/** Paying twice must not move the payment time, so a second call is a no-op. */
export function markPaid(state: ShopState, orderId: string, now: string): ShopState {
  return replaceOrder(state, orderId, (order) =>
    order.status === "awaiting_payment" ? { ...order, status: "paid", paidAt: now } : order,
  );
}

export function attachFile(state: ShopState, orderId: string, attachment: Attachment): ShopState {
  return replaceOrder(state, orderId, (order) => {
    if (order.status === "awaiting_payment") {
      throw new Error("A file can only be attached after the customer has paid");
    }
    return { ...order, attachment };
  });
}

export function removeAttachment(state: ShopState, orderId: string): ShopState {
  return replaceOrder(state, orderId, ({ attachment: _removed, ...order }) => order);
}

export function markShipped(
  state: ShopState,
  orderId: string,
  trackingCode: string,
  now: string,
): ShopState {
  const code = trackingCode.trim();
  return replaceOrder(state, orderId, (order) => {
    if (order.status === "awaiting_payment") {
      throw new Error("An unpaid order cannot be shipped");
    }
    if (!code) throw new Error("A tracking code is required");
    return { ...order, status: "shipped", trackingCode: code, shippedAt: order.shippedAt ?? now };
  });
}

/** The main success metric of the product: money received, parcel not sent, 48 hours gone. */
export function isOverdue(order: Order, now: string): boolean {
  if (order.status !== "paid" || !order.paidAt) return false;
  const waitedMs = new Date(now).getTime() - new Date(order.paidAt).getTime();
  return waitedMs > OVERDUE_HOURS * 3_600_000;
}

export function updateCustomer(state: ShopState, customerId: string, patch: CustomerPatch): ShopState {
  const allowed: CustomerPatch = {};
  for (const field of EDITABLE_CUSTOMER_FIELDS) {
    const value = patch[field];
    if (typeof value !== "string") continue;
    allowed[field] = field === "instagramId" ? normalizeInstagramId(value) : value;
  }
  return {
    ...state,
    customers: state.customers.map((customer) =>
      customer.id === customerId ? { ...customer, ...allowed } : customer,
    ),
  };
}

export interface CustomerStats {
  ordersCount: number;
  paidTotal: number;
  awaitingPayment: number;
  toShip: number;
  overdue: number;
  lastOrderAt: string | null;
}

export function customerOrders(state: ShopState, customerId: string): Order[] {
  return state.orders
    .filter((order) => order.customerId === customerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function customerStats(state: ShopState, customerId: string, now?: string): CustomerStats {
  const orders = customerOrders(state, customerId);
  return {
    ordersCount: orders.length,
    paidTotal: orders
      .filter((order) => order.status !== "awaiting_payment")
      .reduce((sum, order) => sum + orderTotal(order), 0),
    awaitingPayment: orders.filter((order) => order.status === "awaiting_payment").length,
    toShip: orders.filter((order) => order.status === "paid").length,
    overdue: now ? orders.filter((order) => isOverdue(order, now)).length : 0,
    lastOrderAt: orders[0]?.createdAt ?? null,
  };
}

/** Feeds the "same as last time" button: the items of the customer's most recent order. */
export function lastOrderItems(
  state: ShopState,
  customerId: string,
): { productId: string; quantity: number }[] {
  const latest = customerOrders(state, customerId)[0];
  return latest ? latest.items.map(({ productId, quantity }) => ({ productId, quantity })) : [];
}
