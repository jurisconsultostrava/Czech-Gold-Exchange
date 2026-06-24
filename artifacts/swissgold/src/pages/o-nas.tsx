import { useGetContent } from "@workspace/api-client-react";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ONas() {
  const { data: content } = useGetContent();
  const c = (key: string, fallback = "") => content?.[key] || fallback;

  const facts = [
    { number: c("fact_1_number", "—"), label: c("fact_1_label", "") },
    { number: c("fact_2_number", "—"), label: c("fact_2_label", "") },
    { number: c("fact_3_number", "—"), label: c("fact_3_label", "") },
    { number: c("fact_4_number", "—"), label: c("fact_4_label", "") },
  ];

  const pillars = [
    { title: c("pillar_1_title", ""), text: c("pillar_1_text", "") },
    { title: c("pillar_2_title", ""), text: c("pillar_2_text", "") },
    { title: c("pillar_3_title", ""), text: c("pillar_3_text", "") },
  ];

  return (
    <div className="w-full">
      {/* Story */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          <p className="eyebrow mb-2">O společnosti</p>
          <h1 className="text-4xl font-display text-ink-1 mb-8">
            {c("story_headline", "O nás")}
          </h1>
          <div className="space-y-6 text-lg text-ink-2">
            {c("story_text_1") && <p>{c("story_text_1")}</p>}
            {c("story_text_2") && <p>{c("story_text_2")}</p>}
          </div>
        </div>

        {/* Facts grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {facts.map((f, i) => (
            <div key={i} className="border border-bg-3 bg-bg-2 p-6 text-center">
              <div className="text-3xl lg:text-4xl text-gold font-light mb-2">
                {f.number}
              </div>
              <div className="text-sm text-ink-2 uppercase tracking-wider">
                {f.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pillars */}
      {pillars.some((p) => p.title || p.text) && (
        <section className="bg-bg-1 py-20 border-y border-bg-3">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {pillars.map((p, i) => (
                <div key={i}>
                  <h3 className="text-xl font-display text-gold mb-3">{p.title}</h3>
                  <p className="text-ink-2">{p.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cenotvorba */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <p className="eyebrow mb-2">Cenotvorba</p>
            <h2 className="text-3xl font-display text-ink-1 mb-6">
              {c("about_pricing_title", "Jak tvoříme ceny")}
            </h2>
            <p className="text-ink-2 whitespace-pre-line">
              {c("about_pricing_text")}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-2">Certifikace</p>
            <h2 className="text-3xl font-display text-ink-1 mb-6">
              {c("about_lbma_title", "LBMA certifikace")}
            </h2>
            <p className="text-ink-2 whitespace-pre-line">{c("about_lbma_text")}</p>
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section className="bg-bg-1 py-20 border-t border-bg-3">
        <div className="container mx-auto px-4">
          <p className="eyebrow mb-2">Kontakt</p>
          <h2 className="text-3xl font-display text-ink-1 mb-10">SWISS GOLD</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <Phone className="w-6 h-6 text-gold shrink-0" />
              <div>
                <div className="text-sm text-ink-3 uppercase tracking-wider mb-1">
                  Telefon
                </div>
                <a href="tel:+420800123456" className="text-ink-1 hover:text-gold">
                  +420 800 123 456
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Mail className="w-6 h-6 text-gold shrink-0" />
              <div>
                <div className="text-sm text-ink-3 uppercase tracking-wider mb-1">
                  E-mail
                </div>
                <a
                  href="mailto:info@swiss-gold.cz"
                  className="text-ink-1 hover:text-gold"
                >
                  info@swiss-gold.cz
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="w-6 h-6 text-gold shrink-0" />
              <div>
                <div className="text-sm text-ink-3 uppercase tracking-wider mb-1">
                  Adresa
                </div>
                <span className="text-ink-1">Praha, Česká republika</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
