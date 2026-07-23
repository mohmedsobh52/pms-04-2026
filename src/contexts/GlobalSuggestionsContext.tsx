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

export interface SuggestionRule {
  id: string;
  /** Substring match against title (case-insensitive). Empty = any title. */
  titleContains?: string;
  category?: SuggestionCategory;
  severity?: SuggestionSeverity;
  screen?: string;
  action: "auto-dismiss" | "auto-pin";
  createdAt: string;
}

export interface SuggestionPreferences {
  mutedCategories: SuggestionCategory[];
  mutedSources: string[]; // sourceKey values
  mutedScreens: string[]; // sourceScreen values
  minSeverity: SuggestionSeverity; // filter out below this
  desktopToastForCritical: boolean;
  rules: SuggestionRule[];
}

const DEFAULT_PREFS: SuggestionPreferences = {
  mutedCategories: [],
  mutedSources: [],
  mutedScreens: [],
  minSeverity: "info",
  desktopToastForCritical: true,
  rules: [],
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
  addRule: (rule: Omit<SuggestionRule, "id" | "createdAt">) => void;
  removeRule: (id: string) => void;
  undoLast: () => boolean;
  canUndo: boolean;
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

  // Cross-tab broadcast via localStorage 'storage' event (see below)


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

  // Sync from other tabs when localStorage changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === STORAGE_KEY) {
          const next = JSON.parse(e.newValue) as GlobalSuggestion[];
          setSuggestions((prev) => {
            // Only accept if actually different to avoid render loops
            if (JSON.stringify(prev.map(({ onApply, ...r }) => r)) === e.newValue) return prev;
            return next;
          });
        } else if (e.key === PREFS_KEY) {
          setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(e.newValue) });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-wake snoozed items every 60s: clear snoozedUntil once expired so they
  // reappear in active lists without requiring a page reload.
  useEffect(() => {
    const tick = () => {
      setSuggestions((prev) => {
        const now = Date.now();
        let changed = false;
        const next = prev.map((s) => {
          if (s.snoozedUntil && new Date(s.snoozedUntil).getTime() <= now) {
            changed = true;
            return { ...s, snoozedUntil: null };
          }
          return s;
        });
        return changed ? next : prev;
      });
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<SuggestionPreferences>) => setPreferences((p) => ({ ...p, ...patch })),
    [],
  );
  const resetPreferences = useCallback(() => setPreferences(DEFAULT_PREFS), []);

  const addRule = useCallback((rule: Omit<SuggestionRule, "id" | "createdAt">) => {
    setPreferences((p) => ({
      ...p,
      rules: [
        { ...rule, id: makeId(), createdAt: new Date().toISOString() },
        ...(p.rules || []),
      ],
    }));
  }, []);

  const removeRule = useCallback((id: string) => {
    setPreferences((p) => ({ ...p, rules: (p.rules || []).filter((r) => r.id !== id) }));
  }, []);

  // Undo stack — keeps last 10 snapshots of suggestions for reversible actions.
  const [undoStack, setUndoStack] = useState<GlobalSuggestion[][]>([]);
  const pushUndo = useCallback(() => {
    setSuggestions((cur) => {
      setUndoStack((s) => [cur, ...s].slice(0, 10));
      return cur;
    });
  }, []);
  const undoLast = useCallback(() => {
    let didUndo = false;
    setUndoStack((s) => {
      if (s.length === 0) return s;
      const [snap, ...rest] = s;
      setSuggestions(snap);
      didUndo = true;
      return rest;
    });
    return didUndo;
  }, []);

  const applyRules = useCallback(
    (item: GlobalSuggestion, rules: SuggestionRule[]): GlobalSuggestion => {
      let out = item;
      for (const r of rules) {
        if (r.category && r.category !== item.category) continue;
        if (r.severity && r.severity !== item.severity) continue;
        if (r.screen && r.screen !== item.sourceScreen) continue;
        if (r.titleContains) {
          const needle = r.titleContains.trim().toLowerCase();
          if (needle && !item.title.toLowerCase().includes(needle)) continue;
        }
        if (r.action === "auto-dismiss") out = { ...out, dismissed: true };
        if (r.action === "auto-pin") out = { ...out, pinned: true };
      }
      return out;
    },
    [],
  );


  const addSuggestions: Ctx["addSuggestions"] = useCallback((list, sourceKey) => {
    setSuggestions((prev) => {
      const now = new Date().toISOString();
      const rules = preferences.rules || [];
      const enriched = list.map((s) => applyRules({
        ...s,
        id: makeId(),
        createdAt: now,
        meta: { ...(s.meta || {}), sourceKey },
      } as GlobalSuggestion, rules));
      const seen = new Set(prev.map((p) => `${p.category}::${p.title}::${p.meta?.sourceKey ?? ""}`));
      const fresh = enriched.filter(
        (e) => !seen.has(`${e.category}::${e.title}::${e.meta?.sourceKey ?? ""}`),
      );
      return [...fresh, ...prev].slice(0, 300);
    });
  }, [preferences.rules, applyRules]);

  const replaceBySource: Ctx["replaceBySource"] = useCallback((sourceKey, list) => {
    setSuggestions((prev) => {
      const now = new Date().toISOString();
      const rules = preferences.rules || [];
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
        const base: GlobalSuggestion = {
          ...s,
          id: makeId(),
          createdAt: now,
          meta: { ...(s.meta || {}), sourceKey },
          ...(prior || {}),
        } as GlobalSuggestion;
        // Only apply rules when there's no prior manual state to respect user overrides
        return prior ? base : applyRules(base, rules);
      });
      return [...enriched, ...kept].slice(0, 300);
    });
  }, [preferences.rules, applyRules]);

  const dismiss = useCallback((id: string) => {
    pushUndo();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, dismissed: true } : s)));
  }, [pushUndo]);

  const dismissMany = useCallback((ids: string[]) => {
    pushUndo();
    const set = new Set(ids);
    setSuggestions((prev) => prev.map((s) => (set.has(s.id) ? { ...s, dismissed: true } : s)));
  }, [pushUndo]);

  const snoozeMany = useCallback((ids: string[], hours: number) => {
    pushUndo();
    const set = new Set(ids);
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    setSuggestions((prev) => prev.map((s) => (set.has(s.id) ? { ...s, snoozedUntil: until } : s)));
  }, [pushUndo]);

  const markApplied = useCallback((id: string) => {
    pushUndo();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, applied: true } : s)));
  }, [pushUndo]);

  const snooze = useCallback((id: string, hours: number) => {
    pushUndo();
    const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, snoozedUntil: until } : s)));
  }, [pushUndo]);

  const togglePin = useCallback((id: string) => {
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, pinned: !s.pinned } : s)));
  }, []);

  const clearAll = useCallback(() => {
    pushUndo();
    setSuggestions([]);
  }, [pushUndo]);

  const clearBySource = useCallback((sourceKey: string) => {
    pushUndo();
    setSuggestions((prev) => prev.filter((s) => s.meta?.sourceKey !== sourceKey));
  }, [pushUndo]);

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
      addRule,
      removeRule,
      undoLast,
      canUndo: undoStack.length > 0,
    }),
    [suggestions, addSuggestions, replaceBySource, dismiss, dismissMany, snoozeMany, markApplied, snooze, togglePin, restore, restoreAll, clearAll, clearBySource, activeAfterPrefs, dismissedCount, preferences, updatePreferences, resetPreferences, addRule, removeRule, undoLast, undoStack.length],
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
