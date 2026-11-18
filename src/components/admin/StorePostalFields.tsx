import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupDeliveryCep } from "@/utils/delivery.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StorePostalFields({ store, zip, whatsapp, onChange }: { store: number; zip: string; whatsapp: string; onChange: (field: "zip" | "whatsapp", value: string) => void }) {
  const lookup = useServerFn(lookupDeliveryCep);
  const [address, setAddress] = useState("");
  useEffect(() => {
    let active = true;
    setAddress("");
    if (zip.length !== 8) return;
    setAddress("Consultando CEP...");
    const timer = setTimeout(async () => {
      try {
        const result = await lookup({ data: { zip } });
        if (active) setAddress("error" in result ? result.error : [result.street, result.neighborhood, `${result.city} - ${result.state}`].filter(Boolean).join(", "));
      } catch { if (active) setAddress("Não foi possível consultar o CEP."); }
    }, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [zip, lookup]);
  return <div className="space-y-3 border-b pb-5">
    <h3 className="font-semibold">Loja {store}</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`store-${store}-cep`}>CEP da loja {store}</Label><Input id={`store-${store}-cep`} inputMode="numeric" required maxLength={9} placeholder="00000-000" value={zip} onChange={(e) => onChange("zip", e.target.value.replace(/\D/g, "").slice(0, 8))} /></div>
      <div className="space-y-2"><Label htmlFor={`store-${store}-whatsapp`}>WhatsApp da loja {store}</Label><Input id={`store-${store}-whatsapp`} type="tel" required placeholder="DDD + número" value={whatsapp} onChange={(e) => onChange("whatsapp", e.target.value.replace(/\D/g, "").slice(0, 13))} /></div>
    </div>
    {address && <p role="status" className="text-sm text-muted-foreground">{address}</p>}
  </div>;
}