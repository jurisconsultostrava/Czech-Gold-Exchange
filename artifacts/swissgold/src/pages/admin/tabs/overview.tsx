import {
  useGetAdminStats,
  getGetAdminStatsQueryKey,
} from "@workspace/api-client-react";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-bg-3 bg-bg-2 p-6">
      <div className="text-sm text-ink-3 uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl text-gold font-light">{value}</div>
    </div>
  );
}

export default function AdminOverview() {
  const { data: stats } = useGetAdminStats({
    query: { refetchInterval: 60000, queryKey: getGetAdminStatsQueryKey() },
  });

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Přehled</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard
          label="Počet produktů"
          value={(stats?.productCount ?? 0).toLocaleString("cs-CZ")}
        />
        <StatCard
          label="Nové objednávky"
          value={(stats?.newOrders ?? 0).toLocaleString("cs-CZ")}
        />
        <StatCard
          label="Nové výkupy"
          value={(stats?.newBuybacks ?? 0).toLocaleString("cs-CZ")}
        />
        <StatCard
          label="Spot zlato (Kč/g)"
          value={`${(stats?.spotGoldCzkPerGram ?? 0).toLocaleString("cs-CZ", {
            maximumFractionDigits: 2,
          })} Kč`}
        />
        <StatCard
          label="EUR / CZK"
          value={(stats?.eurCzk ?? 0).toLocaleString("cs-CZ", {
            maximumFractionDigits: 2,
          })}
        />
      </div>
    </div>
  );
}
