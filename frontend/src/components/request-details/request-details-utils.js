export const getErrorMessage = (error, fallback) =>
  error?.data?.em ||
  error?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

export const getPlainTextFromHtml = (html) => {
  if (!html) return "";
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body?.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
};
