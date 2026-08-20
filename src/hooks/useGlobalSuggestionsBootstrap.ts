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
  buildUiConsistencySuggestions,
  buildRuntimePerfSuggestions,
  buildCrossModuleSuggestions,
  buildWorkflowGapSuggestions,
  buildBudgetControlSuggestions,
  buildSupplierBaseSuggestions,
  buildPricingCoverageSuggestions,
  buildQuantityTakeoffSuggestions,
  buildWarrantyMaintenanceSuggestions,
  buildCostCodingSuggestions,
  buildSubcontractorSuggestions,
  buildTenderPipelineSuggestions,
  buildBillingCashflowSuggestions,
  buildVariationsMilestonesSuggestions,
  buildRatesLibrarySuggestions,
  buildResourcePlanningSuggestions,
  buildPartnerNetworkSuggestions,
  buildReportAutomationSuggestions,
  buildNotificationsHygieneSuggestions,
  buildPortfolioHealthSuggestions,
  buildDocumentsHygieneSuggestions,
  buildWorkflowAutomationSuggestions,
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
        .select("id, is_verified")
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
      const failing = feeds.filter((f: any) => f.is_verified === false).length;
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

      // UI consistency (tables / theme / width)
      replaceBySource(
        "ui",
        buildUiConsistencySuggestions({
          tableDensity:
            typeof window !== "undefined"
              ? localStorage.getItem("table-density")
              : null,
          prefersDark:
            typeof window !== "undefined" &&
            !!window.matchMedia?.("(prefers-color-scheme: dark)").matches,
          themeSet:
            typeof window !== "undefined" && !!localStorage.getItem("theme"),
          viewportWidth:
            typeof window !== "undefined" ? window.innerWidth : undefined,
        }),
      );

      // Runtime performance signals
      let loadTimeMs: number | undefined;
      try {
        const nav = performance.getEntriesByType("navigation")[0] as
          | PerformanceNavigationTiming
          | undefined;
        if (nav) loadTimeMs = nav.duration;
      } catch {
        /* ignore */
      }
      let storageBytes = 0;
      try {
        for (const k of Object.keys(localStorage)) {
          storageBytes += (localStorage.getItem(k) || "").length * 2;
        }
      } catch {
        /* ignore */
      }
      replaceBySource(
        "runtime-perf",
        buildRuntimePerfSuggestions({ loadTimeMs, storageBytes }),
      );

      // Cross-module data links
      try {
        const { data: projects } = await supabase
          .from("saved_projects")
          .select("id")
          .limit(500);
        const projectIds = ((projects ?? []) as any[]).map((p) => p.id as string);
        if (projectIds.length) {
          const { data: boq } = await supabase
            .from("project_items")
            .select("project_id, category")
            .in("project_id", projectIds)
            .limit(5000);
          const withBoq = new Set((boq ?? []).map((b: any) => b.project_id));
          const itemsWithoutCategory = (boq ?? []).filter(
            (b: any) => !b.category,
          ).length;
          if (!cancelled) {
            replaceBySource(
              "cross-module",
              buildCrossModuleSuggestions({
                projectsWithoutBoq: projectIds.filter((id) => !withBoq.has(id))
                  .length,
                itemsWithoutCategory,
              }),
            );
          }
        }
      } catch {
        /* silent */
      }
      // Workflow gaps across modules
      try {
        const [contractsRes, paymentsRes, certsRes, quotesRes, approvalsRes, risksRes] =
          await Promise.all([
            supabase.from("contracts").select("id, project_id").limit(500),
            supabase.from("contract_payments").select("contract_id").limit(2000),
            supabase.from("progress_certificates").select("project_id").limit(2000),
            supabase.from("price_quotations").select("id, status").limit(1000),
            supabase.from("workflow_instances").select("id, status").limit(500),
            supabase.from("risks").select("id, mitigation_strategy, risk_score").limit(1000),
          ]);
        const contracts = (contractsRes.data ?? []) as any[];
        const paidIds = new Set(((paymentsRes.data ?? []) as any[]).map((p) => p.contract_id));
        const certProjects = new Set(((certsRes.data ?? []) as any[]).map((c) => c.project_id));
        const contractProjects = new Set(contracts.map((c) => c.project_id).filter(Boolean));
        const pendingQuotations = ((quotesRes.data ?? []) as any[]).filter((q) =>
          ["pending", "draft", "submitted"].includes(String(q.status || "").toLowerCase()),
        ).length;
        const openApprovals = ((approvalsRes.data ?? []) as any[]).filter((a) =>
          ["pending", "in_progress"].includes(String(a.status || "").toLowerCase()),
        ).length;
        const risksWithoutMitigation = ((risksRes.data ?? []) as any[]).filter(
          (r) => !r.mitigation_strategy,
        ).length;
        if (!cancelled) {
          replaceBySource(
            "workflow-gaps",
            buildWorkflowGapSuggestions({
              contracts: contracts.length,
              contractsWithoutPayments: contracts.filter((c) => !paidIds.has(c.id)).length,
              projectsWithoutCertificates: [...contractProjects].filter(
                (id) => !certProjects.has(id),
              ).length,
              pendingQuotations,
              openApprovals,
              risksWithoutMitigation,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Budget control readiness (baselines / thresholds)
      try {
        const [projRes, baseRes, thrRes] = await Promise.all([
          supabase.from("saved_projects").select("id").limit(500),
          supabase
            .from("cost_control_baselines")
            .select("project_id, is_active")
            .limit(1000),
          supabase.from("cost_control_thresholds").select("project_id").limit(1000),
        ]);
        const projectIds = ((projRes.data ?? []) as any[]).map((p) => p.id);
        const baselines = (baseRes.data ?? []) as any[];
        const withBaseline = new Set(baselines.map((b) => b.project_id));
        const withThresholds = new Set(
          ((thrRes.data ?? []) as any[]).map((t) => t.project_id),
        );
        if (!cancelled && projectIds.length) {
          replaceBySource(
            "budget-control",
            buildBudgetControlSuggestions({
              projects: projectIds.length,
              projectsWithBaseline: projectIds.filter((id) => withBaseline.has(id))
                .length,
              projectsWithThresholds: projectIds.filter((id) =>
                withThresholds.has(id),
              ).length,
              activeBaselines: baselines.filter((b) => b.is_active).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Supplier base quality
      try {
        const [supRes, procRes] = await Promise.all([
          supabase
            .from("suppliers")
            .select("id, phone, email, rating, is_verified")
            .limit(1000),
          supabase
            .from("procurement_items")
            .select("id, suggested_suppliers")
            .limit(2000),
        ]);
        const suppliers = (supRes.data ?? []) as any[];
        const procItems = (procRes.data ?? []) as any[];
        if (!cancelled) {
          replaceBySource(
            "supplier-base",
            buildSupplierBaseSuggestions({
              suppliers: suppliers.length,
              verifiedSuppliers: suppliers.filter((s) => s.is_verified).length,
              suppliersMissingContact: suppliers.filter(
                (s) => !s.phone && !s.email,
              ).length,
              unratedSuppliers: suppliers.filter((s) => !s.rating).length,
              procurementItemsWithoutSupplier: procItems.filter((p) => {
                const s = p.suggested_suppliers;
                return !s || (Array.isArray(s) && s.length === 0);
              }).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Pricing accuracy coverage
      try {
        const [itemsRes, refRes, quotesRes2, matRes] = await Promise.all([
          supabase
            .from("project_items")
            .select("id, unit_price, quantity, unit, description")
            .limit(5000),
          supabase.from("reference_prices").select("item_name").limit(2000),
          supabase.from("price_quotations").select("id").limit(1000),
          supabase
            .from("material_prices")
            .select("updated_at")
            .order("updated_at", { ascending: false })
            .limit(1),
        ]);
        const items = (itemsRes.data ?? []) as any[];
        const refNames = new Set(
          ((refRes.data ?? []) as any[]).map((r) =>
            String(r.item_name || "").trim().toLowerCase(),
          ),
        );
        const withRef = items.filter((i) =>
          refNames.has(String(i.description || "").trim().toLowerCase()),
        ).length;
        const lastMat = ((matRes.data ?? []) as any[])[0]?.updated_at;
        if (!cancelled && items.length) {
          replaceBySource(
            "pricing-accuracy",
            buildPricingCoverageSuggestions({
              items: items.length,
              itemsWithoutUnitPrice: items.filter((i) => !i.unit_price).length,
              itemsWithoutQuantity: items.filter((i) => !i.quantity).length,
              itemsWithReferencePrice: withRef,
              quotationsCoverage: items.length
                ? Math.min(1, ((quotesRes2.data ?? []).length * 10) / items.length)
                : 0,
              lastPriceUpdateDaysAgo: lastMat
                ? Math.round((Date.now() - new Date(lastMat).getTime()) / 86400_000)
                : null,
            }),
          );
          replaceBySource(
            "quantity-takeoff",
            buildQuantityTakeoffSuggestions({
              attachments: 0,
              drawingAttachments: 0,
              drawingsAnalyzed: 0,
              itemsWithoutUnit: items.filter((i) => !i.unit).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Drawings / takeoff readiness
      try {
        const { data: atts } = await supabase
          .from("project_attachments")
          .select("id, file_type, category, is_analyzed")
          .limit(2000);
        const rows = (atts ?? []) as any[];
        const isDrawing = (a: any) =>
          /drawing|مخطط/i.test(String(a.category || "")) ||
          /pdf|image|dwg/i.test(String(a.file_type || ""));
        const drawings = rows.filter(isDrawing);
        if (!cancelled && rows.length) {
          replaceBySource(
            "quantity-takeoff",
            buildQuantityTakeoffSuggestions({
              attachments: rows.length,
              drawingAttachments: drawings.length,
              drawingsAnalyzed: drawings.filter((d) => d.is_analyzed).length,
              itemsWithoutUnit: 0,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Warranties & maintenance readiness
      try {
        const [warRes, maintRes, contrRes] = await Promise.all([
          supabase.from("contract_warranties").select("id, end_date").limit(1000),
          supabase.from("maintenance_schedules").select("id, next_due_date, status").limit(1000),
          supabase.from("contracts").select("id").limit(1000),
        ]);
        const now = Date.now();
        const warranties = (warRes.data ?? []) as any[];
        const maint = (maintRes.data ?? []) as any[];
        const end = (w: any) => (w.end_date ? new Date(w.end_date).getTime() : null);
        if (!cancelled) {
          replaceBySource(
            "warranties",
            buildWarrantyMaintenanceSuggestions({
              warranties: warranties.length,
              expiredWarranties: warranties.filter((w) => {
                const t = end(w);
                return t !== null && t < now;
              }).length,
              expiringWarranties90d: warranties.filter((w) => {
                const t = end(w);
                return t !== null && t >= now && t <= now + 90 * 86400_000;
              }).length,
              contracts: (contrRes.data ?? []).length,
              maintenanceSchedules: maint.length,
              overdueMaintenance: maint.filter(
                (m) =>
                  m.next_due_date &&
                  new Date(m.next_due_date).getTime() < now &&
                  String(m.status || "").toLowerCase() !== "completed",
              ).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // BOQ coding / WBS coverage
      try {
        const [itemsRes2, codesRes] = await Promise.all([
          supabase.from("project_items").select("item_number, category").limit(5000),
          supabase.from("cost_codes").select("id, code").limit(2000),
        ]);
        const items2 = (itemsRes2.data ?? []) as any[];
        const numbers = items2
          .map((i) => String(i.item_number || "").trim())
          .filter(Boolean);
        const seen = new Set<string>();
        let duplicates = 0;
        for (const n of numbers) {
          if (seen.has(n)) duplicates++;
          else seen.add(n);
        }
        if (!cancelled && items2.length) {
          replaceBySource(
            "cost-coding",
            buildCostCodingSuggestions({
              items: items2.length,
              itemsWithoutCode: items2.length - numbers.length,
              costCodes: (codesRes.data ?? []).length,
              duplicateCodes: duplicates,
              categories: new Set(
                items2.map((i) => i.category).filter(Boolean),
              ).size,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Subcontractors & assignments
      try {
        const [subsRes, asgRes] = await Promise.all([
          supabase.from("subcontractors").select("id, phone, email").limit(1000),
          supabase
            .from("subcontractor_assignments")
            .select("id, status, start_date, end_date")
            .limit(2000),
        ]);
        const subs = (subsRes.data ?? []) as any[];
        const asg = (asgRes.data ?? []) as any[];
        if (!cancelled) {
          replaceBySource(
            "subcontractors",
            buildSubcontractorSuggestions({
              subcontractors: subs.length,
              assignments: asg.length,
              activeAssignments: asg.filter(
                (a) => String(a.status || "").toLowerCase() === "active",
              ).length,
              assignmentsWithoutDates: asg.filter(
                (a) => !a.start_date || !a.end_date,
              ).length,
              subcontractorsWithoutContact: subs.filter(
                (s) => !s.phone && !s.email,
              ).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Tender / proposals pipeline
      try {
        const [propRes, offersRes, tenderRes, quotesRes3] = await Promise.all([
          supabase.from("technical_proposals").select("id, status").limit(1000),
          supabase.from("offer_requests").select("id, status").limit(1000),
          supabase.from("tender_pricing").select("id").limit(1000),
          supabase.from("price_quotations").select("id").limit(1000),
        ]);
        const proposals = (propRes.data ?? []) as any[];
        const offers = (offersRes.data ?? []) as any[];
        if (!cancelled) {
          replaceBySource(
            "tender-pipeline",
            buildTenderPipelineSuggestions({
              proposals: proposals.length,
              draftProposals: proposals.filter((p) =>
                ["draft", "مسودة"].includes(String(p.status || "").toLowerCase()),
              ).length,
              offerRequests: offers.length,
              openOfferRequests: offers.filter((o) =>
                ["open", "pending", "sent"].includes(
                  String(o.status || "").toLowerCase(),
                ),
              ).length,
              tenderPricingRows: (tenderRes.data ?? []).length,
              quotations: (quotesRes3.data ?? []).length,
            }),
          );
        }
      } catch {
        /* silent */
      }



      // Billing & cash flow (certificates + payments)
      try {
        const [certRes, payRes] = await Promise.all([
          supabase
            .from("progress_certificates")
            .select("id, approval_status, contract_id")
            .limit(2000),
          supabase
            .from("contract_payments")
            .select("id, status, due_date, payment_date, invoice_number")
            .limit(2000),
        ]);
        const certs = (certRes.data ?? []) as any[];
        const pays = (payRes.data ?? []) as any[];
        const now = Date.now();
        const isPaid = (p: any) =>
          !!p.payment_date || ["paid", "مدفوع"].includes(String(p.status || "").toLowerCase());
        if (!cancelled) {
          replaceBySource(
            "billing-cashflow",
            buildBillingCashflowSuggestions({
              certificates: certs.length,
              pendingCertificates: certs.filter((c) =>
                ["pending", "draft", "submitted", "معلق", "مسودة"].includes(
                  String(c.approval_status || "").toLowerCase(),
                ),
              ).length,
              certificatesWithoutContract: certs.filter((c) => !c.contract_id).length,
              payments: pays.length,
              overduePayments: pays.filter(
                (p) => !isPaid(p) && p.due_date && new Date(p.due_date).getTime() < now,
              ).length,
              unpaidDue30d: pays.filter((p) => {
                if (isPaid(p) || !p.due_date) return false;
                const t = new Date(p.due_date).getTime();
                return t >= now && t <= now + 30 * 86400_000;
              }).length,
              paymentsWithoutInvoice: pays.filter((p) => !p.invoice_number).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Variations & milestones
      try {
        const [varRes, msRes] = await Promise.all([
          supabase.from("contract_variations").select("id, status, amount").limit(2000),
          supabase
            .from("contract_milestones")
            .select("id, status, due_date, completion_date, payment_amount, payment_percentage")
            .limit(2000),
        ]);
        const vars = (varRes.data ?? []) as any[];
        const ms = (msRes.data ?? []) as any[];
        const now2 = Date.now();
        if (!cancelled) {
          replaceBySource(
            "variations-milestones",
            buildVariationsMilestonesSuggestions({
              variations: vars.length,
              pendingVariations: vars.filter((v) =>
                ["pending", "draft", "submitted", "معلق"].includes(
                  String(v.status || "").toLowerCase(),
                ),
              ).length,
              variationsAmount: vars.reduce((s, v) => s + (Number(v.amount) || 0), 0),
              milestones: ms.length,
              overdueMilestones: ms.filter(
                (m) =>
                  !m.completion_date &&
                  String(m.status || "").toLowerCase() !== "completed" &&
                  m.due_date &&
                  new Date(m.due_date).getTime() < now2,
              ).length,
              milestonesWithoutAmount: ms.filter(
                (m) => !m.payment_amount && !m.payment_percentage,
              ).length,
            }),
          );
        }
      } catch {
        /* silent */
      }



      // Rates library health
      try {
        const [laborRes, eqRes] = await Promise.all([
          supabase.from("labor_rates").select("id, category, valid_until, price_date, updated_at").limit(2000),
          supabase.from("equipment_rates").select("id, category, valid_until, price_date, updated_at").limit(2000),
        ]);
        const labor = (laborRes.data ?? []) as any[];
        const eq = (eqRes.data ?? []) as any[];
        const now = Date.now();
        const expired = (r: any) => !!r.valid_until && new Date(r.valid_until).getTime() < now;
        const stale = (r: any) => {
          const d = r.price_date || r.updated_at;
          return !!d && now - new Date(d).getTime() > 180 * 86400_000;
        };
        if (!cancelled) {
          replaceBySource(
            "rates-library",
            buildRatesLibrarySuggestions({
              laborRates: labor.length,
              equipmentRates: eq.length,
              expiredLaborRates: labor.filter(expired).length,
              expiredEquipmentRates: eq.filter(expired).length,
              staleRates180d: [...labor, ...eq].filter(stale).length,
              ratesWithoutCategory: [...labor, ...eq].filter((r) => !r.category).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Resource planning & progress tracking
      try {
        const [resRes, progRes] = await Promise.all([
          supabase
            .from("resource_items")
            .select("id, start_date, end_date, utilization_percent")
            .limit(2000),
          supabase
            .from("project_progress_history")
            .select("id, record_date, spi, cpi")
            .order("record_date", { ascending: false })
            .limit(500),
        ]);
        const resources = (resRes.data ?? []) as any[];
        const prog = (progRes.data ?? []) as any[];
        const last = prog[0]?.record_date ? new Date(prog[0].record_date).getTime() : null;
        if (!cancelled) {
          replaceBySource(
            "resource-planning",
            buildResourcePlanningSuggestions({
              resources: resources.length,
              resourcesWithoutDates: resources.filter((r) => !r.start_date || !r.end_date).length,
              overAllocated: resources.filter((r) => Number(r.utilization_percent) > 100).length,
              underUtilized: resources.filter(
                (r) => r.utilization_percent != null && Number(r.utilization_percent) < 40,
              ).length,
              progressRecords: prog.length,
              lastRecordDays:
                last === null ? null : Math.floor((Date.now() - last) / 86400_000),
              lowSpi: prog.filter((p) => p.spi != null && Number(p.spi) < 0.9).length,
              lowCpi: prog.filter((p) => p.cpi != null && Number(p.cpi) < 0.9).length,
            }),
          );
        }
      } catch {
        /* silent */
      }


      // Partner network health
      try {
        const [partRes, perfRes, revRes] = await Promise.all([
          supabase
            .from("external_partners")
            .select("id, email, phone, contact_person, status, rating, contract_end_date")
            .limit(2000),
          supabase
            .from("partner_performance")
            .select("id, quality_score, delivery_time_score, budget_compliance_score, communication_score")
            .limit(2000),
          supabase.from("partner_reviews").select("id").limit(500),
        ]);
        const partners = (partRes.data ?? []) as any[];
        const perf = (perfRes.data ?? []) as any[];
        const reviews = (revRes.data ?? []) as any[];
        const nowP = Date.now();
        const avgPerf = (r: any) => {
          const vals = [r.quality_score, r.delivery_time_score, r.budget_compliance_score, r.communication_score]
            .map(Number)
            .filter((n) => !Number.isNaN(n) && n > 0);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        if (!cancelled) {
          replaceBySource(
            "partner-network",
            buildPartnerNetworkSuggestions({
              partners: partners.length,
              partnersWithoutContact: partners.filter((p) => !p.email && !p.phone && !p.contact_person).length,
              inactivePartners: partners.filter((p) =>
                ["inactive", "archived", "غير نشط"].includes(String(p.status || "").toLowerCase()),
              ).length,
              expiredPartnerContracts: partners.filter(
                (p) => p.contract_end_date && new Date(p.contract_end_date).getTime() < nowP,
              ).length,
              partnersWithoutRating: partners.filter((p) => p.rating == null || Number(p.rating) === 0).length,
              lowRatedPartners: partners.filter((p) => p.rating != null && Number(p.rating) > 0 && Number(p.rating) < 3).length,
              performanceRecords: perf.length,
              lowPerformance: perf.filter((r) => {
                const a = avgPerf(r);
                return a !== null && a < 60;
              }).length,
              reviews: reviews.length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Reporting automation & sharing
      try {
        const [schedRes, cmpRes, shareRes] = await Promise.all([
          supabase
            .from("scheduled_reports")
            .select("id, is_active, recipient_emails, last_sent_at, next_scheduled_at")
            .limit(1000),
          supabase.from("comparison_reports").select("id").limit(500),
          supabase.from("shared_analyses").select("id, is_active, expires_at, created_at").limit(1000),
        ]);
        const scheds = (schedRes.data ?? []) as any[];
        const cmps = (cmpRes.data ?? []) as any[];
        const shares = (shareRes.data ?? []) as any[];
        const nowR = Date.now();
        if (!cancelled) {
          replaceBySource(
            "report-automation",
            buildReportAutomationSuggestions({
              scheduledReports: scheds.length,
              inactiveSchedules: scheds.filter((r) => r.is_active === false).length,
              schedulesWithoutRecipients: scheds.filter(
                (r) => !r.recipient_emails || r.recipient_emails.length === 0,
              ).length,
              overdueSchedules: scheds.filter(
                (r) =>
                  r.is_active !== false &&
                  r.next_scheduled_at &&
                  new Date(r.next_scheduled_at).getTime() < nowR,
              ).length,
              neverSentSchedules: scheds.filter((r) => r.is_active !== false && !r.last_sent_at).length,
              comparisonReports: cmps.length,
              sharedLinks: shares.length,
              expiredShares: shares.filter(
                (s) => s.expires_at && new Date(s.expires_at).getTime() < nowR,
              ).length,
              staleActiveShares: shares.filter(
                (s) =>
                  s.is_active !== false &&
                  s.created_at &&
                  nowR - new Date(s.created_at).getTime() > 90 * 86400_000,
              ).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Notifications hygiene
      try {
        const { data } = await supabase
          .from("notifications")
          .select("id, severity, read_at, created_at, link, dedup_key")
          .limit(1000);
        const notes = (data ?? []) as any[];
        const nowN = Date.now();
        const keys = notes.map((n) => n.dedup_key).filter(Boolean) as string[];
        const dupes = keys.length - new Set(keys).size;
        if (!cancelled) {
          replaceBySource(
            "notifications-hygiene",
            buildNotificationsHygieneSuggestions({
              total: notes.length,
              unread: notes.filter((n) => !n.read_at).length,
              unreadCritical: notes.filter(
                (n) => !n.read_at && ["critical", "high", "error"].includes(String(n.severity || "").toLowerCase()),
              ).length,
              staleUnread: notes.filter(
                (n) => !n.read_at && n.created_at && nowN - new Date(n.created_at).getTime() > 14 * 86400_000,
              ).length,
              withoutLink: notes.filter((n) => !n.link).length,
              duplicates: Math.max(0, dupes),
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Portfolio health
      try {
        const { data } = await supabase
          .from("saved_projects")
          .select("id, name, status, analysis_data, wbs_data, updated_at")
          .limit(500);
        const projects = (data ?? []) as any[];
        const nowPr = Date.now();
        const names = projects.map((p) => String(p.name || "").trim().toLowerCase()).filter(Boolean);
        const dupNames = names.length - new Set(names).size;
        if (!cancelled) {
          replaceBySource(
            "portfolio-health",
            buildPortfolioHealthSuggestions({
              projects: projects.length,
              withoutAnalysis: projects.filter((p) => !p.analysis_data).length,
              withoutWbs: projects.filter((p) => !p.wbs_data).length,
              draftProjects: projects.filter((p) =>
                ["draft", "مسودة"].includes(String(p.status || "").toLowerCase()),
              ).length,
              staleProjects: projects.filter(
                (p) => p.updated_at && nowPr - new Date(p.updated_at).getTime() > 90 * 86400_000,
              ).length,
              duplicateNames: Math.max(0, dupNames),
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Documents & attachments hygiene
      try {
        const { data } = await supabase
          .from("project_attachments")
          .select("id, category, tags, is_analyzed, expiry_date, project_id, file_size, is_latest")
          .eq("is_latest", true)
          .limit(1000);
        const docs = (data ?? []) as any[];
        const nowD = Date.now();
        if (!cancelled && docs.length > 0) {
          replaceBySource(
            "documents-hygiene",
            buildDocumentsHygieneSuggestions({
              total: docs.length,
              withoutCategory: docs.filter((d) => !d.category).length,
              withoutTags: docs.filter((d) => !d.tags || d.tags.length === 0).length,
              notAnalyzed: docs.filter((d) => !d.is_analyzed).length,
              expired: docs.filter(
                (d) => d.expiry_date && new Date(d.expiry_date).getTime() < nowD,
              ).length,
              expiringSoon: docs.filter((d) => {
                if (!d.expiry_date) return false;
                const t = new Date(d.expiry_date).getTime();
                return t >= nowD && t - nowD <= 30 * 86400_000;
              }).length,
              orphaned: docs.filter((d) => !d.project_id).length,
              oversized: docs.filter((d) => Number(d.file_size || 0) > 20 * 1024 * 1024).length,
            }),
          );
        }
      } catch {
        /* silent */
      }

      // Workflow automation health
      try {
        const [defsRes, instRes] = await Promise.all([
          supabase.from("workflow_definitions").select("id, is_active").limit(200),
          supabase
            .from("workflow_instances")
            .select("id, status, due_at, updated_at")
            .limit(500),
        ]);
        const defs = (defsRes.data ?? []) as any[];
        const insts = (instRes.data ?? []) as any[];
        const nowW = Date.now();
        const running = insts.filter((i) => String(i.status) === "running");
        if (!cancelled) {
          replaceBySource(
            "workflow-automation",
            buildWorkflowAutomationSuggestions({
              definitions: defs.length,
              inactiveDefinitions: defs.filter((d) => d.is_active === false).length,
              runningInstances: running.length,
              overdueInstances: running.filter(
                (i) => i.due_at && new Date(i.due_at).getTime() < nowW,
              ).length,
              stalledInstances: running.filter(
                (i) => i.updated_at && nowW - new Date(i.updated_at).getTime() > 7 * 86400_000,
              ).length,
              rejectedInstances: insts.filter((i) => String(i.status) === "rejected").length,
            }),
          );
        }
      } catch {
        /* silent */
      }

    })().catch(() => {
      /* silent — bootstrap is best-effort */
    });

    return () => {
      cancelled = true;
    };
  }, [replaceBySource]);
}
