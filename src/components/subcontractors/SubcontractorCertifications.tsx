import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SubcontractorCertifications({ partnerId }: { partnerId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("project_attachments").select("*")
        .contains("metadata" as any, { partner_id: partnerId } as any)
        .order("created_at", { ascending: false });
      setDocs(data ?? []);
    })();
  }, [partnerId]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Documents & Certifications</CardTitle></CardHeader>
      <CardContent>
        {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded for this partner.</p>}
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.id} className="py-2 flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0"><FileText className="h-4 w-4 shrink-0" /><span className="truncate">{d.file_name}</span></span>
              <Badge variant="outline">{d.category ?? d.file_type ?? "Doc"}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
