import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore.js";
import { cx } from "../utils/format.js";

export default function LanguageSwitcher({ compact = false, className = "" }) {
  const { i18n, t } = useTranslation();
  const { language, setLanguage } = useAppStore();
  const changeLanguage = (next) => {
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <label
      className={cx(
        "flex items-center gap-2 text-sm font-semibold text-gray-600",
        className,
      )}
    >
      <Languages className="h-4 w-4 shrink-0 text-forest-700" />
      {!compact && <span>{t("language.label")}</span>}
      <select
        className={cx("input h-10", compact && "w-[104px] px-2")}
        value={language || i18n.resolvedLanguage}
        onChange={(event) => changeLanguage(event.target.value)}
        aria-label={t("language.label")}
      >
        <option value="en">English</option>
        <option value="hi">हिन्दी</option>
        <option value="or">ଓଡ଼ିଆ</option>
      </select>
    </label>
  );
}
