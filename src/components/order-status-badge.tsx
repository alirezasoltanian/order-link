import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/lib/domain";
import { STATUS_LABEL } from "@/lib/fa";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<OrderStatus, string> = {
  awaiting_payment: "border-zinc-300 bg-zinc-100 text-zinc-700",
  paid: "border-sky-300 bg-sky-100 text-sky-900",
  shipped: "border-emerald-300 bg-emerald-100 text-emerald-900",
};

export function OrderStatusBadge({ status, overdue }: { status: OrderStatus; overdue?: boolean }) {
  if (overdue) {
    return (
      <Badge variant="outline" className="border-red-300 bg-red-100 text-red-900">
        بیش از ۴۸ ساعت مانده
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn(STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
