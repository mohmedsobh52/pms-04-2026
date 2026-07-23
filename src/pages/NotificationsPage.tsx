import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  ExternalLink,
  Search,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  severity: string;
  type: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

const SEV_ICON: Record<string, any> = {
  critical: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const SEV_STYLE: Record<string, string> = {
  critical: "text-destructive bg-destructive/10 border-destructive/40",
  warning: "text-amber-600 bg-amber-500/10 border-amber-500/40",
  info: "text-blue-600 bg-blue-500/10 border-blue-500/40",
  success: "text-emerald-600 bg-emerald-500/10 border-emerald-500/40",
};

const SEV_LABEL: Record<string, string> = {
  critical: "حرِج",
  warning: "تحذير",
  info: "معلومة",
  success: "نجاح",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("unread");
  const [sev, setSev] = useState<string>("all");
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error } = await (supabase as any)
      .from("notifications")
      .select("id, title, body, severity, type, link, created_at, read_at")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("تعذّر تحميل التنبيهات");
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (filter === "unread" && n.read_at) return false;
      if (filter === "read" && !n.read_at) return false;
      if (sev !== "all" && n.severity !== sev) return false;
      if (q && !`${n.title} ${n.body ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [items, filter, sev, q]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    setBusy(true);
    const { error } = await (supabase as any).rpc("mark_notifications_read", {
      _ids: ids,
    });
    setBusy(false);
    if (error) return toast.error("فشلت العملية");
    setItems((prev) =>
      prev.map((n) =>
        ids.includes(n.id) && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    );
  };

  const markAll = async () => {
    setBusy(true);
    const { error } = await (supabase as any).rpc("mark_all_notifications_read");
    setBusy(false);
    if (error) return toast.error("فشلت العملية");
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    toast.success("تم تعليم جميع التنبيهات كمقروءة");
  };

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">مركز التنبيهات</h1>
              <p className="text-xs text-muted-foreground">
                {unreadCount > 0
                  ? `${unreadCount} تنبيه غير مقروء`
                  : "لا توجد تنبيهات جديدة"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={load}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحديث"}
            </Button>
            <Button
              size="sm"
              onClick={markAll}
              disabled={busy || unreadCount === 0}
            >
              <CheckCheck className="w-4 h-4 ml-1" />
              تعليم الكل كمقروء
            </Button>
          </div>
        </div>

        <Card className="p-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث في العنوان والمحتوى…"
              className="h-8 text-xs pr-7"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unread">غير مقروء</SelectItem>
              <SelectItem value="read">مقروء</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الخطورات</SelectItem>
              <SelectItem value="critical">حرِج</SelectItem>
              <SelectItem value="warning">تحذير</SelectItem>
              <SelectItem value="info">معلومة</SelectItem>
              <SelectItem value="success">نجاح</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin ml-2" /> جارٍ التحميل…
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center">
            <Bell className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              لا توجد تنبيهات مطابقة للتصفية الحالية.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Icon = SEV_ICON[n.severity] ?? Info;
              const unread = !n.read_at;
              return (
                <Card
                  key={n.id}
                  className={`p-3 flex items-start gap-3 transition ${
                    unread ? "border-primary/40 bg-primary/[0.02]" : "opacity-80"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                      SEV_STYLE[n.severity] ?? SEV_STYLE.info
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{n.title}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {SEV_LABEL[n.severity] ?? n.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {n.type}
                      </Badge>
                      {unread && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {n.body}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                          onClick={() => unread && markRead([n.id])}
                        >
                          <ExternalLink className="w-3 h-3" />
                          فتح
                        </Link>
                      )}
                      {unread && (
                        <button
                          onClick={() => markRead([n.id])}
                          disabled={busy}
                          className="text-primary hover:underline"
                        >
                          تعليم كمقروء
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
