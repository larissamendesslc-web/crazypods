import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export const Route=createFileRoute("/admin/seguranca")({
 head:()=>({meta:[{title:"Segurança — Painel Crazy"},{name:"robots",content:"noindex,nofollow"}]}),
 component:Security,
});
function Security(){
 const [password,setPassword]=useState("");
 const [confirm,setConfirm]=useState("");
 const [busy,setBusy]=useState(false);
 async function save(event:React.FormEvent){
  event.preventDefault();
  if(password.length<12||!/[a-z]/i.test(password)||!/[0-9]/.test(password)){
    toast.error("Use pelo menos 12 caracteres com letras e números.");return;
  }
  if(password!==confirm){toast.error("As senhas não coincidem.");return;}
  setBusy(true);
  try{
   const {error}=await supabase.auth.updateUser({password});
   if(error)throw error;
   setPassword("");setConfirm("");
   toast.success("Senha atualizada. Entre novamente para continuar.");
   await supabase.auth.signOut();
  }catch(e){toast.error(e instanceof Error?e.message:"Não foi possível alterar a senha")}
  finally{setBusy(false)}
 }
 return <section className="max-w-xl space-y-6">
  <h1 className="font-display text-2xl font-bold">Segurança da loja</h1>
  <p className="text-sm text-muted-foreground">Altere a senha do administrador antes de vender a loja. Use uma senha exclusiva que não tenha sido usada em outros sites.</p>
  <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-6">
   <div className="space-y-1.5"><Label htmlFor="new-password">Nova senha</Label>
    <Input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)}/></div>
   <div className="space-y-1.5"><Label htmlFor="confirm-password">Confirmar nova senha</Label>
    <Input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></div>
   <Button type="submit" disabled={busy}>{busy?"Alterando...":"Trocar senha e sair"}</Button>
  </form>
 </section>;
}
