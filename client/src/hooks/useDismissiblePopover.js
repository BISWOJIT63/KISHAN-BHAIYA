import { useEffect, useRef } from "react";

export function useDismissiblePopover(open, setOpen) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const dismissOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        containerRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);
  return containerRef;
}
