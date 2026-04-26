import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GlobalSearch } from "./GlobalSearch";
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/contexts/GlobalSearchContext";

// Minimal mocks for hooks used inside the provider
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/hooks/useLanguage", () => ({
  useLanguage: () => ({ isArabic: false, language: "en" }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  },
}));

describe("GlobalSearch resilience", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("renders without crashing when wrapped in GlobalSearchProvider", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <GlobalSearchProvider>
            <GlobalSearch />
          </GlobalSearchProvider>
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it("renders without crashing even WITHOUT GlobalSearchProvider (degrades safely)", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <GlobalSearch />
        </MemoryRouter>
      )
    ).not.toThrow();
  });

  it("useGlobalSearch returns a no-op fallback outside the provider instead of throwing", () => {
    const { result } = renderHook(() => useGlobalSearch());
    expect(result.current).toBeDefined();
    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.setIsOpen).toBe("function");
    expect(result.current.results).toEqual({
      pages: [],
      projects: [],
      actions: [],
      settings: [],
    });
    // Calling no-ops must not throw
    expect(() => result.current.setIsOpen(true)).not.toThrow();
    expect(() => result.current.setQuery("x")).not.toThrow();
  });
});
