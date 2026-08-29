import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Our type scale uses names (text-caption, text-metric, ...) rather than
// t-shirt sizes. tailwind-merge classifies unknown `text-*` values as colors,
// so without this it treats `text-caption` and `text-notion-on-primary` as
// conflicting and silently drops one of them.
const FONT_SIZES = [
  "display-1",
  "display-2",
  "h1",
  "h2",
  "h3",
  "title",
  "body-md",
  "body-sm",
  "caption",
  "eyebrow",
  "metric",
  "metric-lg",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Type-safe error handling utility
 * Extracts error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unexpected error occurred';
}
