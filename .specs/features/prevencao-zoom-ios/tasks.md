# Tasks: Prevenção de Zoom Automático no iPhone (iOS Safari)

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Global CSS Typography & Touch | static / build | 16px mobile input rule and touch manipulation defined | `frontend/src/app/globals.css` | `npm --prefix frontend run build` |
| Viewport & Root Layout | type-check / build | Viewport configuration valid and build passing | `frontend/src/app/layout.tsx` | `npm --prefix frontend run build` |

---

## Gate Check Commands

- **Frontend Lint Gate**: `npm --prefix frontend run lint`
- **Frontend Build Gate**: `npm --prefix frontend run build`

---

## Execution Plan

```mermaid
graph TD
    subgraph Phase1 [Phase 1: Prevenção de Zoom no Frontend]
        T1 -> T2
    end
```

---

## Task Breakdown

### Phase 1: Prevenção de Zoom no Frontend

#### T1: Regras Globais de Tipografia Mobile e Touch Action [DONE]
Where: frontend/src/app/globals.css
Depends on: none
Tests: frontend/src/app/globals.css
Gate: npm --prefix frontend run build

Configurar regras CSS no globals.css com `@media screen and (max-width: 768px)` definindo `font-size: 16px !important` para `input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"])`, `select` e `textarea`, além de `touch-action: manipulation` para elementos interativos.

#### T2: Verificação do Viewport e Build Completo de Produção
Where: frontend/src/app/layout.tsx
Depends on: T1
Tests: frontend/src/app/layout.tsx
Gate: npm --prefix frontend run build

Garantir conformidade do viewport em layout.tsx com acessibilidade (initialScale: 1, maximumScale: 5) e verificar compilação completa de produção sem erros.
