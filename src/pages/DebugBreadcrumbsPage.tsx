import { useEffect, useState } from "react";
import {
  getGlobalSearchBreadcrumbs,
  type Breadcrumb,
} from "@/contexts/GlobalSearchContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

/**
 * Internal debug page that renders the GlobalSearch breadcrumbs history
 * as a readable table. Useful when investigating "used outside provider"
 * style issues during development.
 */
export default function DebugBreadcrumbsPage() {
  const [crumbs, setCrumbs] = useState<readonly Breadcrumb[]>(() =>
    getGlobalSearchBreadcrumbs()
  );

  const refresh = (): void => setCrumbs(getGlobalSearchBreadcrumbs());

  useEffect(() => {
    const id = window.setInterval(refresh, 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>GlobalSearch Breadcrumbs</CardTitle>
            <CardDescription>
              سجل تشخيصي لمراحل تركيب/استخدام موفّر البحث (تحديث تلقائي كل 1.5 ث).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {crumbs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              لا توجد سجلات بعد / No breadcrumbs recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crumbs.map((c, i) => (
                  <TableRow key={`${c.ts}-${i}`}>
                    <TableCell className="font-mono text-xs">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {new Date(c.ts).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm">{c.event}</TableCell>
                    <TableCell className="text-xs text-muted-foreground break-all">
                      {c.detail ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
