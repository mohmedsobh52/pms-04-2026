# Harden GlobalSearch Context & Add Safety Nets

## Current State
- `src/contexts/GlobalSearchContext.tsx` already returns a `noopGlobalSearch` fallback when used outside the provider, with a `console.warn`.
- `App.tsx` wraps routes inside `<GlobalSearchProvider>` and there is a top-level `<ErrorBoundary>`.
- No tests exist for `GlobalSearch`.

## Changes

### 1. Dev-only warning + breadcrumb logging — `src/contexts/GlobalSearchContext.tsx`
- Gate the existing `console.warn` inside `useGlobalSearch` behind `import.meta.env.DEV` (silent in production).
- Add a small in-memory breadcrumb buffer (max 20 entries) recording:
  - Provider mount/unmount (`GlobalSearchProvider mounted/unmounted`)
  - Each `useGlobalSearch` call site that hits the fallback (with stack trace tail)
- Expose `__getGlobalSearchBreadcrumbs()` on `window` in dev for debugging.
- Add a `useEffect` runtime check inside `GlobalSearchProviderInternal` that logs a single confirmation breadcrumb on mount.

### 2. Single source enforcement
- Confirm `src/hooks/useGlobalSearch.tsx` is a pure re-export of the context (already true).
- Add a top-of-file comment in `GlobalSearchContext.tsx` warning against duplicating the context.
- Add a module-level `globalThis.__GLOBAL_SEARCH_CONTEXT_INSTANCES__` counter — if it ever exceeds 1, log an error in dev. This catches duplicate context instances caused by case-insensitive imports or path drift.

### 3. Page-level error boundary for GlobalSearch
- `GlobalSearch` is rendered once in `App.tsx`. Wrap it in its own `<ErrorBoundary>` with a minimal `fallback={null}` so any future hook throw inside the search palette never blanks the whole app:
  ```tsx
  <ErrorBoundary fallback={null}>
    <GlobalSearch />
  </ErrorBoundary>
  ```
- Same treatment for `<CommandPalette />`.

### 4. Tests — `src/components/GlobalSearch.test.tsx`
Set up vitest + React Testing Library if not configured (per the testing-setup guide):
- Add devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Add `vitest.config.ts` and `src/test/setup.ts`.

Test cases:
1. **With provider**: render `<MemoryRouter><GlobalSearchProvider><GlobalSearch /></GlobalSearchProvider></MemoryRouter>` — expect no throw, command dialog mounts.
2. **Without provider**: render `<MemoryRouter><GlobalSearch /></MemoryRouter>` — expect no throw, fallback no-op state used, dialog renders closed.
3. **Hook fallback**: render a tiny consumer calling `useGlobalSearch()` outside provider — expect it to return the noop object (not throw).

## Files Touched
- edit `src/contexts/GlobalSearchContext.tsx`
- edit `src/App.tsx` (wrap GlobalSearch + CommandPalette in ErrorBoundary)
- create `src/components/GlobalSearch.test.tsx`
- create `vitest.config.ts`, `src/test/setup.ts` (if missing)
- update `package.json` devDependencies + `tsconfig.app.json` types

## Out of Scope
- Refactoring search content/data sources.
- Changing the public API of `useGlobalSearch`.
