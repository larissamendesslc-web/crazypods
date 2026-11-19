import { Link, useNavigate } from "@tanstack/react-router";
import { Search, ShoppingBag, User, X, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useCart } from "@/lib/cart";
import { settingsQuery } from "@/lib/queries";
import { Logo } from "./Logo";

export function Header() {
  const cart = useCart();
  const navigate = useNavigate();
  const { data: settings } = useQuery(settingsQuery);
  const [search,setSearch] = useState("");
  const [mobileSearch,setMobileSearch] = useState(false);
  const msg = settings?.announcement || "CRAZY PODS · UMA EXPERIÊNCIA DIFERENTE";
  function submitSearch(event:FormEvent) {
    event.preventDefault();
    const q=search.trim().slice(0,100);
    if(!q) return;
    setMobileSearch(false);
    void navigate({to:"/loja",search:{marca:undefined,q}});
  }
  return (
    <header className="ffm-header sticky top-0 z-50" data-heritage-header="true">
      <div className="ffm-ticker" aria-label="Novidades da loja">
        <div className="ffm-ticker-track">{Array.from({length:5},(_,i)=><span key={i}>{msg} <b>✦</b> VIVA A EXPERIÊNCIA CRAZY <b>✦</b></span>)}</div>
      </div>
      <div className="ffm-nav-glass">
        <div className="ffm-nav-main">
          <Link to="/" aria-label="Crazy Pods — Início" className="ffm-nav-logo"><Logo /></Link>
          <nav aria-label="Navegação principal" className="ffm-nav-desktop">
            <Link to="/" activeOptions={{exact:true}} activeProps={{className:"ffm-nav-active"}}>Início</Link>
            <Link to="/loja" search={{}} activeProps={{className:"ffm-nav-active"}}>Loja</Link>
            <a href="/#marcas">Categorias</a>
            <a href="/#destaques">Destaques</a>
          </nav>
          <form role="search" onSubmit={submitSearch} className="ffm-desktop-search">
            <Search size={17} aria-hidden="true"/>
            <input aria-label="Buscar produtos" type="search" placeholder="Buscar na loja..." maxLength={100} value={search} onChange={e=>setSearch(e.target.value)}/>
            <button type="submit" aria-label="Buscar"><Search size={16}/></button>
          </form>
          <div className="ffm-nav-actions">
            <button type="button" className="ffm-search-toggle" onClick={()=>setMobileSearch(v=>!v)} aria-label={mobileSearch?"Fechar busca":"Abrir busca"} aria-expanded={mobileSearch}>{mobileSearch?<X size={20}/>:<Search size={20}/>}</button>
            <Link to="/conta" aria-label="Minha conta" className="ffm-icon-button"><User size={20}/></Link>
            <button type="button" className="ffm-cart-button" onClick={()=>cart.setOpen(true)} aria-label="Abrir carrinho">
              <ShoppingBag size={20}/>{cart.count>0&&<span className="ffm-cart-badge">{cart.count}</span>}
            </button>
          </div>
        </div>
        {mobileSearch&&<form role="search" className="ffm-mobile-search" onSubmit={submitSearch}><Search size={17} aria-hidden="true"/><input type="search" autoFocus maxLength={100} value={search} onChange={e=>setSearch(e.target.value)} placeholder="O que você procura?" aria-label="Buscar produtos"/><button type="submit">Buscar</button></form>}
        <nav aria-label="Menu para celular" className="ffm-nav-mobile">
          <Link to="/" activeOptions={{exact:true}} activeProps={{className:"ffm-nav-active"}}>Início</Link>
          <Link to="/loja" search={{}} activeProps={{className:"ffm-nav-active"}}>Loja</Link>
          <a href="/#marcas">Categorias</a>
          <a href="/#destaques">Destaques</a>
        </nav>
      </div>
    </header>
  );
}
