import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-bg-0 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div>
            <h3 className="text-lg font-display mb-4">SwissGold<span className="text-gold">.cz</span></h3>
            <p className="text-sm text-ink-2">
              Diskrétní prodej a výkup investičních drahých kovů.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-ink-1">Produkty</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link href="/katalog?category=Zlato" className="hover:text-gold transition-colors">Investiční zlato</Link></li>
              <li><Link href="/katalog?category=Stříbro" className="hover:text-gold transition-colors">Investiční stříbro</Link></li>
              <li><Link href="/katalog?category=Platina" className="hover:text-gold transition-colors">Platina a Palladium</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-ink-1">Společnost</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li><Link href="/o-nas" className="hover:text-gold transition-colors">O nás</Link></li>
              <li><Link href="/vykup" className="hover:text-gold transition-colors">Výkup kovů</Link></li>
              <li><Link href="/o-nas" className="hover:text-gold transition-colors">Kontakt</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-ink-1">Kontakt</h4>
            <ul className="space-y-2 text-sm text-ink-2">
              <li>info@swissgold.cz</li>
              <li>+420 800 123 456</li>
              <li>Praha, Česká republika</li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/5 text-xs text-ink-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} SwissGold.cz. Všechna práva vyhrazena.</p>
          <div className="flex gap-4">
            <span>Obchodní podmínky</span>
            <span>Ochrana soukromí</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
