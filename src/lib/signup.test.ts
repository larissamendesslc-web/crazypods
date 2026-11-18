import { expect, it } from "vitest";
import { signUpSchema } from "./signup";

it("permite cadastro com nome, telefone, email e senha sem endereço", () => {
  expect(signUpSchema.safeParse({ full_name: "Alan Lucas", email: "alan@example.com", phone: "11999999999", password: "Example-2026" }).success).toBe(true);
});
it("não envia endereço informado ao cadastro", () => {
  const result = signUpSchema.parse({ full_name: "Alan Lucas", email: "alan@example.com", phone: "11999999999", password: "Example-2026", address: "Rua antiga", city: "São Paulo", zip: "01001000" });
  expect(result).not.toHaveProperty("address");
  expect(result).not.toHaveProperty("city");
  expect(result).not.toHaveProperty("zip");
});