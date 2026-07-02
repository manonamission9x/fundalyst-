# Fundalyst — Code Style

For design tokens and visual rules, see `DESIGN.md`. For component conventions, see `FRONTEND.md`.

## Language

- **TypeScript strict** (`tsconfig.json` has `strict: true`).
- No `any` — use proper types or `unknown` + narrowing.
- No `// @ts-ignore` or `// @ts-expect-error` in production code.
- Prefer `interface` over `type` for object shapes; use `type` for unions, intersections, and aliases.

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` | `global-data-store.ts`, `financial-model-selectors.ts` |
| React components | PascalCase | `SpreadsheetInput`, `ModelBoundSpreadsheet` |
| Store selectors | camelCase | `datasetToGrid`, `extractDCFInputsFromModel` |
| Zustand stores | camelCase + `Store` | `useGlobalDataStore`, `useDCFStore` |
| Props interfaces | PascalCase + `Props` | `SpreadsheetInputProps`, `WorkspaceGridProps` |
| CSS classes | kebab-case | `workspace-grid`, `diff-table` |
| CSS custom properties | `--kebab-case` | `--text-sm`, `--border-light` |

## Imports

Order: external (`react`, `next`, `zustand`) → internal aliases (`@/lib/...`, `@/store/...`) → relative (`./`, `../`).

```typescript
import { useState, useCallback } from 'react';
import { useGlobalDataStore } from '@/store/global-data-store';
import type { FundalystDataset } from '@/lib/importer/types';
```

Use `type` imports for type-only imports: `import type { ... }`. Inline with values when convenient: `import { fn, type T } from ...`.

## React

- **`'use client'`** at the top of every component that uses hooks, browser APIs, or client-only features.
- **Hooks** at the top of the component, before any conditional returns.
- **useCallback/useMemo** only when the reference identity matters (dependency arrays of other hooks, memoised children). Don't wrap every function.
- **useRef** for values that must not trigger re-renders (clipboard refs, undo stacks).
- **No `contentEditable` in new components.** Use controlled inputs. The only remaining `contentEditable` is `SpreadsheetInput.tsx` (legacy, being replaced).

## Stores (Zustand)

- **Store creation:** `import { create } from 'zustand'` + `import { persist } from 'zustand/middleware'`.
- **Persistence:** `partialize` to choose which fields persist; `merge` for migration.
- **Selectors:** Subscribe to the smallest possible slice — `useStore((s) => s.specificField)` — not the whole store.
- **Actions:** Defined inline in the `create` callback. Prefer pure immutable updates over Immer.

## CSS

- **No hex, rgb(), px, or font-family values** in `app/**` or `components/**`. Use CSS custom properties from `globals.css`.
- **CSS custom properties** are defined under `:root` (dark default) with light-mode overrides in `@media (prefers-color-scheme: light)` and `[data-theme="light"]`.
- **Colour tokens** use semantic names (`--green`, `--red`, `--caution`, `--primary`).
- **Spacing** uses `--space-1` through `--space-12` (4px grid). No off-grid margins.
- **Typography** uses the scale: `--text-nano` through `--text-3xl`. No raw `font-size`.
- **Classes** follow a BEM-like convention: `.component-element-variant`.
- **States** use classes, not inline styles: `.cell.active`, `.row.selected`.
- **Avoid `var()` references to undefined tokens.** If you need a colour, add a token to `globals.css` first.

## Tests

- **Unit tests:** Vitest in `*.test.ts` / `*.test.tsx`. One file per module.
- **E2E tests:** Playwright in `tests/`. Name files by route: `homepage.spec.ts`, `workspace.spec.ts`.
- Run before PR **on a real local checkout** (not the agent sandbox — see `AI_EXECUTION_RULES.md`):
  ```bash
  npm.cmd install                 # if deps changed
  npm.cmd exec tsc -- --noEmit
  npm.cmd run lint
  npm.cmd run build
  npx playwright test -- <affected_routes>
  ```
- The agent sandbox can report **false** TypeScript syntax errors from NUL-corrupted file mounts. Treat repo contents (editor view) as the source of truth; **never rewrite working code to satisfy phantom sandbox errors.** Full rules: `AI_EXECUTION_RULES.md`.

## Commits

- Prefix with ticket number when applicable: `T13 — DCF scenario manager`.
- One logical change per commit. Don't mix refactors with features.
- Use `HANDoFF.md` for narrative state changes; `CODEX_TICKETS.md` for ticket status.

## Hard rules (don't violate)

1. **Use tokens, never raw hex/px/font literals in `app/**` or `components/**`.**
2. **Keep `src/lib/calculations.ts` pure.** No store access, no side effects.
3. **No fake enterprise/backend claims.** Never store credentials in frontend/localStorage.
4. **Don't blindly `npm audit fix --force`.** The `xlsx` advisory is known and accepted.
5. **Preserve Playwright route coverage.** Test affected routes when changing spreadsheet/backup behavior.
6. **Provenance stays visible and semantic-coloured.** Colour = meaning, never decoration.
7. **No network calls from core analysis code.** Privacy promise is non-negotiable.
8. **Verify on a real checkout; trust the repo over the sandbox.** The sandbox can report phantom syntax errors from corrupted mounts — never rewrite working code to satisfy them. See `AI_EXECUTION_RULES.md`.
