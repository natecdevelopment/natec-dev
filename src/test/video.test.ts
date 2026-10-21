import { describe, expect, it } from "vitest";
import { parseVideoUrl } from "@/lib/video";
import { slugify } from "@/lib/projects-data";

describe("parseVideoUrl", () => {
  it("youtube watch", () => expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ provider: "youtube", videoId: "dQw4w9WgXcQ" }));
  it("youtu.be", () => expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=3")?.videoId).toBe("dQw4w9WgXcQ"));
  it("shorts", () => expect(parseVideoUrl("https://youtube.com/shorts/abcDEF12345")?.videoId).toBe("abcDEF12345"));
  it("embed", () => expect(parseVideoUrl("https://www.youtube.com/embed/abcDEF12345")?.provider).toBe("youtube"));
  it("facebook videos", () => expect(parseVideoUrl("https://www.facebook.com/natec/videos/1234567890/")).toEqual({ provider: "facebook", videoId: "1234567890" }));
  it("fb.watch", () => expect(parseVideoUrl("https://fb.watch/aBc123/")?.provider).toBe("facebook"));
  it("facebook watch", () => expect(parseVideoUrl("https://www.facebook.com/watch/?v=98765")?.videoId).toBe("98765"));
  it("facebook reel", () => expect(parseVideoUrl("https://www.facebook.com/reel/55555")?.videoId).toBe("55555"));
  it("rejects vimeo", () => expect(parseVideoUrl("https://vimeo.com/12345")).toBeNull());
  it("rejects garbage", () => expect(parseVideoUrl("not a url at all")).toBeNull());
});

describe("slugify", () => {
  it("makes url slugs", () => expect(slugify("Upcoming Project — Rajendrapur Bazar")).toBe("upcoming-project-rajendrapur-bazar"));
});
