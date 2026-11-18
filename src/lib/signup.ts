import { z } from "zod";

export const signUpSchema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().min(10, "Telefone com DDD").max(20),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});