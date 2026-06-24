import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLoginCustomer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerAuth } from "@/lib/customer-auth";

export default function Prihlaseni() {
  const [, navigate] = useLocation();
  const { refresh } = useCustomerAuth();
  const login = useLoginCustomer();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: () => {
          refresh();
          navigate("/ucet");
        },
        onError: () => setError("Nesprávný e-mail nebo heslo."),
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-24 max-w-md">
      <p className="eyebrow mb-4">Přihlášení</p>
      <h1 className="text-4xl font-display text-ink-1 mb-10">Vítejte zpět</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Heslo</Label>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="submit"
          disabled={login.isPending}
          className="w-full bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-base"
        >
          {login.isPending ? "Přihlašuji..." : "Přihlásit se"}
        </Button>
      </form>
      <p className="text-sm text-ink-2 text-center mt-8">
        Nemáte účet?{" "}
        <Link href="/registrace" className="text-gold hover:text-gold-2">
          Zaregistrujte se
        </Link>
      </p>
    </div>
  );
}
