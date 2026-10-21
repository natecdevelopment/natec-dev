import { describe, expect, it } from "vitest";
import { normalizeBdPhone } from "./InquiryForm";

describe("Bangladesh phone validation", () => {
  it("accepts local and +880 formats", () => {
    expect(normalizeBdPhone("01990-665923")).toBe("01990665923");
    expect(normalizeBdPhone("+880 1354-252400")).toBe("01354252400");
  });
  it("rejects non-Bangladesh or short numbers", () => {
    expect(normalizeBdPhone("12345")).toBeNull();
    expect(normalizeBdPhone("01212345678")).toBeNull();
  });
});
