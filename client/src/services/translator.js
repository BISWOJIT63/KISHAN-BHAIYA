/**
 * Dynamic Real-Time Page Translation Service
 * Integrates Google Translate & Indic language translation engine
 * for real-time translation of all dynamic, static, and live contents across the platform.
 */

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", short: "ENG" },
  { code: "hi", label: "हिन्दी", short: "हिन्दी" },
  { code: "or", label: "ଓଡ଼ିଆ", short: "ଓଡ଼ିଆ" },
  { code: "ta", label: "தமிழ்", short: "தமிழ்" },
  { code: "te", label: "తెలుగు", short: "తెలుగు" },
  { code: "bn", label: "বাংলা", short: "বাংলা" },
  { code: "kn", label: "ಕನ್ನಡ", short: "ಕನ್ನಡ" },
  { code: "mr", label: "मराठी", short: "मराठी" },
  { code: "gu", label: "ગુજરાતી", short: "ગુજરાતી" },
  { code: "pa", label: "ਪੰਜਾਬੀ", short: "ਪੰਜਾਬੀ" },
  { code: "ml", label: "മലയാളം", short: "മലയാളം" },
];

let isScriptLoaded = false;
let initPromise = null;

function setTranslateCookie(lang) {
  if (typeof document === "undefined") return;
  const cookieValue = `/en/${lang}`;
  const hostname = window.location.hostname;

  document.cookie = `googtrans=${cookieValue}; path=/;`;
  document.cookie = `googtrans=${cookieValue}; path=/; domain=${hostname};`;
  if (hostname.includes(".")) {
    const rootDomain = hostname.split(".").slice(-2).join(".");
    document.cookie = `googtrans=${cookieValue}; path=/; domain=.${rootDomain};`;
  }
}

/**
 * Initialize Google Translate Script and Hidden Element
 */
export function initDynamicTranslator() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }

  if (initPromise) return initPromise;

  initPromise = new Promise((resolve) => {
    // Ensure container exists
    let container = document.getElementById("google_translate_element");
    if (!container) {
      container = document.createElement("div");
      container.id = "google_translate_element";
      container.style.display = "none";
      document.body.appendChild(container);
    }

    window.googleTranslateElementInit = () => {
      try {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages: SUPPORTED_LANGUAGES.map((l) => l.code).join(","),
              autoDisplay: false,
            },
            "google_translate_element",
          );
        }
      } catch (err) {
        console.warn("Google Translate initialization notice:", err);
      }
      resolve();
    };

    if (window.google && window.google.translate) {
      window.googleTranslateElementInit();
      return;
    }

    if (!isScriptLoaded) {
      const existingScript = document.getElementById("google-translate-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-translate-script";
        script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        script.onerror = () => {
          console.warn("Google translate script could not be loaded directly (offline or blocked).");
          resolve();
        };
        document.body.appendChild(script);
        isScriptLoaded = true;
      }
    }
  });

  return initPromise;
}

/**
 * Apply dynamic translation for the whole page in real-time
 */
export function applyDynamicTranslation(targetLang) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const lang = targetLang || "en";
  setTranslateCookie(lang);

  initDynamicTranslator().then(() => {
    const triggerSelect = () => {
      const select = document.querySelector(".goog-te-combo");
      if (select) {
        if (select.value !== lang) {
          select.value = lang;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        return true;
      }
      return false;
    };

    if (!triggerSelect()) {
      // Retry a couple of times if the widget DOM is still rendering
      let attempts = 0;
      const interval = setInterval(() => {
        attempts += 1;
        if (triggerSelect() || attempts > 15) {
          clearInterval(interval);
        }
      }, 200);
    }
  });
}

export { SUPPORTED_LANGUAGES };
