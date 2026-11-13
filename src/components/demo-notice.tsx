import { Info } from "lucide-react";

interface DemoNoticeProps {
  title: string;
  items: string[];
}

/** Says plainly what this demo leaves out, so nobody mistakes it for the finished product. */
export function DemoNotice({ title, items }: DemoNoticeProps) {
  return (
    <aside className="rounded-lg border border-amber-300/70 bg-amber-50 px-4 py-3 text-amber-950 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Info className="size-4 shrink-0" aria-hidden />
        {title}
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pe-2 ps-6 leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
