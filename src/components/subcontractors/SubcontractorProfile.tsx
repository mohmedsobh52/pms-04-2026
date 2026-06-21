import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export function SubcontractorProfile({ partner }: { partner: any }) {
  if (!partner) return null;
  const rating = Number(partner.rating ?? 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-3">
          <Avatar><AvatarFallback>{(partner.name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="truncate">{partner.name}</div>
            <div className="text-xs font-normal text-muted-foreground truncate">{partner.specialization ?? partner.category ?? "Subcontractor"}</div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Rating</span>
          <span className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
            <span className="tabular-nums ml-1">{rating.toFixed(1)}</span>
          </span>
        </div>
        {partner.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="truncate">{partner.email}</span></div>}
        {partner.phone && <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{partner.phone}</span></div>}
        {partner.status && <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant="outline">{partner.status}</Badge></div>}
      </CardContent>
    </Card>
  );
}
