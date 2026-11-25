# Favoritar Contas e Cartões Validation

## Validation: favorito-conta-cartao - PASS

**Date**: 2026-11-24
**Spec**: `.specs/features/favorito-conta-cartao/spec.md`
**Diff range**: `3c793e9..HEAD` (surface cross-checked via `tasks.md`, `design.md`, and codebase grep; `git diff`/`git status` could not execute because `.git` points outside sandbox isolation and the unsandboxed permission prompt timed out after 60s)
**Verifier**: independent sub-agent (author != verifier)

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Models `UserFavoriteAccount` (`backend/prisma/schema.prisma:456-467`) and `UserFavoriteCreditCard` (`backend/prisma/schema.prisma:469-480`), inverse relations (`schema.prisma:83-84,151,179`), `prisma validate` + `generate` + `build` passed |
| T2 | ✅ Done | `AccountsService` favorites, ordering, lifecycle cleanup (`backend/src/modules/accounts/accounts.service.ts:68-259`), 17 new unit tests in `accounts.service.spec.ts` |
| T3 | ✅ Done | `AccountsController` `PATCH :id/favorite` and `:id/unfavorite` (`backend/src/modules/accounts/accounts.controller.ts:89-112`), 7 unit tests in `accounts.controller.spec.ts` |
| T4 | ✅ Done | `CreditCardsService` favorites, ordering, lifecycle cleanup (`backend/src/modules/credit-cards/credit-cards.service.ts:75-347`), 21 new unit tests in `credit-cards.service.spec.ts` |
| T5 | ✅ Done | `CreditCardsController` `PATCH :id/favorite` and `:id/unfavorite` (`backend/src/modules/credit-cards/credit-cards.controller.ts:111-134`), 7 unit tests in `credit-cards.controller.spec.ts` |
| T6 | ✅ Done | Star toggle button on active accounts, error state preservation, in-flight disable (`frontend/src/app/accounts/page.tsx:17,75-87,263-278`) |
| T7 | ✅ Done | Star toggle button on active cards and `"★ "` in Liquidação de Fatura (`frontend/src/app/cards/page.tsx:62,95-116,204-216,408-423,803-814`) |
| T8 | ✅ Done | 5 combos with `"★ "` prefix and first-item pre-selection (`frontend/src/app/transactions/page.tsx:84-108,798-831,887-913,942-952`) |
| T9 | ✅ Done | `"★ "` prefix and context-synced pre-selection in Nova Meta (`frontend/src/app/goals/page.tsx:64-92,489-501`) |

All 9 tasks (T1–T9) in `.specs/features/favorito-conta-cartao/tasks.md` are checked `[x]` with zero open items.

---

## Spec-Anchored Acceptance Criteria

### P1: Favoritar e Desfavoritar Contas Bancárias por Usuário (`FAV-01`, `FAV-02`, `FAV-03`)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| FAV-01 AC1: Authenticated write user favorites active account | Upsert `(userId, accountId)`, HTTP 200 with `isFavorite: true` | `backend/test/unit/accounts.service.spec.ts:442-447` (`expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledWith(...)`, `expect(result).toEqual({ ...account, isFavorite: true })`); `accounts.service.spec.ts:473-478`; `backend/test/unit/accounts.controller.spec.ts:45-48` (`expect(result).toEqual(expected)`) | ✅ PASS |
| FAV-01 AC2: Same user favorites already-favorited account | Idempotent upsert without duplicate error, HTTP 200 with `isFavorite: true` | `backend/test/unit/accounts.service.spec.ts:503-505` (`expect(first).toEqual({ ...account, isFavorite: true })`, `expect(second).toEqual({ ...account, isFavorite: true })`, `expect(prisma.userFavoriteAccount.upsert).toHaveBeenCalledTimes(2)`) | ✅ PASS |
| FAV-02 AC3: Authenticated write user unfavorites account (including non-favorited) | Delete only caller link `(userId, accountId)`, HTTP 200 with `isFavorite: false` even if not favorited | `backend/test/unit/accounts.service.spec.ts:602-605` (`deleteMany` scoped to `{ userId: 'user-1', accountId: 'acc-1' }`, `expect(result).toEqual({ ...account, isFavorite: false })`); `accounts.service.spec.ts:623-626`; `backend/test/unit/accounts.controller.spec.ts:94-95` | ✅ PASS |
| FAV-01/FAV-02 AC4: Account missing or `deletedAt` set | HTTP 404 (`NotFoundException`) on favorite and unfavorite | `backend/test/unit/accounts.service.spec.ts:530-544` (`rejects.toThrow(NotFoundException)`, `upsert` not called); `accounts.service.spec.ts:631-645` (`deleteMany` not called); `backend/test/unit/accounts.controller.spec.ts:81-83,117-119` | ✅ PASS |
| FAV-01 AC5: Account archived (`isArchived: true`) | HTTP 400 with `"Não é possível favoritar uma conta arquivada"` | `backend/test/unit/accounts.service.spec.ts:522-525` (`rejects.toThrow(new BadRequestException('Não é possível favoritar uma conta arquivada'))`); `backend/test/unit/accounts.controller.spec.ts:56-58` | ✅ PASS |
| FAV-01/FAV-02 AC6: No access or `VIEWER` role in family | HTTP 403 (`ForbiddenException`) without modifying favorites | `backend/test/unit/accounts.service.spec.ts:562-579` (`rejects.toThrow(new ForbiddenException(...))`, `upsert` not called); `accounts.service.spec.ts:663-680` (`deleteMany` not called); `backend/test/unit/accounts.controller.spec.ts:69-73,105-109` | ✅ PASS |
| FAV-03 AC7: `GET /accounts` includes per-user `isFavorite` and sorts `isFavorite DESC, createdAt DESC` | `isFavorite` scoped to caller, favorites sorted first then `createdAt DESC`, isolated across family members | `backend/test/unit/accounts.service.spec.ts:727-732` (`expect(result).toEqual([accNewFav, accOldFav, accNewNonFav, accOldNonFav])`); `accounts.service.spec.ts:762-777` (family isolation `user-a` vs `user-b`) | ✅ PASS |
| FAV-03 AC8: `GET /accounts/:id` includes caller-only `isFavorite` | `isFavorite` reflects only caller's `userFavoriteAccount` row | `backend/test/unit/accounts.service.spec.ts:802-809` (`expect(resA).toEqual({ ...account, isFavorite: true })`, `expect(resB).toEqual({ ...account, isFavorite: false })`) | ✅ PASS |

### P1: Favoritar e Desfavoritar Cartões de Crédito por Usuário (`FAV-04`, `FAV-05`, `FAV-06`)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| FAV-04 AC1: Authenticated write user favorites active card | Upsert `(userId, creditCardId)`, HTTP 200 with `isFavorite: true` | `backend/test/unit/credit-cards.service.spec.ts:1427-1437` (`upsert` with `userId_creditCardId`, `isFavorite: true`); `credit-cards.service.spec.ts:1466-1478`; `backend/test/unit/credit-cards.controller.spec.ts:44-47` | ✅ PASS |
| FAV-04 AC2: Same user favorites already-favorited card | Idempotent upsert without duplicate error, HTTP 200 with `isFavorite: true` | `backend/test/unit/credit-cards.service.spec.ts:1506-1513` (`expect(first.isFavorite).toBe(true)`, `expect(second.isFavorite).toBe(true)`, `upsert` called twice) | ✅ PASS |
| FAV-05 AC3: Authenticated write user unfavorites card (including non-favorited) | Delete only caller link `(userId, creditCardId)`, HTTP 200 with `isFavorite: false` even if not favorited | `backend/test/unit/credit-cards.service.spec.ts:1628-1636` (`deleteMany` scoped to `{ userId: 'user-1', creditCardId: 'card-1' }`, `isFavorite: false`); `credit-cards.service.spec.ts:1657-1665`; `backend/test/unit/credit-cards.controller.spec.ts:91-94` | ✅ PASS |
| FAV-04/FAV-05 AC4: Card missing or `deletedAt` set | HTTP 404 (`NotFoundException`) on favorite and unfavorite | `backend/test/unit/credit-cards.service.spec.ts:1537-1558` (`upsert` not called); `credit-cards.service.spec.ts:1671-1692` (`deleteMany` not called); `backend/test/unit/credit-cards.controller.spec.ts:80-82,116-118` | ✅ PASS |
| FAV-04 AC5: Card archived (`isActive: false`) | HTTP 400 with `"Não é possível favoritar um cartão arquivado"` | `backend/test/unit/credit-cards.service.spec.ts:1528-1531` (`rejects.toThrow(new BadRequestException('Não é possível favoritar um cartão arquivado'))`); `backend/test/unit/credit-cards.controller.spec.ts:55-57` | ✅ PASS |
| FAV-04/FAV-05 AC6: No access or `VIEWER` role in family | HTTP 403 (`ForbiddenException`) without modifying favorites | `backend/test/unit/credit-cards.service.spec.ts:1579-1602` (`upsert` not called); `credit-cards.service.spec.ts:1713-1736` (`deleteMany` not called); `backend/test/unit/credit-cards.controller.spec.ts:68-72,104-108` | ✅ PASS |
| FAV-06 AC7: `GET /credit-cards` includes per-user `isFavorite` and sorts `isFavorite DESC, createdAt DESC` | Favorites first then `createdAt DESC`, preserves `committedAmount`/`availableLimit`, isolated across family members | `backend/test/unit/credit-cards.service.spec.ts:1794-1797` (`expect(result.map((c) => c.id)).toEqual(['card-3', 'card-1', 'card-4', 'card-2'])`, `committedAmount`/`availableLimit` asserted); `credit-cards.service.spec.ts:1835-1850` | ✅ PASS |
| FAV-06 AC8: `GET /credit-cards/:id` includes caller-only `isFavorite` | `isFavorite` reflects only caller's `userFavoriteCreditCard` row | `backend/test/unit/credit-cards.service.spec.ts:1878-1886` (`expect(resA.isFavorite).toBe(true)`, `expect(resB.isFavorite).toBe(false)`) | ✅ PASS |

### P1: Priorização de Favoritos nos Combos de Lançamento e Telas de Gestão (`FAV-07`, `FAV-08`, `FAV-09`)

Per `tasks.md` Test Coverage Matrix, `frontend/package.json` has no frontend test runner configured; verification uses ESLint + Next.js production build gate plus direct inspection of implementation `file:line`.

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + verification | Result |
| --- | --- | --- | --- |
| FAV-07 AC1: Star button on active accounts (`/accounts`) and cards (`/cards`), hidden when archived or `VIEWER`, immediate toggle without confirmation | Renders `<Star />` only when `!isViewer && !acc.isArchived` / `card.isActive !== false`, toggles immediately via `PATCH` | `frontend/src/app/accounts/page.tsx:75-87,263-278`; `frontend/src/app/cards/page.tsx:204-216,408-423` (ESLint 0 errors + Next.js build passed) | ✅ PASS |
| FAV-08 AC2: Novo Lançamento account combos show favorites first with `"★ "` and pre-select first account | Expense, Income, Source Transfer, Destination Transfer combos render `acc.isFavorite ? '★ ' : ''`; `accountId` pre-selects `accs[0].id` | `frontend/src/app/transactions/page.tsx:102,806,827,894,949` (ESLint 0 errors + Next.js build passed) | ✅ PASS |
| FAV-08 AC3: Credit card payment mode combo shows favorites first with `"★ "` and pre-selects first card | Credit card combo renders `c.isFavorite ? '★ ' : ''`; `creditCardId` pre-selects `cds[0].id` | `frontend/src/app/transactions/page.tsx:103,910` (ESLint 0 errors + Next.js build passed) | ✅ PASS |
| FAV-09 AC4: Secondary combos in Liquidação de Fatura (`/cards`) and Nova Meta (`/goals`) show favorites first with `"★ "` | Both selects consume `/accounts` ordered favorites-first and prefix `'★ '` when `acc.isFavorite` | `frontend/src/app/cards/page.tsx:106-110,811`; `frontend/src/app/goals/page.tsx:70-80,498` (ESLint 0 errors + Next.js build passed) | ✅ PASS |
| FAV-07 AC5: Toggle API failure preserves previous state and displays error alert | `apiRequest` failure skips reload (preserving list state) and triggers `alert(...)` | `frontend/src/app/accounts/page.tsx:78-84`; `frontend/src/app/cards/page.tsx:207-213` (ESLint 0 errors + Next.js build passed) | ✅ PASS |

### P2: Integridade de Ciclo de Vida ao Arquivar ou Excluir (`FAV-10`)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| FAV-10 AC1: Account archived or soft-deleted clears all favorite links for all users | `tx.userFavoriteAccount.deleteMany({ where: { accountId: account.id } })` inside `$transaction` | `backend/test/unit/accounts.service.spec.ts:837-845` (`archive` `$transaction` + `deleteMany` + `isFavorite: false`); `accounts.service.spec.ts:864-872` (`remove` `$transaction` + `deleteMany`) | ✅ PASS |
| FAV-10 AC2: Credit card archived or soft-deleted clears all favorite links for all users | `tx.userFavoriteCreditCard.deleteMany({ where: { creditCardId: card.id } })` inside `$transaction` | `backend/test/unit/credit-cards.service.spec.ts:1916-1924` (`archive` `$transaction` + `deleteMany` + `isFavorite: false`); `credit-cards.service.spec.ts:1942-1950` (`remove` `$transaction` + `deleteMany`) | ✅ PASS |
| FAV-10 AC3: Unarchiving previously favorited account or card returns `isFavorite: false` | Returns `{ ...reactivated, isFavorite: false }` | `backend/test/unit/accounts.service.spec.ts:887-889` (`expect(result).toEqual({ ...reactivated, isFavorite: false })`); `backend/test/unit/credit-cards.service.spec.ts:1967-1969` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Executed in isolated temporary scratch `/tmp/fav-sensor-scratch/backend` with symlinked `node_modules` (fallback per `validate.md` because `git worktree add` failed due to sandbox `.git` isolation and the unsandboxed permission prompt timed out after 60s). Real-tree integrity was verified before and after scratch cleanup via SHA-256 manifest comparison across `backend/src`, `backend/test`, `backend/prisma`, `frontend/src`, and `.specs` (`ISOLATION_VERIFIED_IDENTICAL`).

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `backend/src/modules/accounts/accounts.service.ts:84` | Inverted sort priority `return a.isFavorite ? -1 : 1;` to `return a.isFavorite ? 1 : -1;` | ✅ Killed (2 failed in `accounts.service.spec.ts`, exit 1) |
| 2 | `backend/src/modules/credit-cards/credit-cards.service.ts:237-239` | Removed archived guard `if (!card.isActive)` in `CreditCardsService.favorite` | ✅ Killed (1 failed in `credit-cards.service.spec.ts`, exit 1) |
| 3 | `backend/src/modules/accounts/accounts.service.ts:192-194` | Removed `tx.userFavoriteAccount.deleteMany` inside `AccountsService.archive` `$transaction` | ✅ Killed (1 failed in `accounts.service.spec.ts`, exit 1) |

**Sensor depth**: lightweight (3 targeted behavior-level mutations)
**Result**: 3/3 killed - PASS ✅

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ |
| Every test maps to a spec requirement - no unclaimed tests | ✅ |
| Documented guidelines followed: none - strong defaults applied (`tasks.md:18`) | ✅ |

---

## Edge Cases

- [x] Personal vs family context isolation: `findAll` scopes items by `familyId` vs `{ userId, familyId: null }` before querying favorites (`accounts.service.ts:41-75`, `credit-cards.service.ts:59-82`; tested at `accounts.service.spec.ts:735-778`, `credit-cards.service.spec.ts:1800-1851`), and frontend pages reload and resync selection on `selectedFamilyId` change (`transactions/page.tsx:102-103,135-139`, `goals/page.tsx:74-80,88-92`, `cards/page.tsx:106-110,118-122`).
- [x] Idempotent unfavorite on non-favorited account or card: `deleteMany` returns HTTP 200 with `isFavorite: false` (`accounts.service.spec.ts:608-627`, `credit-cards.service.spec.ts:1639-1666`).
- [x] Rapid double-click prevention: star buttons disable while `togglingFavoriteId === item.id` inside `try/finally` (`accounts/page.tsx:17,76,85,268`, `cards/page.tsx:62,205,214,413`).
- [x] No favorites preserves `createdAt DESC` order without `"★ "` prefix: `accounts.service.ts:82-89`, `credit-cards.service.ts:100-107`, and conditional `isFavorite ? '★ ' : ''` across all 7 frontend combos.

---

## Gate Check

- **Gate command**: `export PATH="/home/italo/.nvm/versions/node/v24.18.0/bin:$PATH" && cd backend && DATABASE_URL="postgresql://user:pass@localhost:5432/db" npx prisma validate && npx prisma generate && npm run build && npm test && cd ../frontend && npm run lint && npm run build`
- **Result**: Backend `398` passed, `0` failed, `0` skipped (`32` suites); Prisma validate/generate clean; Backend build clean; Frontend ESLint `0` errors (`28` pre-existing warnings); Frontend Next.js 16.3.8 Turbopack production build clean (`13/13` static pages)
- **Test count before feature**: `346` passed (`30` suites)
- **Test count after feature**: `398` passed (`32` suites)
- **Delta**: `+52` new tests (`+2` suites: `accounts.controller.spec.ts` +7, `credit-cards.controller.spec.ts` +7, `accounts.service.spec.ts` +17, `credit-cards.service.spec.ts` +21)
- **Skipped tests**: none
- **Failures**: none

---

## Requirement Traceability Update

All requirements (`FAV-01` through `FAV-10`) are verified; `spec.md` was left unedited per read-only verifier constraints.

| Requirement | Previous Status | Verified Status |
| --- | --- | --- |
| FAV-01 | Implementing | ✅ Verified |
| FAV-02 | Implementing | ✅ Verified |
| FAV-03 | Implementing | ✅ Verified |
| FAV-04 | Implementing | ✅ Verified |
| FAV-05 | Implementing | ✅ Verified |
| FAV-06 | Implementing | ✅ Verified |
| FAV-07 | Implementing | ✅ Verified |
| FAV-08 | Implementing | ✅ Verified |
| FAV-09 | Implementing | ✅ Verified |
| FAV-10 | Implementing | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 24/24 ACs verified (19/19 backend ACs matched spec assertions; 5/5 frontend ACs verified at implementation `file:line` under lint + Next.js build gate) | 0 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 398 passed, 0 failed, 0 skipped (frontend ESLint 0 errors, Next.js build clean)

**What works**:
- Per-user favorite accounts and credit cards persisted via `UserFavoriteAccount` and `UserFavoriteCreditCard` with composite PKs and cascade deletes.
- `GET /accounts`, `GET /accounts/:id`, `GET /credit-cards`, and `GET /credit-cards/:id` return caller-scoped `isFavorite` sorted by `isFavorite DESC, createdAt DESC`, while `PATCH .../favorite` and `.../unfavorite` enforce idempotency, active-only constraints, 404/403/400 semantics, and RBAC `VIEWER` blocking.
- `archive` and `remove` clear all favorite links atomically in `$transaction`, keeping `unarchive` at `isFavorite: false`.
- Star toggles on active items in `/accounts` and `/cards` and `"★ "` prioritization across `/transactions` (5 combos), `/cards` (Liquidação de Fatura), and `/goals` (Nova Meta) compile and pass ESLint cleanly.

**Issues found**: none

**Next steps**: Update `.specs/features/favorito-conta-cartao/spec.md` traceability statuses to Verified and `.specs/STATE.md` if desired by the orchestrator, then proceed to review/merge.
