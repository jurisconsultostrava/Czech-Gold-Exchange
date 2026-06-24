import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useRegisterCustomer } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerAuth } from "@/lib/customer-auth";

export default function Registrace() {
  const [, navigate] = useLocation();
  const { refresh } = useCustomerAuth();
  const register = useRegisterCustomer();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků.");
      return;
    }
    register.mutate(
      {
        data: {
          email,
          password,
          firstName: firstName || null,
          lastName: lastName || null,
          phone: phone || null,
        },
      },
      {
        onSuccess: () => {
          refresh();
          navigate("/ucet");
        },
        onError: () =>
          setError("Registrace se nezdařila. E-mail je možná již použitý."),
      },
    );
  };

  return (
    <div className="container mx-auto px-4 py-24 max-w-md">
      <p className="eyebrow mb-4">Registrace</p>
      <h1 className="text-4xl font-display text-ink-1 mb-10">Vytvořit účet</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Jméno</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Příjmení</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-bg-2 border-bg-3 rounded-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
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
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-bg-2 border-bg-3 rounded-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Heslo *</Label>
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
          disabled={register.isPending}
          className="w-full bg-gold text-bg-0 hover:bg-gold-2 h-12 rounded-none text-base"
        >
          {register.isPending ? "Registruji..." : "Zaregistrovat se"}
        </Button>
      </form>
      <p className="text-sm text-ink-2 text-center mt-8">
        Máte už účet?{" "}
        <Link href="/prihlaseni" className="text-gold hover:text-gold-2">
          Přihlaste se
        </Link>
      </p>
    </div>
  );
}
