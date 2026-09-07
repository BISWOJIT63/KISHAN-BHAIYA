import { toast } from "sonner";

const firstError = (errors, prefix = "") => {
  for (const [name, value] of Object.entries(errors || {})) {
    const path = prefix ? `${prefix}.${name}` : name;
    if (value?.message) return { name: path, message: value.message };
    if (value && typeof value === "object") {
      const nested = firstError(value, path);
      if (nested) return nested;
    }
  }
  return null;
};

/** Makes client-side validation visible instead of making submit look inert. */
export const notifyInvalidForm = (errors) => {
  const error = firstError(errors);
  toast.error(error?.message || "Please check the required fields");
  if (error?.name && typeof document !== "undefined") {
    document.getElementsByName(error.name)[0]?.focus();
  }
};
