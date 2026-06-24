import { useEffect, useState } from "react";
import {
  useAdminListContent,
  useAdminUpdateContent,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

function isMultiline(key: string) {
  return (
    key.includes("text") ||
    key.includes("subtitle") ||
    key.includes("legal") ||
    key.includes("description")
  );
}

export default function AdminContent() {
  const { data: blocks } = useAdminListContent();
  const updateContent = useAdminUpdateContent();
  const { toast } = useToast();

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (blocks) {
      const map: Record<string, string> = {};
      blocks.forEach((b) => {
        map[b.key] = b.value;
      });
      setValues(map);
    }
  }, [blocks]);

  const saveOne = (key: string) => {
    updateContent.mutate(
      { key, data: { value: values[key] ?? "" } },
      {
        onSuccess: () =>
          toast({ title: "Uloženo", description: `Blok „${key}" byl uložen.` }),
        onError: () =>
          toast({
            title: "Chyba",
            description: "Blok se nepodařilo uložit.",
            variant: "destructive",
          }),
      }
    );
  };

  const saveAll = () => {
    if (!blocks) return;
    blocks.forEach((b) => {
      updateContent.mutate({ key: b.key, data: { value: values[b.key] ?? "" } });
    });
    toast({ title: "Ukládám", description: "Všechny bloky se ukládají." });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-display text-ink-1">Obsah webu</h2>
        <Button
          className="bg-gold text-bg-0 hover:bg-gold-2 rounded-none"
          onClick={saveAll}
        >
          Uložit vše
        </Button>
      </div>

      <div className="space-y-6">
        {blocks?.map((b) => (
          <div
            key={b.key}
            className="border border-bg-3 bg-bg-2 p-4 flex flex-col gap-2"
          >
            <Label className="font-mono text-xs text-gold">{b.key}</Label>
            {isMultiline(b.key) ? (
              <Textarea
                rows={3}
                value={values[b.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [b.key]: e.target.value }))
                }
                className="bg-bg-1 border-bg-3 rounded-none"
              />
            ) : (
              <Input
                value={values[b.key] ?? ""}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [b.key]: e.target.value }))
                }
                className="bg-bg-1 border-bg-3 rounded-none"
              />
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="border-gold text-gold hover:bg-gold/10 rounded-none h-8 px-4 text-xs"
                onClick={() => saveOne(b.key)}
              >
                Uložit
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
