import { supabase } from "@/integrations/supabase/client";

export type ConvertedImage = { blob: Blob; width: number; height: number; fileName: string };

/** Converts any browser-readable image to WebP, max 2400px on the long side, quality 0.82. */
export async function toWebp(file: File): Promise<ConvertedImage> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not convert image"))), "image/webp", 0.82));
  const base = file.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "image";
  return { blob, width, height, fileName: `${base}.webp` };
}

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** Uploads to the "media" bucket with progress, returns storage path + long-lived URL. */
export async function uploadToMedia(img: ConvertedImage, onProgress?: (pct: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session expired — please sign in again.");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID().slice(0, 8)}-${img.fileName}`;
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/media/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", key);
    xhr.setRequestHeader("Content-Type", "image/webp");
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(img.blob);
  });
  const signed = await supabase.storage.from("media").createSignedUrl(path, TEN_YEARS);
  if (signed.error) throw signed.error;
  return { path, url: signed.data.signedUrl };
}

/** Full pipeline: convert, upload, insert media row. */
export async function uploadImage(file: File, extra: { project_id?: string | null; title?: string; alt_text?: string; sort_order?: number } = {}, onProgress?: (pct: number) => void) {
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} is not an image`);
  const img = await toWebp(file);
  const { path, url } = await uploadToMedia(img, onProgress);
  const { data, error } = await supabase
    .from("media")
    .insert({ storage_path: path, public_url: url, file_name: img.fileName, width: img.width, height: img.height, size_bytes: img.blob.size, title: extra.title ?? "", alt_text: extra.alt_text ?? "", project_id: extra.project_id ?? null, sort_order: extra.sort_order ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export function formatBytes(n?: number | null) {
  if (!n) return "—";
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`;
}
