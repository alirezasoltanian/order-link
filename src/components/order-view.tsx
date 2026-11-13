"use client";

import { Check, CreditCard, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { DemoNotice } from "@/components/demo-notice";
import { Button } from "@/components/ui/button";
import { orderTotal, type OrderStatus } from "@/lib/domain";
import { faDateTime, faNumber, toman } from "@/lib/fa";
import { shop, shopActions, useHydrated, useShopState } from "@/lib/store";
import { cn } from "@/lib/utils";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "awaiting_payment", label: "سفارش ثبت شد" },
  { status: "paid", label: "پرداخت شد" },
  { status: "shipped", label: "ارسال شد" },
];

function Steps({ status }: { status: OrderStatus }) {
  const reached = STEPS.findIndex((step) => step.status === status);
  return (
    <ol className="flex items-center" aria-label="مراحل سفارش">
      {STEPS.map((step, index) => {
        const done = index <= reached;
        return (
          <li key={step.status} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border font-medium text-sm",
                  done ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 text-zinc-500",
                )}
              >
                {done ? <Check className="size-4" aria-hidden /> : faNumber(index + 1)}
              </span>
              <span className={cn("whitespace-nowrap text-xs", done ? "font-medium" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                className={cn("mx-2 mb-6 h-0.5 flex-1", index < reached ? "bg-emerald-600" : "bg-zinc-200")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function OrderView({ orderId }: { orderId: string }) {
  const state = useShopState();
  const hydrated = useHydrated();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  const customer = order ? state.customers.find((candidate) => candidate.id === order.customerId) : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-6">
      <header>
        <p className="text-muted-foreground text-sm">سفارش شما از</p>
        <h1 className="font-bold text-xl">{shop.name}</h1>
      </header>

      {!order ? (
        <section className="rounded-lg border bg-card p-5 text-sm leading-7">
          {hydrated ? (
            <>
              <p className="font-medium">این سفارش در این مرورگر پیدا نشد.</p>
              <p className="mt-1 text-muted-foreground">
                این نسخهٔ نمایشی پایگاه داده ندارد و هر سفارش فقط در مرورگری که ساخته شده ذخیره می‌شود. لینک را
                در همان مرورگری باز کنید که سفارش را در آن ساخته‌اید.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">در حال خواندن سفارش…</p>
          )}
        </section>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-5">
            <Steps status={order.status} />
          </section>

          <section className="rounded-lg border bg-card p-5 text-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>کد سفارش: <span dir="ltr">{order.id}</span></span>
              <span>{faDateTime(order.createdAt)}</span>
            </div>
            <ul className="mt-3 divide-y">
              {order.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    {item.name} <span className="text-muted-foreground">× {faNumber(item.quantity)}</span>
                  </span>
                  <span className="whitespace-nowrap">{toman(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="flex items-center justify-between border-t pt-3 font-semibold">
              <span>مبلغ قابل پرداخت</span>
              <span>{toman(orderTotal(order))}</span>
            </p>
            {customer && (
              <p className="mt-3 rounded-md bg-muted px-3 py-2 text-muted-foreground text-xs leading-6">
                گیرنده: {customer.name}
                <br />
                آدرس: {customer.address || "ثبت نشده"}
              </p>
            )}
          </section>

          {order.status === "awaiting_payment" && (
            <>
              <Button
                size="lg"
                className="h-12 text-base"
                onClick={() => {
                  shopActions.markPaid(order.id);
                  toast.success("پرداخت ثبت شد");
                }}
              >
                <CreditCard className="size-5" aria-hidden />
                پرداخت {toman(orderTotal(order))}
              </Button>
              <DemoNotice
                title="پرداخت در این نسخه واقعی نیست"
                items={[
                  "با زدن دکمه، سفارش بدون جابه‌جایی پول «پرداخت‌شده» می‌شود.",
                  "در نسخهٔ واقعی مشتری به یک درگاه پرداخت مثل زرین‌پال می‌رود و سفارش فقط وقتی «پرداخت‌شده» می‌شود که سرور تراکنش را از درگاه تأیید بگیرد.",
                ]}
              />
            </>
          )}

          {order.status === "paid" && (
            <section className="rounded-lg border border-sky-300 bg-sky-50 p-5 text-sky-950 text-sm leading-7">
              <p className="font-medium">پرداخت شما در {faDateTime(order.paidAt)} ثبت شد.</p>
              <p>فروشنده بسته را آماده می‌کند. کد رهگیری بعد از ارسال همین‌جا نشان داده می‌شود.</p>
            </section>
          )}

          {order.status === "shipped" && (
            <section className="rounded-lg border border-emerald-300 bg-emerald-50 p-5 text-emerald-950 text-sm leading-7">
              <p className="flex items-center gap-2 font-medium">
                <PackageCheck className="size-5" aria-hidden />
                بستهٔ شما در {faDateTime(order.shippedAt)} ارسال شد.
              </p>
              <p className="mt-2">کد رهگیری:</p>
              <p className="mt-1 select-all rounded-md bg-white px-3 py-2 text-center font-mono text-base" dir="auto">
                {order.trackingCode}
              </p>
            </section>
          )}
        </>
      )}

      <footer className="mt-auto pt-4 text-center text-muted-foreground text-xs">
        نسخهٔ نمایشی «لینک سفارش». این صفحه همان چیزی است که مشتری بعد از باز کردن لینک می‌بیند.
      </footer>
    </main>
  );
}
