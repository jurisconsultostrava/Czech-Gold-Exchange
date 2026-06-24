import { useEffect, useState } from "react";
import { useGetSpot } from "@workspace/api-client-react";

export function SpotTicker() {
  const { data: spotData } = useGetSpot({
    query: { refetchInterval: 60000 },
  });

  if (!spotData) return null;

  return (
    <div className="bg-gold text-bg-0 text-xs font-mono py-1.5 overflow-hidden whitespace-nowrap">
      <div className="animate-in slide-in-from-right-full duration-1000 flex gap-8 px-4">
        {spotData.spots.map((spot) => (
          <span key={spot.metal} className="flex gap-2">
            <span className="uppercase font-semibold">{spot.metal}</span>
            <span>{spot.pricePerOzCzk.toLocaleString("cs-CZ")} Kč/oz</span>
          </span>
        ))}
        <span className="flex gap-2 text-bg-1/80">
          <span>EUR/CZK</span>
          <span>{spotData.eurCzk.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}
