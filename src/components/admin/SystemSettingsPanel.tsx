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
      const { data, error } = await supabase.from("currency_rates").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const update = useMutation({
    mutationFn: async ({ code, rate }: { code: string; rate: number }) => {
      const { error } = await supabase.from("currency_rates")
        .update({ rate_to_usd: rate, updated_at: new Date().toISOString() }).eq("code", code);
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
          <h4 className="text-sm font-semibold mb-2">{isArabic ? "أسعار العملات (مقابل USD)" : "Currency Rates (vs USD)"}</h4>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {rates.map((r: any) => (
              <div key={r.code} className="flex items-center gap-2 border rounded-md p-2">
                <span className="font-mono text-sm w-14">{r.code}</span>
                <Input
                  type="number" step="0.0001"
                  defaultValue={r.rate_to_usd}
                  disabled={!isAdmin}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.code]: e.target.value }))}
                  className="flex-1"
                />
                {isAdmin && (
                  <Button size="sm" variant="outline" disabled={!draft[r.code] || update.isPending}
                    onClick={() => update.mutate({ code: r.code, rate: Number(draft[r.code]) })}>
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
