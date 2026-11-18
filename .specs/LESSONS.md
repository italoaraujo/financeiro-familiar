# LESSONS - auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation - do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 - Mock valid membership and assert the exact error message when testing privacy guards inside family-scoped methods so fallback membership checks cannot mask a missing privacy check
- signal: `surviving_mutant` · recurrence: 1 feature(s) · scope: `transactions` · harmful: 0
- features: edicao-lancamento-descricao-tags
- evidence: backend/test/unit/transactions.service.spec.ts:1683-1695 (Mutant 2) (transactions)
- last seen: 2026-11-18T01:39:23Z

## Quarantined (failed when applied - ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
