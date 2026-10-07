import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes safely, resolving conflicts.
 * Usage: cn("px-4 py-2", isActive && "bg-blue-500")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
