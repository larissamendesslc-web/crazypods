import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/shop.tsx";
let code = readFileSync(path, "utf8");
const needle = "        </a>\n\n        <Dialog\n          open={!!open}";
if (code.includes("floating-cart-launcher")) throw new Error("Floating cart already applied");
if (!code.includes(needle)) throw new Error("Existing WhatsApp/dialog boundary not found");
const launcher = [
  '        </a>',
  '',
  '        {/* Show the same existing cart sheet, without a second cart implementation. */}',
  '        {cart > 0 && !cartOpen && (',
  '          <button',
  '            type="button"',
  '            className="floating-cart-launcher"',
  '            onClick={() => setCartOpen(true)}',
  '            aria-label={"Abrir carrinho com " + cart + " " + (cart === 1 ? "item" : "itens")}',
  '            title="Ver carrinho"',
  '          >',
  '            <ShoppingBag className="h-5 w-5 shrink-0" aria-hidden="true" />',
  '            <span className="floating-cart-label">Carrinho</span>',
  '            <span className="floating-cart-count" aria-hidden="true">{cart > 99 ? "99+" : cart}</span>',
  '          </button>',
  '        )}',
  '',
  '        <Dialog',
  '          open={!!open}',
].join("\n");
code = code.replace(needle, launcher);
writeFileSync(path, code);

const cssPath = "src/styles.css";
let css = readFileSync(cssPath, "utf8");
if (css.includes("/* CRAZY FLOATING CART */")) throw new Error("Floating cart styles already applied");
css += "\n" + readFileSync("scripts/floating-cart.css", "utf8") + "\n";
writeFileSync(cssPath, css);
console.log("Crazy Floating Cart applied.");
