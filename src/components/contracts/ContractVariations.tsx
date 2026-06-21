import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Check, X } from "lucide-react";
import { logFinancialAction } from "@/lib/financial-audit";
import { toast } from "@/hooks/use-toast";

export function ContractVariations({ contractId, contractValue = 0 }: { contractId: string; contractValue?: number }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ variation_number: "", description: "", amount: "" });

  const load = async () => {
    const { data } = await supabase.from("contract_variations" as any).select("*")
      .eq("contract_id", contractId).order("created_at", { ascending: false });
    setItems(data ?? []);
  };
  useEffect(() => { load(); }, [contractId]);

  const create = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const payload = {
      contract_id: contractId, user_id: user.id,
      variation_number: form.variation_number || `VO-${(items.length + 1).toString().padStart(3, "0")}`,
      description: form.description, amount: Number(form.amount) || 0,
    };
    const { data, error } = await supabase.from("contract_variations" as any).insert(payload).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    await logFinancialAction({ entity_type: "contract_variation", entity_id: (data as any).id, action: "create", after: payload });
    setOpen(false); setForm({ variation_number: "", description: "", amount: "" });
    load();
  };

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    const update: any = { status };
    if (status === "approved") update.approved_at = new Date().toISOString();
    await supabase.from("contract_variations" as any).update(update).eq("id", id);
    await logFinancialAction({ entity_type: "contract_variation", entity_id: id, action: status });
    load();
  };

  const totalApproved = items.filter((i) => i.status === "approved").reduce((s, i) => s + Number(i.amount || 0), 0);
  const pct = contractValue > 0 ? (totalApproved / contractValue) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Variations</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Variation Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Variation number (e.g. VO-001)" value={form.variation_number}
                onChange={(e) => setForm({ ...form, variation_number: e.target.value })} />
              <Textarea placeholder="Description" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="number" placeholder="Amount" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-3 text-sm flex justify-between">
          <span className="text-muted-foreground">Approved variations</span>
          <span className="tabular-nums">{totalApproved.toFixed(2)} ({pct.toFixed(1)}%)</span>
        </div>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No variations yet.</p>}
        <ul className="divide-y">
          {items.map((v) => (
            <li key={v.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{v.variation_number} <span className="tabular-nums opacity-70">· {Number(v.amount).toFixed(2)}</span></div>
                <div className="text-xs text-muted-foreground truncate">{v.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={v.status === "approved" ? "default" : v.status === "rejected" ? "destructive" : "outline"}>{v.status}</Badge>
                {v.status === "pending" && (
                  <>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(v.id, "approved")}><Check className="h-3 w-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setStatus(v.id, "rejected")}><X className="h-3 w-3" /></Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
