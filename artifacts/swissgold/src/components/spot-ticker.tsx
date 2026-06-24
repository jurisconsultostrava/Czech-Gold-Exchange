import { useGetSpot, getGetSpotQueryKey } from "@workspace/api-client-react";

export function SpotTicker() {
  const { data: spotData } = useGetSpot({
    query: { refetchInterval: 60000, queryKey: getGetSpotQueryKey() },
  });

  if (!spotData) return null;

  const items = [
    ...spotData.spots.map((s) => ({
      label: s.metal.toUpperCase(),
      value: `${s.pricePerOzCzk.toLocaleString("cs-CZ")} Kč/oz`,
    })),
    { label: "EUR/CZK", value: spotData.eurCzk.toFixed(2) },
  ];

  const Track = ({ ariaHidden }: { ariaHidden?: boolean }) => (
    <div className="ticker-track" aria-hidden={ariaHidden}>
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-2 px-6 py-2.5">
          <span className="font-semibold text-gold">{it.label}</span>
          <span className="text-ink-2">{it.value}</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="ticker-marquee relative z-[100] w-full overflow-hidden border-b border-gold/20 bg-gradient-to-b from-[#0d0d0f] to-[#131315] text-xs font-mono tracking-wide">
      <div className="flex w-max">
        <Track />
        <Track ariaHidden />
      </div>
    </div>
  );
}
