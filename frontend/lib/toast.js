import toast from "react-hot-toast";

// Keep track of recently shown messages to block rapid duplicate pops
const activeToasts = new Map();
const DEDUPE_TIMEOUT = 2500; // 2.5 second suppression window

const getDedupeKey = (message, type) => {
  if (!message) return "";
  const str = typeof message === "string" ? message : String(message);
  return `${type}:${str.toLowerCase().trim().replace(/[^a-z0-9]/g, "-")}`;
};

const showToast = (message, options = {}, type = "default") => {
  if (!message) return null;

  const key = getDedupeKey(message, type);
  const now = Date.now();
  const lastShown = activeToasts.get(key);

  if (lastShown && now - lastShown < DEDUPE_TIMEOUT) {
    // Duplicate call: react-hot-toast automatically updates/deduplicates with matching id
    options.id = key;
  } else {
    // First invocation: register timestamp and set matching id to intercept duplicates
    options.id = key;
    activeToasts.set(key, now);
    setTimeout(() => {
      activeToasts.delete(key);
    }, DEDUPE_TIMEOUT);
  }

  // Prepend premium glassmorphic toast classes
  options.className = `${options.className || ""} glass-toast-premium ${type !== "default" ? type : ""}`.trim();

  // Route to the standard react-hot-toast methods
  if (type === "success") return toast.success(message, options);
  if (type === "error") return toast.error(message, options);
  if (type === "loading") return toast.loading(message, options);
  return toast(message, options);
};

const smartToast = (message, options) => showToast(message, options, "default");
smartToast.success = (message, options) => showToast(message, options, "success");
smartToast.error = (message, options) => showToast(message, options, "error");
smartToast.loading = (message, options) => showToast(message, options, "loading");

smartToast.custom = (cb, options = {}) => {
  options.className = `${options.className || ""} glass-toast-premium`.trim();
  return toast.custom(cb, options);
};

smartToast.dismiss = (id) => toast.dismiss(id);

smartToast.promise = (promise, msgs, options = {}) => {
  // Apply glassmorphism styling to promise sub-toasts
  const styledOptions = {
    ...options,
    loading: {
      ...(options.loading || {}),
      className: `${options.loading?.className || ""} glass-toast-premium loading`.trim()
    },
    success: {
      ...(options.success || {}),
      className: `${options.success?.className || ""} glass-toast-premium success`.trim()
    },
    error: {
      ...(options.error || {}),
      className: `${options.error?.className || ""} glass-toast-premium error`.trim()
    }
  };
  return toast.promise(promise, msgs, styledOptions);
};

export default smartToast;
