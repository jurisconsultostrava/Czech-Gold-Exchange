import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getAdminToken } from "@/lib/admin-auth";
import { useToast } from "@/hooks/use-toast";

async function downloadFile(path: string, filename: string) {
  const token = getAdminToken();
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error("Stahování selhalo");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function uploadFile(path: string, file: File): Promise<{ imported: number }> {
  const token = getAdminToken();
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  if (!res.ok) throw new Error("Import selhal");
  return res.json();
}

export default function AdminImportExport() {
  const { toast } = useToast();
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleExport = async (type: "xml" | "csv") => {
    try {
      await downloadFile(`api/admin/export/${type}`, `produkty.${type}`);
    } catch {
      toast({
        title: "Chyba",
        description: "Export se nezdařil.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (type: "xml" | "csv", file: File | null) => {
    if (!file) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await uploadFile(`api/admin/import/${type}`, file);
      setResult(`Importováno ${res.imported} produktů.`);
      toast({
        title: "Hotovo",
        description: `Importováno ${res.imported} produktů.`,
      });
    } catch {
      toast({
        title: "Chyba",
        description: "Import se nezdařil.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-display text-ink-1 mb-6">Import / Export</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-bg-3 bg-bg-2 p-6 space-y-4">
          <h3 className="text-xl font-display text-ink-1">Export</h3>
          <p className="text-sm text-ink-2">
            Stáhněte aktuální produkty s cenami a přirážkou.
          </p>
          <div className="flex gap-3">
            <Button
              className="bg-gold text-bg-0 hover:bg-gold-2 rounded-none"
              onClick={() => handleExport("xml")}
            >
              Stáhnout XML
            </Button>
            <Button
              variant="outline"
              className="border-gold text-gold hover:bg-gold/10 rounded-none"
              onClick={() => handleExport("csv")}
            >
              Stáhnout CSV
            </Button>
          </div>
        </div>

        <div className="border border-bg-3 bg-bg-2 p-6 space-y-4">
          <h3 className="text-xl font-display text-ink-1">Import</h3>
          <p className="text-sm text-ink-2">
            Nahrajte soubor pro aktualizaci produktů (párování dle kódu).
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Import XML</Label>
              <input
                type="file"
                accept=".xml,text/xml,application/xml"
                disabled={busy}
                onChange={(e) =>
                  handleImport("xml", e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-ink-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-gold file:text-bg-0 file:cursor-pointer"
              />
            </div>
            <div className="space-y-2">
              <Label>Import CSV</Label>
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) =>
                  handleImport("csv", e.target.files?.[0] ?? null)
                }
                className="block w-full text-sm text-ink-2 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-gold file:text-bg-0 file:cursor-pointer"
              />
            </div>
          </div>
          {busy && <p className="text-sm text-ink-3">Importuji...</p>}
          {result && <p className="text-sm text-gold">{result}</p>}
        </div>
      </div>
    </div>
  );
}
