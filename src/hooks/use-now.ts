"use client";

import * as React from "react";

/**
 * Current time as an ISO string, refreshed every minute.
 * Null on the server and during hydration so time-based badges cannot cause a mismatch.
 */
export function useNow(): string | null {
  const [now, setNow] = React.useState<string | null>(null);

  React.useEffect(() => {
    const tick = () => setNow(new Date().toISOString());
    tick();
    const timer = window.setInterval(tick, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
