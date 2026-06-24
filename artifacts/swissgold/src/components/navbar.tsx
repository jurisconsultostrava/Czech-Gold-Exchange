import { Link } from "wouter";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { useCustomerAuth } from "@/lib/customer-auth";
import { ShoppingCart, Menu, User } from "lucide-react";
import { Button } from "./ui/button";

export function Navbar() {
  const { itemCount } = useCart();
  const { currency, toggle } = useCurrency();
  const { isAuthenticated, customer } = useCustomerAuth();
  const accountLabel =
    customer?.firstName || customer?.email?.split("@")[0] || "Můj účet";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-bg-1/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-display font-medium tracking-wide">
            SwissGold<span className="text-gold">.cz</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/katalog" className="text-ink-2 hover:text-ink-1 transition-colors">Katalog</Link>
            <Link href="/vykup" className="text-ink-2 hover:text-ink-1 transition-colors">Výkup</Link>
            <Link href="/o-nas" className="text-ink-2 hover:text-ink-1 transition-colors">O nás</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={toggle}
            aria-label="Přepnout měnu"
            className="text-xs font-mono border border-bg-3 hover:border-gold rounded-sm px-2 py-1 text-ink-2 hover:text-gold transition-colors"
          >
            {currency}
          </button>
          {isAuthenticated ? (
            <Link
              href="/ucet"
              className="hidden sm:flex items-center gap-1.5 text-sm text-ink-2 hover:text-gold transition-colors max-w-[10rem] truncate"
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">{accountLabel}</span>
            </Link>
          ) : (
            <Link
              href="/prihlaseni"
              className="hidden sm:flex items-center gap-1.5 text-sm text-ink-2 hover:text-gold transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Přihlásit</span>
            </Link>
          )}
          <Link href="/kosik" className="relative text-ink-1 hover:text-gold transition-colors">
            <ShoppingCart className="w-5 h-5" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 flex items-center justify-center bg-gold text-bg-0 text-[10px] font-bold rounded-full">
                {itemCount}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
