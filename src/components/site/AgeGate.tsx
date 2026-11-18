import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import heroSmoke from "@/assets/hero-smoke.jpg";
import { Logo } from "./Logo";

const KEY = "crazy-age-ok";

export function AgeGate() {
  const [show, setShow] = useState(false);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(KEY) !== "1") setShow(true);
  }, []);
  useEffect(() => {
    document.body.style.overflow = show ? "hidden" : "";
  }, [show]);
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background px-6">
      <img src={heroSmoke} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-background/40" />
      <div className="relative w-full max-w-md animate-rise text-center">
        <Logo className="w-72 sm:w-80" />
        <div className="glass mt-8 rounded-3xl p-7">
          {denied ? (
            <>
              <h1 className="text-xl font-bold">Volte quando fizer 18</h1>
              <p className="mt-3 text-sm text-muted-foreground">Este conteúdo é exclusivo para maiores de idade.</p>
              <Button variant="glass" className="mt-6" onClick={() => setDenied(false)}>Voltar</Button>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[.3em] text-primary">Acesso restrito</p>
              <h1 className="mt-3 text-2xl font-bold leading-tight">Você tem 18 anos ou mais?</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Os produtos desta loja contêm nicotina e são proibidos para menores de 18 anos.
              </p>
              <div className="mt-7 grid gap-3">
                <Button variant="neon" size="xl" className="animate-pulse-glow" onClick={() => { localStorage.setItem(KEY, "1"); setShow(false); }}>
                  Sim, tenho 18+
                </Button>
                <Button variant="glass" size="lg" onClick={() => setDenied(true)}>Não tenho</Button>
              </div>
            </>
          )}
        </div>
        <p className="mt-6 text-[11px] text-muted-foreground">Ao entrar você confirma ser maior de idade.</p>
      </div>
    </div>
  );
}