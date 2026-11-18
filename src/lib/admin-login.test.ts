import { expect, it } from "vitest";
import { adminLoginEmail } from "./admin-login";

it("accepts admin as the administrator login", () => {
  expect(adminLoginEmail("admin")).toBe("admin@crazy.local");
  expect(adminLoginEmail(" ADMIN ")).toBe("admin@crazy.local");
});
it("preserves email login for other administrator accounts", () => {
  expect(adminLoginEmail("person@example.com")).toBe("person@example.com");
});