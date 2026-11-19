import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/queries";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import christmasHat from "@/assets/christmas-hat.png";

export function Header() {
  const cart = useCart();
  const navigate=useNavigate();
  const {data:settings}=useQuery(settingsQuery);
  const [search,setSearch]=useState("");
  const [mobileSearch,setMobileSearch]=useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const msg=settings?.announcement||"Experiência Crazy Pods · Confira nossa vitrine";
  function submitSearch(event:FormEvent){
    event.preventDefault();
    const q=search.trim().slice(0,100);
    if(!q)return;
    setMobileSearch(false);
    void navigate({to:"/loja",search:{marca:undefined,q}});
  }
  return (
    <header className="crazy-site-header sticky top-0 z-50">
      <div className="crazy-top-ticker" aria-label="Comunicados da loja">
        <div className="crazy-ticker-track">{Array.from({length:5},(_,i)=><span key={i}>{msg}<b>✦</b></span>)}</div>
      </div>
      <div className="crazy-site-nav-bg">
        <div className="crazy-site-nav-shell">
          <div className="crazy-site-nav-main">
            <Link to="/" aria-label="Crazy Pods — início" className="crazy-site-logo"><Logo className="w-32 sm:w-40"/></Link>
            <nav className="crazy-site-desktop-links" aria-label="Navegação principal">
              <Link to="/" activeOptions={{exact:true}} activeProps={{className:"crazy-link-active"}}>Início</Link>
              <Link to="/loja" search={{}} activeProps={{className:"crazy-link-active"}}>Loja</Link>
              <a href="/#destaques">Destaques</a>
              <Link to="/conta" activeProps={{className:"crazy-link-active"}}>Minha conta</Link>
            </nav>
            <form onSubmit={submitSearch} className="crazy-site-search" role="search">
              <Search size={16} aria-hidden="true"/>
              <input type="search" value={search} onChange={e=>setSearch(e.target.value)} maxLength={100} aria-label="Buscar na loja" placeholder="Buscar na Crazy Pods..." />
              <button type="submit" aria-label="Buscar produtos"><Search size={16}/></button>
            </form>
            <div className="crazy-site-actions">
              <Button variant="ghost" size="icon" className="crazy-site-mobile-search-toggle" onClick={()=>{setMobileSearch(v=>!v);setMobileNav(false)}} aria-label={mobileSearch?"Fechar busca":"Abrir busca"}><Search size={19}/></Button>
              <Link to="/conta" aria-label="Minha conta" className="crazy-site-icon-button"><User size={20}/></Link>
              <Button variant="ghost" size="icon" onClick={()=>cart.setOpen(true)} aria-label="Abrir carrinho" className="crazy-site-cart-button relative">
                <img src={christmasHat} alt="" aria-hidden loading="lazy" width={816} height={816} className="christmas-only festive-button-hat"/>
                <ShoppingBag size={20}/>
                {cart.count>0&&<span className="crazy-cart-count">{cart.count}</span>}
              </Button>
              <Button variant="ghost" size="icon" className="crazy-site-mobile-nav-toggle" onClick={()=>{setMobileNav(v=>!v);setMobileSearch(false)}} aria-label={mobileNav?"Fechar menu":"Abrir menu"}>{mobileNav?<X size={20}/>:<Menu size={20}/>}</Button>
            </div>
          </div>
          {mobileSearch&&<form className="crazy-mobile-search" role="search" onSubmit={submitSearch}><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} autoFocus placeholder="Buscar produtos..." type="search" maxLength={100} aria-label="Buscar na loja"/><button aria-label="Buscar" type="submit">Buscar</button></form>}
          {mobileNav&&<nav className="crazy-mobile-nav" aria-label="Menu"><Link onClick={()=>setMobileNav(false)} to="/">Início</Link><Link onClick={()=>setMobileNav(false)} to="/loja" search={{}}>Loja</Link><a onClick={()=>setMobileNav(false)} href="/#destaques">Destaques</a><Link onClick={()=>setMobileNav(false)} to="/conta">Minha conta</Link></nav>}
        </div>
      </div>
    </header>
  );
}
