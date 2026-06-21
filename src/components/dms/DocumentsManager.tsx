import { useMemo, useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Download, FileText, Search, Tag, Trash2 } from "lucide-react";
import { useDocuments, useDocumentMutations, useExpiringDocuments, useAllDocumentTags, type DocumentRow } from "@/hooks/useDocuments";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { DocumentVersionDialog } from "./DocumentVersionDialog";
import { DataTable, type ColumnDef } from "@/components/data-table/DataTable";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  projectId: string;
}

function ExpiryBadge({ date }: { date: string | null }) {
  if (!date) return <span className="text-muted-foreground text-xs">—</span>;
  const d = parseISO(date);
  const days = differenceInDays(d, new Date());
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  if (days < 0) variant = "destructive";
  else if (days <= 30) variant = "secondary";
  return (
    <Badge variant={variant} className="gap-1 font-normal">
      <AlertTriangle className="w-3 h-3" />
      {date} {days < 0 ? `(${Math.abs(days)}d ago)` : `(${days}d)`}
    </Badge>
  );
}

export function DocumentsManager({ projectId }: Props) {
  const { isArabic } = useLanguage();
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState<string>("all");
  const { data: docs = [], isLoading } = useDocuments({ projectId, search, tag: tag === "all" ? "" : tag });
  const { data: expiring = [] } = useExpiringDocuments(30);
  const allTags = useAllDocumentTags(projectId);
  const { remove, getDownloadUrl } = useDocumentMutations();

  const projectExpiring = useMemo(
    () => expiring.filter((d) => d.project_id === projectId),
    [expiring, projectId],
  );

  const onDownload = async (d: DocumentRow) => {
    const url = await getDownloadUrl(d);
    window.open(url, "_blank");
  };

  const columns = useMemo<ColumnDef<DocumentRow, unknown>[]>(() => [
    {
      accessorKey: "title",
      header: isArabic ? "الوثيقة" : "Document",
      cell: ({ row }) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {row.original.title || row.original.file_name}
          </div>
          {row.original.title && (
            <div className="text-xs text-muted-foreground truncate">{row.original.file_name}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "tags",
      header: isArabic ? "وسوم" : "Tags",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.tags?.map((t) => (
            <Badge key={t} variant="outline" className="font-normal gap-1">
              <Tag className="w-2.5 h-2.5" />{t}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "version_number",
      header: isArabic ? "النسخة" : "Version",
      cell: ({ row }) => <DocumentVersionDialog doc={row.original} />,
      size: 90,
    },
    {
      accessorKey: "expiry_date",
      header: isArabic ? "ينتهي" : "Expires",
      cell: ({ row }) => <ExpiryBadge date={row.original.expiry_date} />,
      size: 180,
    },
    {
      accessorKey: "uploaded_at",
      header: isArabic ? "رُفع" : "Uploaded",
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap">
          {new Date(row.original.uploaded_at).toLocaleDateString()}
        </span>
      ),
      size: 110,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => onDownload(row.original)} title="Download">
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => {
            if (confirm(isArabic ? "حذف هذه الوثيقة؟" : "Delete this document?")) {
              remove.mutate(row.original);
            }
          }}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      ),
      size: 90,
    },
  ], [isArabic]);

  return (
    <div className="space-y-4">
      {projectExpiring.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span>
              {isArabic
                ? `${projectExpiring.length} وثائق تنتهي خلال 30 يوم`
                : `${projectExpiring.length} document(s) expiring within 30 days`}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base">{isArabic ? "إدارة الوثائق" : "Document Management"}</CardTitle>
          <DocumentUploadDialog projectId={projectId} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute start-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isArabic ? "بحث في العنوان والوصف…" : "Search title, description…"}
                className="ps-9"
              />
            </div>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isArabic ? "كل الوسوم" : "All tags"}</SelectItem>
                {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DataTable<DocumentRow, unknown>
            columns={columns}
            data={docs}
            storageKey={`dms-${projectId}`}
            searchable={false}
            pagination
            pageSize={25}
            emptyState={isLoading
              ? (isArabic ? "جارٍ التحميل…" : "Loading…")
              : (isArabic ? "لا توجد وثائق" : "No documents")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
