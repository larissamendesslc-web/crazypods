import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck, ArrowRight, LogOut, Snowflake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logo from "@/assets/crazy-pods-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { settingsQuery, DEFAULT_SETTINGS } from "@/lib/settings";
import { activeTheme } from "@/lib/theme-engine";
import { useSeasonClock } from "@/components/season-clock";
import { ChristmasHat, SnowfallEffect } from "@/components/christmas-theme";

const AGE_SESSION_KEY = "crazypods-age-confirmed";

/**
 * Christmas Edition / Black Ice.
 * Real, accessible age-gate controls remain interactive above the decorative artwork.
 * The gate changes only when Christmas is actually active in CRAZY SEASONS.
 */
export function AgeGate({ children }: { children: ReactNode }) {
  const [confirmed, setConfirmed] = useState(false);
  const [rejected, setRejected] = useState(false);
  const { data, isError } = useQuery(settingsQuery);
  const engine = data?.season ?? DEFAULT_SETTINGS.season;
  const now = useSeasonClock(engine, !!data && !isError);
  // Read browser-only search parameters after hydration so SSR and client markup agree.
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (import.meta.env["VITE_CRAZY_SEASONS_PREVIEW"] !== "1") return;
    setDemo(new URLSearchParams(window.location.search).get("ageTheme") === "christmas");
  }, []);
  const christmas = demo || (!!data && !isError && activeTheme(engine, now ?? Number.NaN) === "christmas");

  useEffect(() => {
    try {
      setConfirmed(sessionStorage.getItem(AGE_SESSION_KEY) === "18+");
    } catch {
      // Keep confirmation available when browser storage is disabled.
    }
  }, []);

  const confirm = () => {
    try {
      sessionStorage.setItem(AGE_SESSION_KEY, "18+");
    } catch {
      // Confirmation still works for the current page.
    }
    setConfirmed(true);
  };

  if (confirmed) return children;

  return (
    <main
      className={"grid min-h-dvh place-items-center bg-background px-5 py-12" +
        (christmas ? " age-gate-black-ice" : "")}
    >
      {christmas && engine.profiles.christmas.effects.snow && (
        <div className="age-gate-black-ice-snow" aria-hidden="true">
          <SnowfallEffect intensity={engine.profiles.christmas.intensity} />
        </div>
      )}

      <section
        className={"age-gate-real-content relative z-10 w-full max-w-md text-center" + (christmas ? " age-gate-black-ice-card" : "")}
        aria-labelledby="age-title"
      >
        <div className={christmas ? "age-gate-black-ice-logo relative mx-auto w-fit" : "relative mx-auto w-fit"}>
          <img
            src={logo.url}
            alt="Crazy Pods"
            width={112}
            height={112}
            className={"mx-auto h-28 w-28 rounded-lg border border-border object-cover" +
              (christmas ? " age-gate-black-ice-logo-image" : "")}
          />
          {christmas && <ChristmasHat target="logo" />}
        </div>

        <div
          className={"mx-auto mt-8 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card font-display text-xl font-bold" +
            (christmas ? " age-gate-black-ice-age-badge" : "")}
          aria-hidden="true"
        >
          18+
        </div>
        {christmas && (
          <div className="age-gate-black-ice-divider" aria-hidden="true">
            <Snowflake size={19} />
            <span />
            <Snowflake size={19} />
          </div>
        )}

        <h1
          id="age-title"
          className={"mt-6 font-display text-2xl font-bold leading-snug sm:text-3xl" +
            (christmas ? " age-gate-black-ice-heading" : "")}
        >
          {rejected ? "Acesso restrito a maiores de 18 anos" : "Você tem 18 anos ou mais?"}
        </h1>
        <p className={"mt-4 text-sm leading-relaxed text-muted-foreground" +
          (christmas ? " age-gate-black-ice-description" : "")}>
          {rejected
            ? "Você não pode acessar esta loja. Por favor, feche esta página."
            : "Confirme sua idade para continuar. Este site é destinado exclusivamente a maiores de 18 anos."}
        </p>

        {!rejected && (
          <div className="mt-8 grid gap-3">
            <Button
              variant="commerce"
              onClick={confirm}
              className={"h-auto min-h-12 whitespace-normal py-3" +
                (christmas ? " age-gate-black-ice-confirm" : "")}
            >
              <ShieldCheck />
              Sim, tenho 18 anos ou mais
              <ArrowRight />
            </Button>
            <Button
              variant="ghost"
              onClick={() => setRejected(true)}
              className={"min-h-12 text-muted-foreground" +
                (christmas ? " age-gate-black-ice-decline" : "")}
            >
              <LogOut />
              Não tenho 18 anos
            </Button>
          </div>
        )}

        <p className={"mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground" +
          (christmas ? " age-gate-black-ice-note" : "")}>
          A confirmação é uma declaração de idade, não uma verificação de identidade.
        </p>
      </section>
    </main>
  );
}
