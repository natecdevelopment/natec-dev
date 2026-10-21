const ALLOWED = new Set(["b", "strong", "i", "em", "u", "ul", "ol", "li", "p", "br", "a", "div"]);

/** Minimal allow-list HTML sanitizer for admin-written rich text (works during SSR, no DOM needed). */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
      const t = tag.toLowerCase();
      if (!ALLOWED.has(t)) return "";
      if (full.startsWith("</")) return `</${t}>`;
      if (t === "a") {
        const m = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)')/i);
        const href = (m?.[2] ?? m?.[3] ?? "").trim();
        if (!/^(https?:|mailto:|tel:)/i.test(href)) return "<a>";
        return `<a href="${href.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">`;
      }
      return `<${t}>`;
    });
}
