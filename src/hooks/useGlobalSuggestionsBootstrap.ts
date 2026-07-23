import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import {
  buildNotificationsSuggestions,
  buildAuditLogsSuggestions,
  buildBackupsSuggestions,
  buildIntegrationsSuggestions,
  buildTeamSuggestions,
} from "@/lib/suggestion-generators";

/**
 * Session-wide bootstrap: once per mount, pull light DB counts and push
 * cross-cutting suggestions (notifications, audit, backups, integrations, team)
 * into the global hub via `replaceBySource` so they stay in sync.
 */
export function useGlobalSuggestionsBootstrap() {
  const { replaceBySource } = useGlobalSuggestions();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const since14 = new Date(Date.now() - 14 * 86400_000).toISOString();
      const sb = supabase as any;

      const notif: any = await sb
        .from("notifications")
        .select("id, severity, created_at, read_at")
        .eq("recipient_id", user.id)
        .is("read_at", null)
        .limit(500);
      const audit: any = await sb
        .from("financial_audit_logs")
        .select("id, action, created_at")
        .eq("user_id", user.id)
        .gte("created_at", since14)
        .limit(500);
      const backups: any = await sb
        .from("saved_projects")
        .select("id, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);
      const integrations: any = await sb
        .from("historical_pricing_files")
        .select("id, status")
        .eq("user_id", user.id)
        .limit(100);
      const roles: any = await sb
        .from("user_roles")
        .select("user_id, role")
        .eq("user_id", user.id);

      if (cancelled) return;

      // Notifications
      const unread = notif.data ?? [];
      const criticalUnread = unread.filter(
        (n: any) => n.priority === "critical" || n.priority === "high",
      ).length;
      const oldestUnreadDays = unread.length
        ? Math.round(
            (Date.now() -
              Math.min(...unread.map((n: any) => new Date(n.created_at).getTime()))) /
              86400_000,
          )
        : 0;
      replaceBySource(
        "notifications",
        buildNotificationsSuggestions({
          unread: unread.length,
          criticalUnread,
          oldestUnreadDays,
        }),
      );

      // Audit logs
      const auditRows = audit.data ?? [];
      const failedActions = auditRows.filter((r: any) =>
        String(r.action || "").toLowerCase().includes("fail"),
      ).length;
      const privilegeChanges = auditRows.filter((r: any) =>
        /role|permission|grant/i.test(String(r.action || "")),
      ).length;
      replaceBySource(
        "audit-logs",
        buildAuditLogsSuggestions({
          entries: auditRows.length,
          failedActions,
          privilegeChanges,
        }),
      );

      // Backups proxy: last saved project update = last snapshot
      const projects = backups.data ?? [];
      const lastBackupDaysAgo = projects.length
        ? Math.round(
            (Date.now() - new Date(projects[0].updated_at as string).getTime()) /
              86400_000,
          )
        : null;
      replaceBySource(
        "backups",
        buildBackupsSuggestions({
          lastBackupDaysAgo,
          totalBackups: projects.length,
          autoBackup: false,
        }),
      );

      // Integrations proxy: historical pricing files as external data feeds
      const feeds = integrations.data ?? [];
      const failing = feeds.filter((f: any) => f.status === "failed").length;
      replaceBySource(
        "integrations",
        buildIntegrationsSuggestions({
          connected: feeds.length,
          failing,
          available: 6,
        }),
      );

      // Team
      const admins = (roles.data ?? []).filter((r: any) => r.role === "admin").length;
      replaceBySource(
        "team",
        buildTeamSuggestions({
          members: 1,
          admins,
        }),
      );
    })().catch(() => {
      /* silent — bootstrap is best-effort */
    });

    return () => {
      cancelled = true;
    };
  }, [replaceBySource]);
}
