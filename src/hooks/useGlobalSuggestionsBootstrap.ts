import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSuggestions } from "@/contexts/GlobalSuggestionsContext";
import {
  buildNotificationsSuggestions,
  buildAuditLogsSuggestions,
  buildBackupsSuggestions,
  buildIntegrationsSuggestions,
  buildTeamSuggestions,
  buildSecuritySuggestions,
  buildOnboardingSuggestions,
  buildPerformanceSuggestions,
  buildHelpSuggestions,
  buildAccessibilitySuggestions,
  buildComplianceSuggestions,
  buildAiUsageSuggestions,
  buildMobileExperienceSuggestions,
  buildNavigationSuggestions,
  buildModuleDiscoverySuggestions,
} from "@/lib/suggestion-generators";

/**
 * Session-wide bootstrap: once per mount, pull light DB counts and push
 * cross-cutting suggestions (notifications, audit, backups, integrations, team)
 * into the global hub via `replaceBySource` so they stay in sync.
 */
function recordVisitedRoute() {
  if (typeof window === "undefined") return;
  try {
    const key = "visited-routes";
    const list: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    const path = window.location.pathname;
    if (!list.includes(path)) {
      list.push(path);
      localStorage.setItem(key, JSON.stringify(list.slice(-100)));
    }
  } catch {
    /* ignore */
  }
}

export function useGlobalSuggestionsBootstrap() {
  const { replaceBySource } = useGlobalSuggestions();

  useEffect(() => {
    recordVisitedRoute();
    const onNav = () => recordVisitedRoute();
    window.addEventListener("popstate", onNav);
    const id = window.setInterval(recordVisitedRoute, 5000);
    return () => {
      window.removeEventListener("popstate", onNav);
      window.clearInterval(id);
    };
  }, []);

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
        (n: any) => n.severity === "critical" || n.severity === "warning",
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

      // Security posture (uses only non-sensitive signals)
      const hasMfa =
        typeof window !== "undefined" &&
        localStorage.getItem("mfa-enabled") === "true";
      replaceBySource(
        "security",
        buildSecuritySuggestions({ admins, mfaEnabled: hasMfa }),
      );

      // Onboarding checklist
      const hasCompanyLogo =
        typeof window !== "undefined" && !!localStorage.getItem("company-logo");
      const hasAiModel =
        typeof window !== "undefined" &&
        !!localStorage.getItem("selected-ai-model");
      const notificationsEnabled =
        typeof window !== "undefined" &&
        localStorage.getItem("notifications-enabled") !== "false";
      replaceBySource(
        "onboarding",
        buildOnboardingSuggestions({
          hasCompanyLogo,
          hasAiModel,
          hasProjects: (projects?.length ?? 0) > 0,
          hasNotifications: notificationsEnabled,
        }),
      );

      // Performance / data hygiene
      const staleDays = projects.length
        ? Math.round(
            (Date.now() -
              new Date(
                projects[projects.length - 1].updated_at as string,
              ).getTime()) /
              86400_000,
          )
        : null;
      replaceBySource(
        "performance",
        buildPerformanceSuggestions({
          projectsCount: projects.length,
          staleProjectsDays: staleDays,
        }),
      );

      // Help & shortcuts (static, always relevant)
      replaceBySource("help", buildHelpSuggestions());

      // Accessibility hints from browser/system prefs
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const highContrast =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-contrast: more)").matches;
      replaceBySource(
        "accessibility",
        buildAccessibilitySuggestions({
          prefersReducedMotion,
          highContrast,
          fontScale: 1,
        }),
      );

      // Compliance & data privacy
      const hasPrivacyPolicyAck =
        typeof window !== "undefined" &&
        localStorage.getItem("privacy-policy-ack") === "true";
      const hasDataRetentionPolicy =
        typeof window !== "undefined" &&
        !!localStorage.getItem("data-retention-days");
      const lastExportAt =
        typeof window !== "undefined"
          ? localStorage.getItem("last-full-export-at")
          : null;
      const exportedRecentlyDaysAgo = lastExportAt
        ? Math.round((Date.now() - new Date(lastExportAt).getTime()) / 86400_000)
        : null;
      replaceBySource(
        "compliance",
        buildComplianceSuggestions({
          hasPrivacyPolicyAck,
          hasDataRetentionPolicy,
          exportedRecentlyDaysAgo,
        }),
      );

      // AI usage hygiene
      const aiCallsLast7d = Number(
        (typeof window !== "undefined" &&
          localStorage.getItem("ai-calls-last-7d")) ||
          0,
      );
      const failedAiCalls = Number(
        (typeof window !== "undefined" &&
          localStorage.getItem("ai-failed-calls")) ||
          0,
      );
      const hasCustomModel =
        typeof window !== "undefined" &&
        !!localStorage.getItem("selected-ai-model");
      replaceBySource(
        "ai-usage",
        buildAiUsageSuggestions({
          aiCallsLast7d,
          failedAiCalls,
          hasCustomModel,
        }),
      );

      // Mobile experience
      const isMobile =
        typeof window !== "undefined" &&
        window.matchMedia?.("(max-width: 768px)").matches;
      const installedPwa =
        typeof window !== "undefined" &&
        window.matchMedia?.("(display-mode: standalone)").matches;
      replaceBySource(
        "mobile",
        buildMobileExperienceSuggestions({ isMobile, installedPwa }),
      );

      // Navigation discovery
      const hasUsedGlobalSearch =
        typeof window !== "undefined" &&
        localStorage.getItem("global-search-used") === "true";
      const hasPinnedProjects =
        typeof window !== "undefined" &&
        !!localStorage.getItem("pinned-projects");
      // Module discovery (routes never visited yet)
      let visitedRoutes: string[] = [];
      try {
        visitedRoutes = JSON.parse(
          localStorage.getItem("visited-routes") || "[]",
        );
      } catch {
        visitedRoutes = [];
      }
      replaceBySource(
        "modules",
        buildModuleDiscoverySuggestions({ visitedRoutes }),
      );

      replaceBySource(
        "navigation",
        buildNavigationSuggestions({
          hasUsedGlobalSearch,
          hasPinnedProjects,
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
