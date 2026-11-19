import { useState } from "react";
import { signUpSchema } from "@/lib/signup";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ onDone, initialMode = "login" }: { onDone?: () => void; initialMode?: "login" | "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse(f);
        if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos"); return; }
        const { password, email, ...meta } = parsed.data;
        const { error } = await supabase.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo à Crazy.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw new Error("E-mail ou senha incorretos");
        toast.success("Bem-vindo de volta!");
      }
      onDone?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(
        msg.includes("already registered") ? "Este e-mail já tem conta. Faça login."
        : msg.toLowerCase().includes("weak") || msg.toLowerCase().includes("pwned") ? "Senha muito comum. Escolha uma senha mais forte."
        : msg.includes("mail server") || msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("email") ? "E-mail inválido. Confira o endereço."
        : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="crazy-auth-form min-w-0 max-w-full space-y-4">
      <div className="crazy-auth-mode-grid grid min-w-0 grid-cols-2 rounded-full border bg-secondary p-1 text-sm font-bold">
        {(["login", "signup"] as const).map((m) => (
          <Button key={m} variant="ghost" type="button" onClick={() => setMode(m)} className={`crazy-auth-mode-btn min-w-0 w-full rounded-full px-2 py-2.5 text-xs leading-snug whitespace-normal transition-colors sm:text-sm ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            {m === "login" ? "Entrar" : "Criar conta"}
          </Button>
        ))}
      </div>
      {mode === "signup" && (
        <Field label="Nome completo"><Input value={f.full_name} onChange={set("full_name")} autoComplete="name" className="h-12 rounded-xl" /></Field>
      )}
      <Field label="E-mail"><Input type="email" value={f.email} onChange={set("email")} autoComplete="email" required className="h-12 rounded-xl" /></Field>
      {mode === "signup" && (
        <>
          <Field label="Telefone / WhatsApp"><Input type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="(11) 99999-9999" className="h-12 rounded-xl" /></Field>
        </>
      )}
      <Field label="Senha"><Input type="password" value={f.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} required className="h-12 rounded-xl" /></Field>
      <Button type="submit" variant="neon" size="xl" className="crazy-auth-submit min-w-0 w-full max-w-full whitespace-normal break-words px-3 text-xs leading-snug sm:text-sm" disabled={loading}>
        {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block min-w-0 max-w-full space-y-1.5"><span className="text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}