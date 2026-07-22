import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type SuggestionCategory = "ai-pricing" | "data-quality" | "workflow" | "reports";
export type SuggestionSeverity = "info" | "warning" | "critical" | "success";

export interface GlobalSuggestion {
  id: string;
  category: SuggestionCategory;
  severity: SuggestionSeverity;
  title: string;
  description?: string;
  sourceScreen?: string;
  sourceRoute?: string;
  createdAt: string;
  meta?: Record<string, any>;
  applyLabel?: string;
  onApply?: () => void | Promise<void>;
  dismissed?: boolean;
  applied?: boolean;
  snoozedUntil?: string | null;
  pinned?: boolean;
}

export interface SuggestionPreferences {
  mutedCategories: SuggestionCategory[];
  mutedSources: string[]; // sourceKey values
  mutedScreens: string[]; // sourceScreen values
  minSeverity: SuggestionSeverity; // filter out below this
  desktopToastForCritical: boolean;
}

const DEFAULT_PREFS: SuggestionPreferences = {
  mutedCategories: [],
  mutedSources: [],
  mutedScreens: [],
  minSeverity: "info",
  desktopToastForCritical: true,
};

interface Ctx {
  suggestions: GlobalSuggestion[];
  addSuggestions: (list: Omit<GlobalSuggestion, "id" | "createdAt">[], sourceKey?: string) => void;
  replaceBySource: (sourceKey: string, list: Omit<GlobalSuggestion, "id" | "createdAt">[]) => void;
  dismiss: (id: string) => void;
  dismissMany: (ids: string[]) => void;
  snoozeMany: (ids: string[], hours: number) => void;
  markApplied: (id: string) => void;
  snooze: (id: string, hours: number) => void;
  togglePin: (id: string) => void;
  restore: (id: string) => void;
  restoreAll: () => void;
  clearAll: () => void;
  clearBySource: (sourceKey: string) => void;
  unreadCount: number;
  criticalCount: number;
  dismissedCount: number;
  preferences: SuggestionPreferences;
  updatePreferences: (patch: Partial<SuggestionPreferences>) => void;
  resetPreferences: () => void;
}

const STORAGE_KEY = "global_suggestions_v1";
const PREFS_KEY = "global_suggestions_prefs_v1";

const GlobalSuggestionsCtx = createContext<Ctx | null>(null);

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSnoozed(s: GlobalSuggestion) {
  return !!(s.snoozedUntil && new Date(s.snoozedUntil).getTime() > Date.now());
}

export function GlobalSuggestionsProvider({ children }: { children: ReactNode }) {
  const [suggestions, setSuggestions] = useState<GlobalSuggestion[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as GlobalSuggestion[]) : [];
    } catch {
      return [];
    }
  });

  const [preferences, setPreferences] = useState<SuggestionPreferences>(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  useEffect(() => {
    try {
      const serializable = suggestions.map(({ onApply, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable.slice(0, 300)));
    } catch {
      /* quota */
    }
  }, [suggestions]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
    } catch {
      /* quota */
    }
  }, [preferences]);

  const updatePreferences = useCallback(
    (patch: Partial<SuggestionPreferences>) => setPreferences((p) => ({ ...p, ...patch })),
    [],
  );
  const resetPreferences = useCallback(() => setPreferences(DEFAULT_PREFS), []);


  const addSuggestions: Ctx["addSuggestions"] = useCallback((list, sourceKey) => {
    setSuggestions((prev) => {
      const now = new Date().toISOString();
      const enriched = list.map((s) => ({
        ...s,
        id: makeId(),
        createdAt: now,
        meta: { ...(s.meta || {}), sourceKey },
      }));
      const seen = new Set(prev.map((p) => `${p.category}::${p.title}::${p.meta?.sourceKey ?? ""}`));
      const fresh = enriched.filter(
        (e) => !seen.has(`${e.category}::${e.title}::${e.meta?.sourceKey ?? ""}`),
      );
      return [...fresh, ...prev].slice(0, 300);
    });
  }, []);

  const replaceBySource: Ctx["replaceBySource"] = useCallback((sourceKey, list) => {
    setSuggestions((prev) => {
      const now = new Date().toISOString();
      // Preserve dismissed/applied/snooze/pin state for items with same title+category
      const oldForSource = prev.filter((p) => p.meta?.sourceKey === sourceKey);
      const stateMap = new Map(
        oldForSource.map((p) => [`${p.category}::${p.title}`, {
          dismissed: p.dismissed,
          applied: p.applied,
          snoozedUntil: p.snoozedUntil,
          pinned: p.pinned,
        }]),
      );
      const kept = prev.filter((p) => p.meta?.sourceKey !== sourceKey);
      const enriched = list.map((s) => {
        const prior = stateMap.get(`${s.category}::${s.title}`);
        return {
          ...s,
          id: makeId(),
          createdAt: now,
          meta: { ...(s.meta || {}), sourceKey },
          ...(prior || {}),
        };
      });
      return [...enriched, ...kept].slice(0, 300);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)));
  }, []);

  const dismissMany = useCallback((ids: string[]) => {
    const set = new Set(ids);
    setSuggestions((prev) => prev.map((s) => (set.has(s.id) ? { ...s, dismissed: true } : s)));
  }, []);

  const snoozeMany = useCallback((ids: string[], hours: number) => {
    const set = new Set(ids);
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    setSuggestions((prev) => prev.map((s) => (set.has(s.id) ? { ...s, snoozedUntil: until } : s)));
  }, []);

  const markApplied = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, applied: true } : s)));
  }, []);

  const snooze = useCallback((id: string, hours: number) => {
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, snoozedUntil: until } : s)));
  }, []);

  const togglePin = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)));
  }, []);

  const clearAll = useCallback(() => setSuggestions([]), []);

  const clearBySource = useCallback((sourceKey: string) => {
    setSuggestions((prev) => prev.filter((s) => s.meta?.sourceKey !== sourceKey));
  }, []);

  const restore = useCallback((id: string) => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, dismissed: false, applied: false, snoozedUntil: null } : s)),
    );
  }, []);

  const restoreAll = useCallback(() => {
    setSuggestions((prev) => prev.map((s) => ({ ...s, dismissed: false, applied: false, snoozedUntil: null })));
  }, []);

  const activeAll = useMemo(
    () => suggestions.filter((s) => !s.dismissed && !s.applied && !isSnoozed(s)),
    [suggestions],
  );
  const unreadCount = activeAll.length;
  const criticalCount = useMemo(
    () => activeAll.filter((s) => s.severity === "critical").length,
    [activeAll],
  );
  const dismissedCount = useMemo(
    () => suggestions.filter((s) => s.dismissed || s.applied || isSnoozed(s)).length,
    [suggestions],
  );

  // Apply preferences to visible active suggestions
  const activeAfterPrefs = useMemo(() => {
    const sevRank = { critical: 0, warning: 1, info: 2, success: 3 } as const;
    const minRank = sevRank[preferences.minSeverity];
    return activeAll.filter((s) => {
      if (preferences.mutedCategories.includes(s.category)) return false;
      if (s.meta?.sourceKey && preferences.mutedSources.includes(String(s.meta.sourceKey))) return false;
      if (s.sourceScreen && preferences.mutedScreens.includes(s.sourceScreen)) return false;
      if (sevRank[s.severity] > minRank) return false;
      return true;
    });
  }, [activeAll, preferences]);

  const value = useMemo<Ctx>(
    () => ({
      suggestions,
      addSuggestions,
      replaceBySource,
      dismiss,
      dismissMany,
      snoozeMany,
      markApplied,
      snooze,
      togglePin,
      restore,
      restoreAll,
      clearAll,
      clearBySource,
      unreadCount: activeAfterPrefs.length,
      criticalCount: activeAfterPrefs.filter((s) => s.severity === "critical").length,
      dismissedCount,
      preferences,
      updatePreferences,
      resetPreferences,
    }),
    [suggestions, addSuggestions, replaceBySource, dismiss, dismissMany, snoozeMany, markApplied, snooze, togglePin, restore, restoreAll, clearAll, clearBySource, activeAfterPrefs, dismissedCount, preferences, updatePreferences, resetPreferences],
  );

  return <GlobalSuggestionsCtx.Provider value={value}>{children}</GlobalSuggestionsCtx.Provider>;
}


export function useGlobalSuggestions() {
  const ctx = useContext(GlobalSuggestionsCtx);
  if (!ctx) throw new Error("useGlobalSuggestions must be used inside GlobalSuggestionsProvider");
  return ctx;
}

export function isSuggestionSnoozed(s: GlobalSuggestion) {
  return isSnoozed(s);
}
