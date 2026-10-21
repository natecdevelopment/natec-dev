export type ParsedVideo = { provider: "youtube" | "facebook"; videoId: string };

/** Detects YouTube / Facebook video URLs and extracts the id. Returns null for anything else. */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www\.|m\.|mobile\.|web\.)/, "").toLowerCase();
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0];
    return id && /^[\w-]{6,}$/.test(id) ? { provider: "youtube", videoId: id } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
    let id: string | null | undefined = null;
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) id = parts[1];
    return id && /^[\w-]{6,}$/.test(id) ? { provider: "youtube", videoId: id } : null;
  }
  if (host === "fb.watch") {
    const id = parts[0];
    return id ? { provider: "facebook", videoId: id } : null;
  }
  if (host === "facebook.com") {
    if (parts[0] === "watch") {
      const v = u.searchParams.get("v");
      return v ? { provider: "facebook", videoId: v } : null;
    }
    if (parts[0] === "reel" && parts[1]) return { provider: "facebook", videoId: parts[1] };
    const vi = parts.indexOf("videos");
    if (vi >= 0) {
      const id = parts.slice(vi + 1).reverse().find((p) => /^\d+$/.test(p));
      return id ? { provider: "facebook", videoId: id } : null;
    }
  }
  return null;
}

export function youtubeThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function embedUrl(v: { provider: string; video_id?: string; videoId?: string; url: string }) {
  const id = v.video_id ?? v.videoId ?? "";
  return v.provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(v.url)}&show_text=false`;
}
