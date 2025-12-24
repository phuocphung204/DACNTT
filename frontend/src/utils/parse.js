import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "#components/_variables";

export const parsePageParam = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

export const parsePageSize = (value) => {
  const parsed = Number(value);
  if (PAGE_SIZE_OPTIONS.includes(parsed)) return parsed;
  return DEFAULT_PAGE_SIZE;
};