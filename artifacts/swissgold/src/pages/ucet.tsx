import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyOrders,
  getGetMyOrdersQueryKey,
  useGetMyBuybacks,
  getGetMyBuybacksQueryKey,
  useLogoutCustomer,
  useUpdateProfile,
  useChangePassword,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerAuth } from "@/lib/customer-auth";
import { useToast } from "@/hooks/use-toast";
import { Package, Recycle, LogOut, User } from "lucide-react";

const ORDER_STATUS: Record<string, string> = {
  new: "Nová",
  processing: "Zpracovává se",
  paid: "Zaplaceno",
  shipped: "Odesláno",
  completed: "Dokončeno",
  cancelled: "Zrušeno",
};

const BUYBACK_STATUS: Record<string, string> = {
  new: "Nová",
  reviewing: "V posouzení",
  offered: "Nabídka zaslána",
  accepted: "Přijato",
  completed: "Dokončeno",
  rejected: "Zamítnuto",
};

export default function Ucet() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { customer, isLoading, isAuthenticated, refresh } = useCustomerAuth();
  const { toast } = useToast();
  const logout = useLogoutCustomer();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/prihlaseni");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        refresh();
        navigate("/");
      },
    });
  };

  if (isLoading || !customer) {
    return (
      <div className="container mx-auto px-4 py-24 text-center text-ink-2">
        Načítání…
      </div>
    );
  }

  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.email;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-12">
        <div>
          <p className="eyebrow mb-2">Můj účet</p>
          <h1 className="text-4xl font-display text-ink-1">{fullName}</h1>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-bg-3 text-ink-2 hover:text-gold rounded-none gap-2"
        >
          <LogOut className="w-4 h-4" /> Odhlásit se
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-bg-2 rounded-none mb-8 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-none">
            Přehled
          </TabsTrigger>
          <TabsTrigger value="orders" className="rounded-none">
            Objednávky
          </TabsTrigger>
          <TabsTrigger value="buybacks" className="rounded-none">
            Výkupy
          </TabsTrigger>
          <TabsTrigger value="settings" className="rounded-none">
            Nastavení
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab email={customer.email} fullName={fullName} />
        </TabsContent>
        <TabsContent value="orders">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="buybacks">
          <BuybacksTab />
        </TabsContent>
        <TabsContent value="settings">
          <SettingsTab
            initial={{
              firstName: customer.firstName ?? "",
              lastName: customer.lastName ?? "",
              phone: customer.phone ?? "",
              address: customer.address ?? "",
              city: customer.city ?? "",
              zip: customer.zip ?? "",
            }}
            onSaved={refresh}
            onToast={toast}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const { data: orders } = useGetMyOrders({
    query: { queryKey: getGetMyOrdersQueryKey() },
  });
  const { data: buybacks } = useGetMyBuybacks({
    query: { queryKey: getGetMyBuybacksQueryKey() },
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div className="border border-bg-3 bg-bg-2 p-6">
        <User className="w-6 h-6 text-gold mb-4" />
        <p className="text-ink-1">{fullName}</p>
        <p className="text-sm text-ink-3">{email}</p>
      </div>
      <div className="border border-bg-3 bg-bg-2 p-6">
        <Package className="w-6 h-6 text-gold mb-4" />
        <p className="text-3xl font-light text-ink-1">{orders?.length ?? 0}</p>
        <p className="text-sm text-ink-3">Objednávek</p>
      </div>
      <div className="border border-bg-3 bg-bg-2 p-6">
        <Recycle className="w-6 h-6 text-gold mb-4" />
        <p className="text-3xl font-light text-ink-1">{buybacks?.length ?? 0}</p>
        <p className="text-sm text-ink-3">Žádostí o výkup</p>
      </div>
    </div>
  );
}

function OrdersTab() {
  const { data: orders, isLoading } = useGetMyOrders({
    query: { queryKey: getGetMyOrdersQueryKey() },
  });

  if (isLoading) {
    return <p className="text-ink-2">Načítání…</p>;
  }
  if (!orders || orders.length === 0) {
    return <p className="text-ink-3">Zatím nemáte žádné objednávky.</p>;
  }

  return (
    <div className="space-y-4">
      {orders.map((o) => (
        <div key={o.id} className="border border-bg-3 bg-bg-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-mono text-gold">{o.orderNumber}</p>
              <p className="text-sm text-ink-3">
                {new Date(o.createdAt).toLocaleDateString("cs-CZ")}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs border border-bg-3 px-2 py-1 text-ink-2">
                {ORDER_STATUS[o.status] ?? o.status}
              </span>
              <p className="text-lg text-ink-1 font-mono mt-2">
                {o.totalCzk.toLocaleString("cs-CZ")} Kč
              </p>
            </div>
          </div>
          <div className="border-t border-bg-3 pt-3 space-y-1">
            {o.items.map((it) => (
              <div
                key={it.id}
                className="flex justify-between text-sm text-ink-2"
              >
                <span>
                  {it.quantity}× {it.productName}
                </span>
                <span className="font-mono">
                  {(it.unitPriceCzk * it.quantity).toLocaleString("cs-CZ")} Kč
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BuybacksTab() {
  const { data: buybacks, isLoading } = useGetMyBuybacks({
    query: { queryKey: getGetMyBuybacksQueryKey() },
  });

  if (isLoading) {
    return <p className="text-ink-2">Načítání…</p>;
  }
  if (!buybacks || buybacks.length === 0) {
    return <p className="text-ink-3">Zatím nemáte žádné žádosti o výkup.</p>;
  }

  return (
    <div className="space-y-4">
      {buybacks.map((b) => (
        <div key={b.id} className="border border-bg-3 bg-bg-2 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-gold">{b.requestNumber}</p>
            <span className="text-xs border border-bg-3 px-2 py-1 text-ink-2">
              {BUYBACK_STATUS[b.status] ?? b.status}
            </span>
          </div>
          <p className="text-sm text-ink-3 mb-2">
            {new Date(b.createdAt).toLocaleDateString("cs-CZ")}
          </p>
          {b.itemDescription && (
            <p className="text-ink-2">{b.itemDescription}</p>
          )}
          {b.estimatedCzk != null && (
            <p className="text-ink-1 font-mono mt-2">
              Odhad: {b.estimatedCzk.toLocaleString("cs-CZ")} Kč
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
}

function SettingsTab({
  initial,
  onSaved,
  onToast,
}: {
  initial: ProfileForm;
  onSaved: () => void;
  onToast: ReturnType<typeof useToast>["toast"];
}) {
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [form, setForm] = useState<ProfileForm>(initial);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);

  const set = (key: keyof ProfileForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate(
      {
        data: {
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          zip: form.zip || null,
        },
      },
      {
        onSuccess: () => {
          onSaved();
          onToast({ title: "Uloženo", description: "Profil byl aktualizován." });
        },
        onError: () =>
          onToast({
            title: "Chyba",
            description: "Profil se nepodařilo uložit.",
            variant: "destructive",
          }),
      },
    );
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPassword.length < 6) {
      setPwError("Nové heslo musí mít alespoň 6 znaků.");
      return;
    }
    changePassword.mutate(
      { data: { currentPassword, newPassword } },
      {
        onSuccess: () => {
          setCurrentPassword("");
          setNewPassword("");
          onToast({ title: "Hotovo", description: "Heslo bylo změněno." });
        },
        onError: () => setPwError("Stávající heslo není správné."),
      },
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl">
      <form onSubmit={saveProfile} className="space-y-6">
        <h2 className="text-2xl font-display text-ink-1">Osobní údaje</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Jméno</Label>
            <Input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Příjmení</Label>
            <Input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Telefon</Label>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label>Ulice a číslo</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Město</Label>
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>PSČ</Label>
            <Input
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={updateProfile.isPending}
          className="bg-gold text-bg-0 hover:bg-gold-2 h-11 px-6 rounded-none"
        >
          {updateProfile.isPending ? "Ukládám…" : "Uložit změny"}
        </Button>
      </form>

      <form onSubmit={savePassword} className="space-y-6">
        <h2 className="text-2xl font-display text-ink-1">Změna hesla</h2>
        <div className="space-y-2">
          <Label>Stávající heslo</Label>
          <Input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label>Nové heslo</Label>
          <Input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        {pwError && <p className="text-sm text-red-400">{pwError}</p>}
        <Button
          type="submit"
          disabled={changePassword.isPending}
          className="bg-gold text-bg-0 hover:bg-gold-2 h-11 px-6 rounded-none"
        >
          {changePassword.isPending ? "Měním…" : "Změnit heslo"}
        </Button>
      </form>
    </div>
  );
}
