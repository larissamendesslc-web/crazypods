import { describe, expect, it } from "vitest";
import {cleanInvitationSlug,invitationUrl,invitationMessage,isInvitationPublished,validateInvitationDraft,newInvitationDraft,isInvitationDestination} from "./invitation-cards";

describe("Crazy Invitations",()=>{
 it("creates safe absolute links on the real store domain",()=>{
  expect(invitationUrl("convite-crazy")).toBe("https://crazypods.vercel.app/convite/convite-crazy");
  expect(()=>invitationUrl("../admin")).toThrow();
 });
 it("normalizes user-supplied slugs without unsafe characters",()=>{
  expect(cleanInvitationSlug("Minha Ação VIP!")).toBe("minha-acao-vip");
  expect(cleanInvitationSlug("//admin?token=1")).toBe("admin-token-1");
 });
 it("keeps destination links inside the store",()=>{
  expect(isInvitationDestination("/loja")).toBe(true);
  expect(isInvitationDestination("/")).toBe(true);
  expect(isInvitationDestination("https://evil.example")).toBe(false);
  expect(isInvitationDestination("//example.com")).toBe(false);
 });
 it("never treats expired or disabled links as active",()=>{
  const c={...newInvitationDraft(),id:"x",created_at:"",updated_at:""};
  expect(isInvitationPublished(c)).toBe(true);
  expect(isInvitationPublished({...c,enabled:false})).toBe(false);
  expect(isInvitationPublished({...c,expires_at:"2020-01-01T00:00:00.000Z"})).toBe(false);
 });
 it("validates administrator drafts and creates shareable text",()=>{
  const c={...newInvitationDraft(),id:"id",created_at:"",updated_at:""};
  expect(validateInvitationDraft(c)).toBeNull();
  expect(validateInvitationDraft({...c,title:""})).not.toBeNull();
  expect(validateInvitationDraft({...c,destination:"https://evil.example" as "/loja"})).not.toBeNull();
  expect(invitationMessage(c)).toContain("https://crazypods.vercel.app/convite/");
 });
});
