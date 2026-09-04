import { Accessibility, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

const MIN_SCALE = 100;
const MAX_SCALE = 125;
const SCALE_STEP = 12.5;

export default function AccessibilityToolbar() {
  const [textScale, setTextScale] = useState(() =>
    Number(localStorage.getItem("kishan-bhaiya-text-scale")) || MIN_SCALE,
  );
  const [highContrast, setHighContrast] = useState(
    () => localStorage.getItem("kishan-bhaiya-high-contrast") === "true",
  );

  useEffect(() => {
    document.documentElement.style.fontSize = `${textScale}%`;
    localStorage.setItem("kishan-bhaiya-text-scale", String(textScale));
  }, [textScale]);

  useEffect(() => {
    document.documentElement.classList.toggle("ux4g-high-contrast", highContrast);
    localStorage.setItem("kishan-bhaiya-high-contrast", String(highContrast));
  }, [highContrast]);

  return (
    <div className="flex items-center gap-1" aria-label="Accessibility controls">
      <LanguageSwitcher variant="utility" />
      <span className="mx-1 h-4 w-px bg-white/25" aria-hidden="true" />
      <span className="mr-1 hidden text-white/70 sm:inline">Text size</span>
      <button
        type="button"
        className="ux4g-utility-button"
        onClick={() => setTextScale((value) => Math.max(MIN_SCALE, value - SCALE_STEP))}
        disabled={textScale === MIN_SCALE}
        aria-label="Decrease text size"
      >
        <Minus className="h-3 w-3" /> A
      </button>
      <button
        type="button"
        className="ux4g-utility-button"
        onClick={() => setTextScale(MIN_SCALE)}
        aria-label="Reset text size"
      >
        A
      </button>
      <button
        type="button"
        className="ux4g-utility-button"
        onClick={() => setTextScale((value) => Math.min(MAX_SCALE, value + SCALE_STEP))}
        disabled={textScale === MAX_SCALE}
        aria-label="Increase text size"
      >
        A <Plus className="h-3 w-3" />
      </button>
      <span className="mx-1 h-4 w-px bg-white/25" aria-hidden="true" />
      <button
        type="button"
        className={`ux4g-utility-button ${highContrast ? "bg-white text-forest-950" : ""}`}
        onClick={() => setHighContrast((value) => !value)}
        aria-pressed={highContrast}
        aria-label="Toggle high contrast"
      >
        <Accessibility className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Accessibility</span>
      </button>
    </div>
  );
}
