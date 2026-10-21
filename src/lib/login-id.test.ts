import { describe, it, expect } from "vitest";
import { parseLoginId, suggestUsername } from "./login-id";
describe("parseLoginId", () => {
  it("email", () => expect(parseLoginId(" A@B.com ")).toEqual({ kind: "email", value: "a@b.com" }));
  it.each(["01712345678", "+8801712345678", "880 1712-345678"])("phone %s", (v) => expect(parseLoginId(v)).toEqual({ kind: "phone", value: "01712345678" }));
  it("username", () => expect(parseLoginId("YourName")).toEqual({ kind: "username", value: "yourname" }));
  it("suggests", () => expect(suggestUsername("Md. Shah Alam")).toBe("mdshahalam"));
});
