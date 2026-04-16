export const fetcher = (url: string) => fetch(url).then((r) => r.json());

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...options?.headers },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { error: body?.error || `Request failed (${res.status})` };
    }
    return { data: body as T };
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export function formatDate(iso: string | Date): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function loomShareUrlToEmbedUrl(url: string): string | null {
  if (!url) return null;
  const m = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (!m) return null;
  return `https://www.loom.com/embed/${m[1]}`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
