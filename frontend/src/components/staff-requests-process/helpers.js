export const getErrorMessage = (error, fallback) => error?.em || error?.message || fallback;

export const toAsciiLabel = (value) => {
  if (!value) return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};
