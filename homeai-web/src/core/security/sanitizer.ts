/**
 * Phase 13: Enterprise Security & Input Sanitizer
 * Protects against XSS injection, malicious SVG payloads, and invalid characters in CAD metadata.
 */

export function sanitizeText(input: string, maxLength: number = 256): string {
  if (typeof input !== "string") return "";

  // 1. Strip script tags, HTML tags, javascript: URIs, onerror/onload attributes
  const sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/[<>]/g, "");

  // 2. Normalize whitespace and trim
  const clean = sanitized.trim().replace(/\s+/g, " ");

  // 3. Enforce maximum character boundary
  return clean.slice(0, maxLength);
}

export function sanitizeProjectName(name: string): string {
  const clean = sanitizeText(name, 80);
  return clean || "Untitled Architectural Project";
}

export function sanitizeRoomName(name: string): string {
  const clean = sanitizeText(name, 40);
  return clean || "Room";
}
