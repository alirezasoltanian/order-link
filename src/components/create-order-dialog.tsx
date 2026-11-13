"use client";

import { Check, Copy, ExternalLink, History, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lastOrderItems, type Customer, type ShopState } from "@/lib/domain";
import { toman } from "@/lib/fa";
import { orderUrl, products, shopActions } from "@/lib/store";

interface Line {
  key: number;
  productId: string;
  quantity: number;
}

interface CreateOrderDialogProps {
  state: ShopState;
  customer: Customer | null;
  onClose: () => void;
}

export async function copyText(text: string, message: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("کپی نشد. لینک را دستی انتخاب و کپی کنید.");
  }
}

export function CreateOrderDialog({ state, customer, onClose }: CreateOrderDialogProps) {
  const nextKey = React.useRef(1);
  const newLine = (productId = products[0].id, quantity = 1): Line => ({
    key: nextKey.current++,
    productId,
    quantity,
  });

  const [lines, setLines] = React.useState<Line[]>(() => [newLine()]);
  const [createdId, setCreatedId] = React.useState<string | null>(null);

  // Start clean every time the dialog opens for a customer.
  React.useEffect(() => {
    if (customer) {
      setLines([newLine()]);
      setCreatedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  if (!customer) return null;

  const previous = lastOrderItems(state, customer.id).filter((item) =>
    products.some((product) => product.id === item.productId),
  );
  const total = lines.reduce((sum, line) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    return sum + (product ? product.price * line.quantity : 0);
  }, 0);
  const link = createdId ? orderUrl(createdId) : "";

  const updateLine = (key: number, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const submit = () => {
    try {
      const id = shopActions.createOrder(
        customer.id,
        lines.map(({ productId, quantity }) => ({ productId, quantity })),
      );
      setCreatedId(id);
    } catch {
      toast.error("سفارش ثبت نشد. تعداد هر قلم باید دست‌کم ۱ باشد.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{createdId ? "سفارش ثبت شد" : `سفارش جدید برای ${customer.name}`}</DialogTitle>
          <DialogDescription>
            {createdId
              ? "این لینک را در دایرکت برای مشتری بفرستید. مشتری وضعیت سفارش را همان‌جا می‌بیند و پرداخت می‌کند."
              : `ارسال به: ${customer.address || "آدرس ثبت نشده"}`}
          </DialogDescription>
        </DialogHeader>

        {createdId ? (
          <div className="flex flex-col gap-3">
            <Input readOnly dir="ltr" value={link} onFocus={(event) => event.target.select()} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => copyText(link, "لینک کپی شد")}>
                <Copy className="size-4" aria-hidden />
                کپی لینک
              </Button>
              <Button variant="outline" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="size-4" aria-hidden />
                  دیدن صفحهٔ مشتری
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {previous.length > 0 && (
              <Button
                variant="secondary"
                className="self-start"
                onClick={() => setLines(previous.map((item) => newLine(item.productId, item.quantity)))}
              >
                <History className="size-4" aria-hidden />
                همان سفارش قبلی
              </Button>
            )}

            {lines.map((line) => (
              <div key={line.key} className="flex items-center gap-2">
                <Select value={line.productId} onValueChange={(productId) => updateLine(line.key, { productId })}>
                  <SelectTrigger className="min-w-0 flex-1" aria-label="محصول">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({toman(product.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  className="w-20"
                  aria-label="تعداد"
                  value={line.quantity}
                  onChange={(event) =>
                    updateLine(line.key, { quantity: Math.floor(Number(event.target.value)) || 0 })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="حذف این قلم"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => setLines((current) => [...current, newLine()])}
            >
              <Plus className="size-4" aria-hidden />
              قلم دیگر
            </Button>

            <p className="flex items-center justify-between border-t pt-3 font-medium">
              <span>جمع سفارش</span>
              <span>{toman(total)}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          {createdId ? (
            <Button variant="outline" onClick={onClose}>
              بستن
            </Button>
          ) : (
            <Button onClick={submit}>
              <Check className="size-4" aria-hidden />
              ثبت سفارش و ساخت لینک
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
