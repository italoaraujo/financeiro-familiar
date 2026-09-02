# Responsividade e Adaptação Multi-Telas Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Spec**: `.specs/features/responsividade-telas/spec.md`
**Status**: Completed

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Frontend Components & Layout | unit | Render checks, responsiveness layout properties, modal bounds | `frontend/src/**/*.tsx` | `npm --prefix frontend run build` |
| Frontend Build & Lint | static | Verificação de tipos TypeScript e integridade das classes Tailwind CSS | `frontend/` | `npm --prefix frontend run build` |

---

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After task styling changes | `npm --prefix frontend run lint` |
| Full | After each completed task | `npm --prefix frontend run build` |
| Build | After all phases completed | `npm --prefix frontend run build && npm --prefix backend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Layout Shell e Navegação Móvel

Tasks implementando a navegação responsiva, gaveta deslizante (drawer), botão hamburguer e seletor de contexto móvel.

```
T1 → T2
```

### Phase 2: Dashboard, Transações e Contas

Tasks adaptando as páginas centrais: Dashboard com gráficos flexíveis, Extrato com tabelas responsivas e filtros móveis, Contas e Carteiras.

```
T3 → T4 → T5
```

### Phase 3: Cartões, Orçamentos, Metas, Família, Relatórios e Autenticação

Tasks adaptando as telas de Cartões/Faturas, Orçamentos, Metas, Gestão de Grupo Familiar, Relatórios analíticos e Auth.

```
T6 → T7 → T8
```

---

## Task Breakdown

### T1: AppShell Responsivo com Drawer Móvel e Topbar Adaptável

**What**: Implementar controle de abertura/fechamento do menu móvel (drawer), botão hamburguer visível em telas `< lg`, overlay com desfoque de fundo (backdrop), fechamento automático ao clicar no overlay ou navegar por rota, e transição responsiva de padding (`lg:pl-64` vs `pl-0` em mobile). Ajustar o header com flex wrap e truncamento no seletor de contexto familiar para caber em 320px sem overflow.
**Where**: `frontend/src/components/layout/AppShell.tsx`
**Depends on**: None
**Requirement**: RESP-01
**Done when**:
- [x] Botão de menu hamburguer exibido em viewports `< lg`
- [x] Gaveta lateral animada abre e fecha corretamente com backdrop
- [x] Cabeçalho e seletor de contexto familiar truncam sem overflow em 320px
- [x] Conteúdo principal usa padding adaptável (`p-4 sm:p-6 lg:p-8`)
**Tests**: none
**Gate**: build

---

### T2: Estilos Globais e Ajustes de Viewport e Scroll

**What**: Configurar classes utilitárias de scroll horizontal suave (`overflow-x-auto`), prevenir overflow horizontal global no `body`/`html` (`overflow-x-hidden`), e garantir compatibilidade de safe-area padding para dispositivos móveis modernos.
**Where**: `frontend/src/app/globals.css`
**Depends on**: T1
**Requirement**: RESP-01
**Done when**:
- [x] Classes globais prevenindo scroll horizontal indesejado no body
- [x] Estilização para barras de rolagem horizontal responsivas suaves
**Tests**: none
**Gate**: build

---

### T3: Dashboard e Gráficos Responsivos

**What**: Tornar o cabeçalho do Dashboard adaptável (`flex-col sm:flex-row`), grid de KPIs responsivo com 1 coluna em mobile, 2 em tablet e 4 em desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), gráficos Recharts com altura e largura fluidas em `ResponsiveContainer`, e tabelas de lançamentos recentes encapsuladas em contêineres de scroll horizontal.
**Where**: `frontend/src/app/page.tsx`
**Depends on**: None
**Requirement**: RESP-02
**Done when**:
- [x] Grid de KPI Cards renderiza em 1 coluna em mobile, 2 em tablet e 4 em desktop
- [x] Gráficos de fluxo de caixa e categorias redimensionam sem quebrar legendas
- [x] Tabela de lançamentos recentes não causa overflow horizontal na tela
**Tests**: none
**Gate**: build

---

### T4: Extrato de Transações, Filtros Móveis e Modal Adaptável

**What**: Reestruturar a barra de filtros com grid responsivo (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), encapsular a tabela de transações com `overflow-x-auto` e alinhamentos de texto corretos, e adequar o modal de Nova Transação com `max-h-[90vh] overflow-y-auto w-full max-w-lg mx-3 sm:mx-auto` e campos de formulário em 1 coluna em mobile e 2 colunas em desktop.
**Where**: `frontend/src/app/transactions/page.tsx`
**Depends on**: T3
**Requirement**: RESP-03
**Done when**:
- [x] Filtros de transações empilhados e acessíveis em mobile
- [x] Tabela de extrato com rolagem horizontal suave
- [x] Modal de cadastro de transação totalmente operável em smartphone
**Tests**: none
**Gate**: build

---

### T5: Contas Bancárias e Carteiras Responsivas

**What**: Ajustar o grid de contas bancárias para `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, adequar o cabeçalho e botão de nova conta para mobile, e ajustar o modal de criação de conta com margens seguras e layout fluido.
**Where**: `frontend/src/app/accounts/page.tsx`
**Depends on**: T4
**Requirement**: RESP-04
**Done when**:
- [x] Grid de contas bancárias responsivo para qualquer viewport
- [x] Modal de criação de conta ajustado a telas pequenas
**Tests**: none
**Gate**: build

---

### T6: Cartões de Crédito e Visualização de Faturas

**What**: Tornar a exibição do cartão de crédito digital responsiva (largura proporcional sem cortes), grid de cartões e faturas adaptável, tabela de lançamentos da fatura com scroll horizontal, e modais de novo cartão / pagamento de fatura responsivos.
**Where**: `frontend/src/app/cards/page.tsx`
**Depends on**: None
**Requirement**: RESP-04
**Done when**:
- [x] Pré-visualização do cartão de crédito responsiva e com largura fluida
- [x] Visualização de faturas e transações com contêiner com overflow adaptável
- [x] Modais de cartão e pagamento ajustados
**Tests**: none
**Gate**: build

---

### T7: Orçamentos, Metas e Grupo Familiar Responsivos

**What**: Adaptar grids de orçamentos e metas para multi-resolução (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`), ajustar barras de progresso percentual para não quebrar em larguras compactas, formatar a lista de membros e convites da família com ações acessíveis ao toque, e ajustar todos os modais dessas 3 páginas.
**Where**: `frontend/src/app/budgets/page.tsx`, `frontend/src/app/goals/page.tsx`, `frontend/src/app/family/page.tsx`
**Depends on**: T6
**Requirement**: RESP-04
**Done when**:
- [x] Grids de orçamentos e metas adaptados com barras de progresso fluidas
- [x] Gestão de família e lista de membros responsivos
- [x] Todos os modais dessas páginas adaptados para mobile
**Tests**: none
**Gate**: build

---

### T8: Relatórios, Telas de Login e Cadastro

**What**: Adequar os seletores de período, gráficos e botões de exportação na página de relatórios para empilhar em telas móveis. Ajustar os cartões e formulários de Login e Cadastro com padding lateral seguro (`px-4 sm:px-6`) e suporte a rolagem quando o teclado móvel for ativado.
**Where**: `frontend/src/app/reports/page.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/register/page.tsx`
**Depends on**: T7
**Requirement**: RESP-04, RESP-05
**Done when**:
- [x] Relatórios com botões de exportação e seletores empilháveis
- [x] Telas de Login e Registro com espaçamento e centralização perfeitos em mobile
**Tests**: none
**Gate**: build

---

## Verification Plan

### Automated Tests
- `npm --prefix frontend run build`: Garante que todo o código TypeScript, JSX e classes Tailwind compilam perfeitamente sem falhas.
- `npm --prefix backend run build`: Garante a integridade geral do monorepo.

### Manual / Browser Verification
- Testar visualização responsiva simulando viewports de 320px (iPhone SE), 375px (iPhone 13), 768px (iPad) e 1440px (Desktop).
- Validar abertura e fechamento do drawer mobile pelo botão hamburguer, backdrop e clique em links.
- Verificar que nenhum componente ou tabela transborda a largura da tela gerando scroll horizontal indesejado no documento raiz.
