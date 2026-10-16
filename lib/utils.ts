export { cn } from "cn";

export const formatDate = (date: string | Date, options?: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...options,
  }).format(new Date(date));
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const generateId = (length: number = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};
