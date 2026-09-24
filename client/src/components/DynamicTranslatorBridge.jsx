import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore.js";
import { initDynamicTranslator, applyDynamicTranslation } from "../services/translator.js";

export default function DynamicTranslatorBridge() {
  const language = useAppStore((state) => state.language);

  useEffect(() => {
    initDynamicTranslator();
    if (language && language !== "en") {
      applyDynamicTranslation(language);
    }
  }, [language]);

  return null;
}
