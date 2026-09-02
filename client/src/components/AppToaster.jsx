import React from "react";
import { Toaster } from "sonner";

/**
 * Toast notifications positioned in the middle (top-center)
 * with clear visibility and centered formatting on all screens.
 */
export default function AppToaster() {
  const [isMobile, setIsMobile] = React.useState(
    () => typeof window !== "undefined" && window.innerWidth < 640,
  );

  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <Toaster
      position="top-center"
      offset={isMobile ? 84 : 32}
      richColors
      closeButton
      expand={true}
      duration={5000}
      toastOptions={{
        className: "text-[14px] font-semibold shadow-lg text-center",
        style: { padding: "14px 20px" },
      }}
    />
  );
}
