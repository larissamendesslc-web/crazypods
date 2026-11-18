import { createClient } from "@supabase/supabase-js";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";
type Mode = "sandbox" | "live";
export type Gateway = { mode: Mode; apiKey: string; webhookToken: string; webhookId: string | null; webhookConfigured: boolean };
function backendToken() {
  const v = process.env["PAYMENTS_BACKEND_TOKEN"];
  if (!v || v.length < 50) throw new Error("Gateway não provisionado no servidor");
  return v;
}
function masterKey() {
  const key=Buffer.from(process.env["PAYMENTS_MASTER_KEY"]??"","base64");
  if(key.length!==32) throw new Error("Chave de criptografia do gateway inválida");
  return key;
}
export function encryptGatewaySecret(plain:string) {
  const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",masterKey(),iv);
  const data=Buffer.concat([cipher.update(plain,"utf8"),cipher.final()]);
  return ["v1",iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),data.toString("base64url")].join(".");
}
function decryptGatewaySecret(value:string) {
  const [version,iv,tag,body]=value.split(".");
  if(version!=="v1"||!iv||!tag||!body)throw new Error("Credencial inválida");
  const decrypt=createDecipheriv("aes-256-gcm",masterKey(),Buffer.from(iv,"base64url"));
  decrypt.setAuthTag(Buffer.from(tag,"base64url"));
  return Buffer.concat([decrypt.update(Buffer.from(body,"base64url")),decrypt.final()]).toString("utf8");
}
function backendDB(){
  const url=process.env["SUPABASE_URL"],key=process.env["SUPABASE_PUBLISHABLE_KEY"];
  if(!url||!key)throw new Error("Supabase não configurado");
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function backendRpc<T=unknown>(fn:string,values:Record<string,unknown>):Promise<T>{
  const {data,error}=await backendDB().rpc(fn as never,{...values,_token:backendToken()} as never);
  if(error)throw new Error("Operação restrita do banco falhou: "+error.message);
  return data as T;
}
export async function getGateway():Promise<Gateway>{
  const r=await backendRpc<unknown>("backend_gateway_settings",{});
  const rows=z.array(z.object({mode:z.enum(["sandbox","live"]),key_ciphertext:z.string(),webhook_ciphertext:z.string(),
    webhook_id:z.string().nullable(),webhook_configured:z.boolean()})).parse(r);
  const v=rows[0];
  if(!v)throw new Error("Asaas ainda não conectado no painel administrativo");
  return {mode:v.mode,apiKey:decryptGatewaySecret(v.key_ciphertext),webhookToken:decryptGatewaySecret(v.webhook_ciphertext),
    webhookId:v.webhook_id,webhookConfigured:v.webhook_configured};
}
export class AsaasApiError extends Error {
  constructor(public status:number,message:string){super(message)}
}
const apiRoot={sandbox:"https://api-sandbox.asaas.com/v3",live:"https://api.asaas.com/v3"};
export async function asaasApiRequest(key:string,mode:Mode,path:string,body?:unknown,method?:"GET"|"POST"|"PUT"|"DELETE"){
  if(!/^\/[a-zA-Z0-9?&=._%/-]*$/.test(path)||path.startsWith("//"))throw new Error("Caminho Asaas inválido");
  const response=await fetch(apiRoot[mode]+path,{
    method:method??(body===undefined?"GET":"POST"),
    headers:{access_token:key,Accept:"application/json","Content-Type":"application/json","User-Agent":"CrazyStore/1.0"},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(25000),
  });
  if(!response.ok){
    let msg=response.status===401?"Chave da API inválida":"Operação Asaas indisponível";
    try{const x=z.object({errors:z.array(z.object({description:z.string()}))}).safeParse(await response.json());
      if(x.success)msg=x.data.errors.map(e=>e.description).join("; ")}catch{}
    throw new AsaasApiError(response.status,`Asaas [${response.status}]: ${msg}`);
  }
  return response.status===204?{}:response.json();
}
export function getSiteUrl(){
  const u=new URL(process.env["SITE_URL"]??"");
  if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw new Error("SITE_URL inválida");
  return u.origin;
}
