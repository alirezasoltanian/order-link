import type { Order, OrderStatus } from "./domain";

const numberFormat = new Intl.NumberFormat("fa-IR");
const dateFormat = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export const faNumber = (value: number) => numberFormat.format(value);
export const toman = (value: number) => `${numberFormat.format(value)} تومان`;
export const faDate = (iso: string | null | undefined) => (iso ? dateFormat.format(new Date(iso)) : "—");
export const faDateTime = (iso: string | null | undefined) =>
  iso ? dateTimeFormat.format(new Date(iso)) : "—";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "منتظر پرداخت",
  paid: "پرداخت شد، آمادهٔ ارسال",
  shipped: "ارسال شد",
};

export function itemsSummary(order: Order): string {
  return order.items.map((item) => `${faNumber(item.quantity)} × ${item.name}`).join("، ");
}
