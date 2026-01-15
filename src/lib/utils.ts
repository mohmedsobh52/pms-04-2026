import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract file path from a full URL or return as-is if already a path.
 * Handles both legacy full URLs and new path-only storage.
 */
export function extractFilePath(fileUrl: string, bucket: string): string {
  if (!fileUrl) return '';
  
  // Handle full URLs containing the bucket name
  if (fileUrl.includes(`/${bucket}/`)) {
    const parts = fileUrl.split(`/${bucket}/`);
    const pathWithParams = parts[parts.length - 1];
    // Remove query params if present
    return decodeURIComponent(pathWithParams.split('?')[0]);
  }
  
  // Already a path
  return fileUrl;
}
