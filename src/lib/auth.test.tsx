import { act, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth";

const authMock=vi.hoisted(()=>({
  callback:null as null|((event:string,session:unknown)=>void),
}));
vi.mock("@/integrations/supabase/client",()=>({
  supabase:{
    auth:{
      onAuthStateChange:(cb:(event:string,session:unknown)=>void)=>{
        authMock.callback=cb;
        return {data:{subscription:{unsubscribe:()=>{authMock.callback=null}}}};
      },
      getSession:async()=>({data:{session:null}}),
    },
    from:()=>({select:()=>({eq:async()=>({data:[],error:null})})}),
  },
}));

describe("AuthProvider customer-to-courier switching",()=>{
  it("clears a customer's cached order when a different account logs in",async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    const ui=render(<QueryClientProvider client={client}><AuthProvider><div>Auth test</div></AuthProvider></QueryClientProvider>);
    await waitFor(()=>expect(authMock.callback).not.toBeNull());
    // Await initial session restoration before switching accounts.
    await act(async()=>{await Promise.resolve()});
    await act(async()=>{authMock.callback?.("SIGNED_IN",{user:{id:"customer",email:"buyer@example.com"}})});
    const key=["order","my-order","customer"];
    client.setQueryData(key,{code:"TEST-ORDER"});
    expect(client.getQueryData(key)).toEqual({code:"TEST-ORDER"});
    await act(async()=>{authMock.callback?.("SIGNED_IN",{user:{id:"courier",email:"courier@example.com"}})});
    expect(client.getQueryData(key)).toBeUndefined();
    ui.unmount();
    client.clear();
  });
  it("keeps cached orders after a token refresh for the same account",async()=>{
    const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
    const ui=render(<QueryClientProvider client={client}><AuthProvider><div>Auth test</div></AuthProvider></QueryClientProvider>);
    await waitFor(()=>expect(authMock.callback).not.toBeNull());
    await act(async()=>{await Promise.resolve()});
    const identity={user:{id:"customer",email:"buyer@example.com"}};
    await act(async()=>{authMock.callback?.("SIGNED_IN",identity)});
    const key=["order","my-order","customer"];
    client.setQueryData(key,{code:"TEST-ORDER"});
    await act(async()=>{authMock.callback?.("TOKEN_REFRESHED",identity)});
    expect(client.getQueryData(key)).toEqual({code:"TEST-ORDER"});
    ui.unmount();
    client.clear();
  });
});
