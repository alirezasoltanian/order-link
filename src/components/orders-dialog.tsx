"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Copy, ExternalLink, Paperclip, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { copyText } from "@/components/create-order-dialog";
import { DataGrid } from "@/components/data-grid/data-grid";
import { OrderStatusBadge } from "@/components/order-status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDataGrid } from "@/hooks/use-data-grid";
import { customerOrders, isOverdue, orderTotal, type Customer, type Order, type ShopState } from "@/lib/domain";
import { faDateTime, itemsSummary } from "@/lib/fa";
import { orderUrl, shopActions } from "@/lib/store";

const MAX_ATTACHMENT_BYTES = 300 * 1024;

/** One row per order. Everything except the tracking code is fixed once the order exists. */
interface OrderRow {
  id: string;
  created: string;
  items: string;
  total: number;
  trackingCode: string;
  order: Order;
  overdue: boolean;
}

interface OrdersDialogProps {
  state: ShopState;
  customer: Customer | null;
  now: string | null;
  onClose: () => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AttachmentCell({ order }: { order: Order }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (order.status === "awaiting_payment") {
    return <span className="text-muted-foreground text-xs">بعد از پرداخت فعال می‌شود</span>;
  }

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("در این نسخهٔ نمایشی فایل باید کمتر از ۳۰۰ کیلوبایت باشد.");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      shopActions.attachFile(order.id, { name: file.name, type: file.type, size: file.size, dataUrl });
      toast.success("فایل پیوست شد");
    } catch {
      toast.error("فایل پیوست نشد.");
    }
  };

  if (order.attachment) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <a
          href={order.attachment.dataUrl}
          download={order.attachment.name}
          className="truncate text-sky-700 text-xs underline underline-offset-2"
          title={order.attachment.name}
        >
          {order.attachment.name}
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          aria-label="حذف فایل پیوست"
          onClick={() => shopActions.removeAttachment(order.id)}
        >
          <X className="size-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
      <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => inputRef.current?.click()}>
        <Paperclip className="size-3.5" aria-hidden />
        پیوست رسید ارسال
      </Button>
    </>
  );
}

export function OrdersDialog({ state, customer, now, onClose }: OrdersDialogProps) {
  const rows = React.useMemo<OrderRow[]>(
    () =>
      customer
        ? customerOrders(state, customer.id).map((order) => ({
            id: order.id,
            created: faDateTime(order.createdAt),
            items: itemsSummary(order),
            total: orderTotal(order),
            trackingCode: order.trackingCode ?? "",
            order,
            overdue: now ? isOverdue(order, now) : false,
          }))
        : [],
    [state, customer, now],
  );

  const rowsRef = React.useRef(rows);
  rowsRef.current = rows;

  // The grid keeps a refused edit on screen, so a refusal remounts it from the stored data.
  const [gridVersion, setGridVersion] = React.useState(0);

  // Typing a tracking code is how the seller marks an order as shipped.
  const onDataChange = React.useCallback((nextRows: OrderRow[]) => {
    const current = new Map(rowsRef.current.map((row) => [row.id, row]));
    for (const row of nextRows) {
      const previous = current.get(row.id);
      if (!previous || row.trackingCode === previous.trackingCode) continue;
      if (previous.order.status === "awaiting_payment") {
        toast.error("این سفارش هنوز پرداخت نشده و نمی‌شود برایش کد رهگیری ثبت کرد.", {
          id: `unpaid-${row.id}`,
        });
        setGridVersion((version) => version + 1);
        continue;
      }
      if (!String(row.trackingCode).trim()) {
        toast.error("کد رهگیری نمی‌تواند خالی باشد.", { id: `empty-${row.id}` });
        setGridVersion((version) => version + 1);
        continue;
      }
      shopActions.markShipped(row.id, String(row.trackingCode));
      toast.success("سفارش «ارسال‌شده» ثبت شد", { id: `shipped-${row.id}` });
    }
  }, []);

  const columns = React.useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: "کد سفارش 🔒",
        minSize: 120,
        meta: { label: "کد سفارش", readOnly: true, cell: { variant: "short-text" } },
      },
      {
        id: "created",
        accessorKey: "created",
        header: "زمان ثبت 🔒",
        minSize: 150,
        enableSorting: false,
        meta: { label: "زمان ثبت", readOnly: true, cell: { variant: "short-text" } },
      },
      {
        id: "items",
        accessorKey: "items",
        header: "اقلام 🔒",
        minSize: 220,
        meta: { label: "اقلام", readOnly: true, cell: { variant: "short-text" } },
      },
      {
        id: "total",
        accessorKey: "total",
        header: "مبلغ (تومان) 🔒",
        minSize: 140,
        meta: { label: "مبلغ (تومان)", readOnly: true, cell: { variant: "number" } },
      },
      {
        id: "status",
        header: () => <span className="px-3 font-medium text-sm">وضعیت</span>,
        cell: ({ row }) => <OrderStatusBadge status={row.original.order.status} overdue={row.original.overdue} />,
        minSize: 190,
        meta: { label: "وضعیت" },
      },
      {
        id: "trackingCode",
        accessorKey: "trackingCode",
        header: "کد رهگیری",
        minSize: 170,
        meta: { label: "کد رهگیری", cell: { variant: "short-text" } },
      },
      {
        id: "attachment",
        header: () => <span className="px-3 font-medium text-sm">فایل پیوست</span>,
        cell: ({ row }) => <AttachmentCell order={row.original.order} />,
        minSize: 200,
        meta: { label: "فایل پیوست" },
      },
      {
        id: "link",
        header: () => <span className="px-3 font-medium text-sm">لینک مشتری</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => copyText(orderUrl(row.original.id), "لینک کپی شد")}
            >
              <Copy className="size-3.5" aria-hidden />
              کپی
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
              <a href={`/o/${row.original.id}`} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3.5" aria-hidden />
                باز کردن
              </a>
            </Button>
          </div>
        ),
        minSize: 170,
        meta: { label: "لینک مشتری" },
      },
    ],
    [],
  );

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange,
    getRowId: (row) => row.id,
    dir: "rtl",
    enableSorting: false,
  });

  if (!customer) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>سفارش‌های {customer.name}</DialogTitle>
          <DialogDescription>
            سفارش ثبت‌شده عوض نمی‌شود. فقط دو کار ممکن است، آن هم بعد از پرداخت مشتری: نوشتن کد رهگیری
            (که سفارش را «ارسال‌شده» می‌کند) و پیوست کردن رسید ارسال.
          </DialogDescription>
        </DialogHeader>
        <div className="min-w-0">
          <DataGrid key={gridVersion} {...dataGridProps} table={table} height={340} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
