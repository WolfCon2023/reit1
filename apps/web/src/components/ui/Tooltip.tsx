import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const show = () => { clearTimeout(timeout.current); timeout.current = setTimeout(() => setOpen(true), 300); };
  const hide = () => { clearTimeout(timeout.current); setOpen(false); };

  useEffect(() => () => clearTimeout(timeout.current), []);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {open && (
        <div
          className={cn(
            "absolute z-50 rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md whitespace-nowrap animate-fade-in",
            positionClasses[side]
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
