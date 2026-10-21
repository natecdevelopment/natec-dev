import { describe, it, expect } from "vitest";
import { usernameFromName, proposeUsernames, tempPassword } from "./portal-logins";
import { isSyntheticEmail } from "./login-id";
describe("portal logins", () => {
  it("name usernames", () => {
    expect(usernameFromName("MD. SHAH ALAM (UNCLE)")).toBe("shahalamuncle");
    expect(usernameFromName("HABIBULLAH MOLLAH")).toBe("habibullahmollah");
  });
  it("phone when unique, else name, flat added when taken", () => {
    const r = proposeUsernames([
      { id: "a", full_name: "Rahim", phone: "+880 1712-345678", flat_no: "1A" },
      { id: "b", full_name: "Md. Shah Alam", phone: "01811111111", flat_no: "5A" },
      { id: "c", full_name: "Karim", phone: "01811111111", flat_no: "2B" },
      { id: "d", full_name: "Joy", phone: "01922222222", flat_no: "3C" },
    ], new Set(["shahalam"]), new Set(["01922222222"]));
    expect(r).toEqual({ a: "01712345678", b: "shahalam5a", c: "karim", d: "joy" });
  });
  it("temp password", () => {
    expect(tempPassword(() => new Uint32Array([4827]))).toBe("Natec-4827");
    expect(tempPassword()).toMatch(/^Natec-\d{4}$/);
  });
  it("internal email is not real", () => expect(isSyntheticEmail("x@clients.natecdev.com")).toBe(true));
});
