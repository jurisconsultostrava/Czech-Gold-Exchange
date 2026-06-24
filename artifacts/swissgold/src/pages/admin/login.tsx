import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAdminToken } from "@/lib/admin-auth";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const login = useAdminLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    login.mutate(
      { data: { email, password } },
      {
        onSuccess: (res) => {
          setAdminToken(res.token);
          navigate("/admin");
        },
        onError: () => {
          setError("Neplatné přihlašovací údaje.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-0 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border border-bg-3 bg-bg-1 p-8 space-y-6"
      >
        <div className="text-center">
          <h1 className="text-2xl font-display text-ink-1">
            SwissGold<span className="text-gold">.cz</span>
          </h1>
          <p className="text-sm text-ink-3 mt-1">Administrace</p>
        </div>
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
          className="w-full bg-gold text-bg-0 hover:bg-gold-2 h-11 rounded-none"
        >
          {login.isPending ? "Přihlašuji..." : "Přihlásit se"}
        </Button>
      </form>
    </div>
  );
}
