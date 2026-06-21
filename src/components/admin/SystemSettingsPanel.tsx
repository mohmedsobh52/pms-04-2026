import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export function SystemSettingsPanel() {
  const { isAdmin } = useUserRoles();
  const { isArabic } = useLanguage();
  const qc = useQueryClient();

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["currency-rates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("currency_rates" as any).select("*").order("base_currency");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const update = useMutation({
    mutationFn: async ({ base, rate }: { base: string; rate: number }) => {
      const { error } = await supabase.from("currency_rates" as any)
        .update({ rate, updated_at: new Date().toISOString() }).eq("base_currency", base);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(isArabic ? "تم الحفظ" : "Saved"); qc.invalidateQueries({ queryKey: ["currency-rates"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{isArabic ? "إعدادات النظام" : "System Settings"}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">{isArabic ? "أسعار العملات" : "Currency Rates"}</h4>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rates.map((r: any) => (
              <div key={r.base_currency} className="flex items-center gap-2 border rounded-md p-2">
                <span className="font-mono text-sm w-14">{r.base_currency}</span>
                <Input
                  type="number" step="0.0001"
                  defaultValue={r.rate}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.base_currency]: e.target.value }))}
                  className="flex-1"
                />
                {isAdmin && (
                  <Button size="sm" variant="outline" disabled={!draft[r.base_currency] || update.isPending}
                    onClick={() => update.mutate({ base: r.base_currency, rate: Number(draft[r.base_currency]) })}>
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {!isAdmin && <p className="text-xs text-muted-foreground mt-2">{isArabic ? "للمسؤولين فقط" : "Admin-only edit"}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
