"use client";

import { DirectionProvider } from "@radix-ui/react-direction";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <DirectionProvider dir="rtl">
      <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
      <Toaster dir="rtl" position="bottom-left" toastOptions={{ className: "font-sans" }} />
    </DirectionProvider>
  );
}
