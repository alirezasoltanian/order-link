"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ListOrdered, Plus } from "lucide-react";
import * as React from "react";
import { DataGrid } from "@/components/data-grid/data-grid";
import { DataGridFilterMenu } from "@/components/data-grid/data-grid-filter-menu";
import { DataGridKeyboardShortcuts } from "@/components/data-grid/data-grid-keyboard-shortcuts";
import { DataGridRowHeightMenu } from "@/components/data-grid/data-grid-row-height-menu";
import { DataGridSortMenu } from "@/components/data-grid/data-grid-sort-menu";
import { DataGridViewMenu } from "@/components/data-grid/data-grid-view-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDataGrid } from "@/hooks/use-data-grid";
import { getFilterFn } from "@/lib/data-grid-filters";
import {
  customerStats,
  EDITABLE_CUSTOMER_FIELDS,
  type Customer,
  type CustomerPatch,
  type CustomerStats,
  type ShopState,
} from "@/lib/domain";
import { faDate, faNumber } from "@/lib/fa";
import { shopActions } from "@/lib/store";

/** One grid row: the editable profile plus read-only figures derived from the orders. */
export interface CustomerRow extends Customer {
  ordersCount: number;
  paidTotal: number;
  lastOrder: string;
  stats: CustomerStats;
}

interface CustomersGridProps {
  state: ShopState;
  now: string | null;
  height: number;
  onCreateOrder: (customerId: string) => void;
  onShowOrders: (customerId: string) => void;
}

function OrderStateBadges({ stats }: { stats: CustomerStats }) {
  if (stats.ordersCount === 0) {
    return <span className="text-muted-foreground text-xs">بدون سفارش</span>;
  }
  const upToDate = stats.awaitingPayment === 0 && stats.toShip === 0;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {stats.overdue > 0 && (
        <Badge variant="outline" className="border-red-300 bg-red-100 text-red-900">
          {faNumber(stats.overdue)} عقب‌افتاده
        </Badge>
      )}
      {stats.toShip - stats.overdue > 0 && (
        <Badge variant="outline" className="border-sky-300 bg-sky-100 text-sky-900">
          {faNumber(stats.toShip - stats.overdue)} آمادهٔ ارسال
        </Badge>
      )}
      {stats.awaitingPayment > 0 && (
        <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-700">
          {faNumber(stats.awaitingPayment)} منتظر پرداخت
        </Badge>
      )}
      {upToDate && <span className="text-muted-foreground text-xs">همه ارسال شده</span>}
    </div>
  );
}

export function CustomersGrid({ state, now, height, onCreateOrder, onShowOrders }: CustomersGridProps) {
  const rows = React.useMemo<CustomerRow[]>(
    () =>
      state.customers.map((customer) => {
        const stats = customerStats(state, customer.id, now ?? undefined);
        return {
          ...customer,
          ordersCount: stats.ordersCount,
          paidTotal: stats.paidTotal,
          lastOrder: faDate(stats.lastOrderAt),
          stats,
        };
      }),
    [state, now],
  );

  const customersRef = React.useRef(state.customers);
  customersRef.current = state.customers;

  // The grid hands back whole rows. Only profile fields are written; derived columns are ignored.
  const onDataChange = React.useCallback((nextRows: CustomerRow[]) => {
    const current = new Map(customersRef.current.map((customer) => [customer.id, customer]));
    for (const row of nextRows) {
      const previous = current.get(row.id);
      if (!previous) continue;
      const patch: CustomerPatch = {};
      for (const field of EDITABLE_CUSTOMER_FIELDS) {
        if (row[field] !== previous[field]) patch[field] = String(row[field] ?? "");
      }
      if (Object.keys(patch).length > 0) shopActions.updateCustomer(row.id, patch);
    }
  }, []);

  const filterFn = React.useMemo(() => getFilterFn<CustomerRow>(), []);

  const columns = React.useMemo<ColumnDef<CustomerRow>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: "نام مشتری",
        minSize: 160,
        filterFn,
        meta: { label: "نام مشتری", cell: { variant: "short-text" } },
      },
      {
        id: "instagramId",
        accessorKey: "instagramId",
        header: "آیدی اینستاگرام",
        minSize: 160,
        filterFn,
        meta: { label: "آیدی اینستاگرام", cell: { variant: "short-text" } },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: "موبایل",
        minSize: 140,
        filterFn,
        meta: { label: "موبایل", cell: { variant: "short-text" } },
      },
      {
        id: "orderState",
        header: () => <span className="px-3 font-medium text-sm">وضعیت سفارش‌ها</span>,
        cell: ({ row }) => <OrderStateBadges stats={row.original.stats} />,
        minSize: 230,
        enableSorting: false,
        enableColumnFilter: false,
        meta: { label: "وضعیت سفارش‌ها" },
      },
      {
        id: "actions",
        header: () => <span className="px-3 font-medium text-sm">کارها</span>,
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onCreateOrder(row.original.id)}>
              <Plus className="size-3.5" aria-hidden />
              سفارش جدید
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              disabled={row.original.ordersCount === 0}
              onClick={() => onShowOrders(row.original.id)}
            >
              <ListOrdered className="size-3.5" aria-hidden />
              سفارش‌ها
            </Button>
          </div>
        ),
        minSize: 220,
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        meta: { label: "کارها" },
      },
      {
        id: "city",
        accessorKey: "city",
        header: "شهر",
        minSize: 110,
        filterFn,
        meta: { label: "شهر", cell: { variant: "short-text" } },
      },
      {
        id: "address",
        accessorKey: "address",
        header: "آدرس",
        minSize: 260,
        filterFn,
        meta: { label: "آدرس", cell: { variant: "long-text" } },
      },
      {
        id: "note",
        accessorKey: "note",
        header: "یادداشت فروشنده",
        minSize: 200,
        filterFn,
        meta: { label: "یادداشت فروشنده", cell: { variant: "long-text" } },
      },
      {
        id: "ordersCount",
        accessorKey: "ordersCount",
        header: "تعداد سفارش 🔒",
        minSize: 130,
        filterFn,
        meta: { label: "تعداد سفارش", readOnly: true, cell: { variant: "number" } },
      },
      {
        id: "paidTotal",
        accessorKey: "paidTotal",
        header: "جمع خرید (تومان) 🔒",
        minSize: 170,
        filterFn,
        meta: { label: "جمع خرید (تومان)", readOnly: true, cell: { variant: "number" } },
      },
      {
        id: "lastOrder",
        accessorKey: "lastOrder",
        header: "آخرین سفارش 🔒",
        minSize: 150,
        enableSorting: false,
        meta: { label: "آخرین سفارش", readOnly: true, cell: { variant: "short-text" } },
      },
    ],
    [filterFn, onCreateOrder, onShowOrders],
  );

  const { table, ...dataGridProps } = useDataGrid({
    data: rows,
    columns,
    onDataChange,
    getRowId: (row) => row.id,
    dir: "rtl",
    enableSearch: true,
    enablePaste: true,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          روی هر خانه دو بار کلیک کنید تا ویرایش شود. ستون‌های 🔒 از روی سفارش‌ها حساب می‌شوند و
          قابل تغییر نیستند.
        </p>
        <div role="toolbar" aria-orientation="horizontal" className="flex items-center gap-2">
          <DataGridFilterMenu table={table} align="end" />
          <DataGridSortMenu table={table} align="end" />
          <DataGridRowHeightMenu table={table} align="end" />
          <DataGridViewMenu table={table} align="end" />
        </div>
      </div>
      <DataGridKeyboardShortcuts enableSearch enableUndoRedo enablePaste />
      <DataGrid {...dataGridProps} table={table} height={height} />
    </div>
  );
}
