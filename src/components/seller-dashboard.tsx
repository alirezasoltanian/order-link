"use client";

import { RotateCcw } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { CreateOrderDialog } from "@/components/create-order-dialog";
import { CustomersGrid } from "@/components/customers-grid";
import { DemoNotice } from "@/components/demo-notice";
import { OrdersDialog } from "@/components/orders-dialog";
import { Button } from "@/components/ui/button";
import { useNow } from "@/hooks/use-now";
import { isOverdue } from "@/lib/domain";
import { faNumber } from "@/lib/fa";
import { shop, shopActions, useShopState } from "@/lib/store";
import { cn } from "@/lib/utils";

function useGridHeight(reserved: number, minimum = 360) {
  const [height, setHeight] = React.useState(520);
  React.useEffect(() => {
    const update = () => setHeight(Math.max(minimum, window.innerHeight - reserved));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [reserved, minimum]);
  return height;
}

function Tile({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-2.5",
        alert && value > 0 ? "border-red-300 bg-red-50 text-red-950" : "bg-card",
      )}
    >
      <p className="font-semibold text-2xl leading-8">{faNumber(value)}</p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

export function SellerDashboard() {
  const state = useShopState();
  const now = useNow();
  const height = useGridHeight(430);

  const [orderFor, setOrderFor] = React.useState<string | null>(null);
  const [ordersOf, setOrdersOf] = React.useState<string | null>(null);
  const findCustomer = (id: string | null) => state.customers.find((customer) => customer.id === id) ?? null;

  const awaiting = state.orders.filter((order) => order.status === "awaiting_payment").length;
  const toShip = state.orders.filter((order) => order.status === "paid").length;
  const overdue = now ? state.orders.filter((order) => isOverdue(order, now)).length : 0;

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-4 px-4 py-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-bold text-xl">لینک سفارش · {shop.name}</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            صفحهٔ فروشنده: مشتری‌ها، سفارش‌هایشان و لینکی که برای هر سفارش در دایرکت فرستاده می‌شود.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            shopActions.reset();
            toast.success("داده‌ها به حالت اول برگشت");
          }}
        >
          <RotateCcw className="size-4" aria-hidden />
          برگرداندن داده‌های نمونه
        </Button>
      </header>

      <DemoNotice
        title="این یک نسخهٔ نمایشی و ساده‌شده است"
        items={[
          "ورود فروشنده ندارد. در نسخهٔ واقعی این صفحه پشت ورود است و هر فروشنده فقط مشتری‌های خودش را می‌بیند.",
          "پایگاه داده ندارد. داده‌های اولیه از یک فایل ثابت می‌آید و هر تغییری فقط در همین مرورگر (localStorage) می‌ماند.",
          "پیامک کد رهگیری فرستاده نمی‌شود. مشتری کد را در صفحهٔ لینک خودش می‌بیند.",
        ]}
      />

      <section className="grid grid-cols-3 gap-3 sm:max-w-xl" aria-label="وضعیت امروز">
        <Tile label="پرداخت شده، ۴۸ ساعت مانده و ارسال نشده" value={overdue} alert />
        <Tile label="آمادهٔ ارسال" value={toShip} />
        <Tile label="منتظر پرداخت مشتری" value={awaiting} />
      </section>

      <CustomersGrid
        state={state}
        now={now}
        height={height}
        onCreateOrder={setOrderFor}
        onShowOrders={setOrdersOf}
      />

      <CreateOrderDialog state={state} customer={findCustomer(orderFor)} onClose={() => setOrderFor(null)} />
      <OrdersDialog state={state} customer={findCustomer(ordersOf)} now={now} onClose={() => setOrdersOf(null)} />
    </main>
  );
}
