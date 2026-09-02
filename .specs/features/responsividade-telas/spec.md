# Responsividade e Adaptação Multi-Telas Specification

## Problem Statement

Atualmente, o layout do sistema possui dimensões fixas (sidebar fixa de 256px sem opção de recolhimento em dispositivos móveis, espaçamentos rígidos de 32px e tabelas sem contêineres de rolagem adaptativa), o que compromete a usabilidade em smartphones e tablets. Esta especificação define os requisitos de layout responsivo, gaveta de navegação móvel (drawer), quebras de grid fluidas e adaptação de formulários, tabelas, modais e gráficos para telas de 320px até resoluções ultrawide.

## Goals

- [ ] Implementar AppShell totalmente responsivo com gaveta de navegação móvel acionada por botão hamburguer, fecho automático em navegação e backdrop com desfoque.
- [ ] Adaptar o cabeçalho superior (header) e seletor de contexto familiar para não quebrar ou vazar em telas pequenas (320px a 768px).
- [ ] Tornar todas as tabelas e listas de dados (transações, membros, faturas e orçamentos) fluidas e acessíveis via contêineres com overflow seguro e visualização em cards responsivos.
- [ ] Assegurar que todos os modais de cadastro e edição se ajustem confortavelmente à viewport de dispositivos móveis com rolagem vertical interna e espaçamento de segurança.
- [ ] Adaptar todos os dashboards, cartões KPI e gráficos Recharts para redimensionamento fluido sem quebras visuais em resoluções mobile, tablet e desktop.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Criação de aplicativo nativo Android/iOS | Foco estrito em Web App Responsiva (PWA / Mobile-First CSS) |
| Redesenho de identidade visual ou troca de cores da marca | O escopo é estritamente adaptação de layout, grids, breakpoints e acessibilidade tátil |
| Modificações nas rotas ou APIs do Backend NestJS | As alterações são puramente no Frontend (Next.js / Tailwind CSS / Layouts) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Breakpoints de Responsividade | Padrão Tailwind CSS (sm: 640px, md: 768px, lg: 1024px, xl: 1280px) | Garante consistência universal e alinhamento com a biblioteca de estilos já utilizada | y |
| Menu Móvel | Drawer lateral deslizante (slide-over) com botão hamburguer e backdrop escurecido | Padrão moderno com máxima usabilidade para navegação com múltiplos itens | y |
| Modais em telas pequenas | Largura total com margem segura (`w-full mx-4 max-w-lg`) e altura máxima com scroll (`max-h-[90vh] overflow-y-auto`) | Evita cortes em telas pequenas com teclado virtual ativo | y |
| Tabelas de dados | Contêiner com `overflow-x-auto` e padding responsivo | Preserva a integridade dos dados e colunas sem quebrar o layout | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Layout Base e Navegação Móvel Responsiva (AppShell) ⭐ MVP

**User Story**: As a usuário acessando pelo celular ou tablet, I want uma navegação fluida com menu recolhível so that eu possa navegar facilmente entre as páginas sem que a barra lateral bloqueie o conteúdo.

**Why P1**: É a estrutura principal de todas as páginas autenticadas do sistema.

**Acceptance Criteria**:

1. WHILE a tela for menor que 1024px (`< lg`), o sistema SHALL ocultar a sidebar fixa e exibir um botão hamburguer no topo esquerdo do cabeçalho.
2. WHEN o usuário clicar no botão hamburguer em telas móveis THEN o sistema SHALL abrir a gaveta lateral (drawer) com animação suave e backdrop escurecido.
3. WHEN o usuário clicar no backdrop, no botão fechar ou navegar para uma nova rota THEN o sistema SHALL fechar a gaveta lateral automaticamente.
4. WHILE em telas desktop (>= 1024px), o sistema SHALL manter a barra lateral fixa visível à esquerda com espaçamento adequado no conteúdo principal (`lg:pl-64`).
5. The system SHALL manter o seletor de contexto ativo (Pessoal vs. Família) perfeitamente ajustado sem overflow horizontal em larguras a partir de 320px.

**Independent Test**: Reduzir a viewport para 375px no navegador, verificar aparição do botão hamburguer, abrir o menu lateral, navegar para outra rota e verificar o fechamento automático e layout limpo.

---

### P1: Dashboard e Indicadores Financeiros Responsivos ⭐ MVP

**User Story**: As a usuário, I want visualizar meus indicadores (saldo, receitas, despesas) e gráficos de forma legível em qualquer tamanho de tela so that eu tenha controle financeiro rápido no celular.

**Why P1**: O dashboard é a página principal de entrada e visualização rápida dos dados.

**Acceptance Criteria**:

1. WHEN a tela estiver em resolução mobile (< 640px) THEN o sistema SHALL dispor os cards de KPI em 1 coluna vertical.
2. WHEN a tela estiver em resolução tablet (>= 640px e < 1024px) THEN o sistema SHALL dispor os cards de KPI em 2 colunas.
3. WHEN a tela estiver em resolução desktop (>= 1024px) THEN o sistema SHALL dispor os cards de KPI em 4 colunas.
4. The system SHALL renderizar os gráficos de categorias e fluxo de caixa com `ResponsiveContainer` ajustando a largura automaticamente sem corte de legendas.
5. WHEN o cabeçalho do dashboard com seletor de mês e botão "Novo Lançamento" renderizar em telas móveis THEN o sistema SHALL quebrar os elementos verticalmente com espaçamento harmônico (`flex-col sm:flex-row`).

**Independent Test**: Testar visualização do dashboard em 320px, 768px e 1440px verificando transição de 1 para 2 e 4 colunas nos cards e gráficos responsivos.

---

### P1: Tabelas, Filtros e Modais de Transações e Extrato ⭐ MVP

**User Story**: As a usuário, I want filtrar, pesquisar e registrar transações pelo celular sem quebras de layout ou botões inacessíveis so that eu possa lançar meus gastos no momento da compra.

**Why P1**: Lançamentos em tempo real ocorrem predominantemente em dispositivos móveis.

**Acceptance Criteria**:

1. WHEN o usuário visualizar a listagem de transações em dispositivos móveis THEN o sistema SHALL encapsular a tabela em contêiner com rolagem horizontal suave e manter o visual fluido.
2. WHEN o usuário acessar a barra de filtros de transações em telas pequenas THEN o sistema SHALL empilhar os campos de busca, tipo e datas em layout responsivo adaptável.
3. WHEN o usuário abrir o modal de "Nova Transação" em dispositivos móveis THEN o sistema SHALL limitar a altura a `90vh` com rolagem interna e largura ajustada às bordas da tela (`mx-4 w-auto`).
4. The system SHALL ajustar os formulários com campos duplos para 1 coluna em mobile (< 640px) e 2 colunas em telas maiores (>= 640px).

**Independent Test**: Abrir o modal de transação em viewport de 360px de largura, preencher todos os campos sem quebra de scroll e salvar o lançamento.

---

### P2: Telas de Contas, Cartões, Orçamentos, Metas, Família e Relatórios

**User Story**: As a usuário, I want gerenciar minhas contas, cartões, metas, orçamentos e grupo familiar confortavelmente em qualquer dispositivo so that a experiência seja consistente em todo o aplicativo.

**Why P2**: Todas as páginas secundárias precisam manter o mesmo padrão de qualidade e usabilidade responsiva.

**Acceptance Criteria**:

1. WHEN o usuário acessar a página de Contas ou Cartões em telas pequenas THEN o sistema SHALL organizar os cartões bancários e faturas em grid de 1 coluna em mobile e multi-colunas em desktop.
2. WHEN o usuário acessar a página de Orçamentos e Metas em telas pequenas THEN o sistema SHALL redimensionar as barras de progresso percentual e valores monetários sem sobreposição de textos.
3. WHEN o usuário acessar a página de Família em telas móveis THEN o sistema SHALL exibir a lista de membros e opções de gerenciamento em layout adaptável com ações acessíveis ao toque.
4. WHEN o usuário acessar os Relatórios e Exportação em telas móveis THEN o sistema SHALL alinhar os botões de download e gráficos de forma fluida.

**Independent Test**: Navegar por `/accounts`, `/cards`, `/budgets`, `/goals`, `/family` e `/reports` em resolução mobile de 375px e validar ausência de barras de rolagem horizontal globais na página.

---

### P3: Telas de Autenticação (Login e Cadastro)

**User Story**: As a usuário, I want acessar as telas de login e registro em qualquer tamanho de tela com foco e espaçamento otimizados so that eu possa entrar no sistema pelo smartphone facilmente.

**Why P3**: Garante o primeiro contato acolhedor e profissional em qualquer dispositivo.

**Acceptance Criteria**:

1. The system SHALL centralizar os cards de login e registro com espaçamento lateral de segurança em telas móveis (`px-4 sm:px-6`).
2. WHEN o teclado virtual de um smartphone estiver aberto THEN o sistema SHALL permitir rolagem vertical suave para alcançar todos os campos e botão de submissão.

**Independent Test**: Testar visualização do formulário de login e registro em telas com 320px de largura.

---

## Edge Cases

- IF a largura da tela for tão estreita quanto 320px THEN o sistema SHALL manter o padding interno reduzido (`p-4`) sem quebrar textos nem vazar a largura do viewport.
- IF o usuário alternar a orientação do dispositivo com o drawer aberto THEN o sistema SHALL manter a gaveta utilizável com rolagem interna.
- WHEN nomes longos de contas, membros ou categorias forem renderizados THEN o sistema SHALL aplicar truncamento com reticências (`truncate`) para evitar estouro dos contêineres.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RESP-01 | P1: Layout Base e Navegação Móvel Responsiva (AppShell) | Execute | Verified |
| RESP-02 | P1: Dashboard e Indicadores Financeiros Responsivos | Execute | Verified |
| RESP-03 | P1: Tabelas, Filtros e Modais de Transações e Extrato | Execute | Verified |
| RESP-04 | P2: Telas de Contas, Cartões, Orçamentos, Metas, Família e Relatórios | Execute | Verified |
| RESP-05 | P3: Telas de Autenticação (Login e Cadastro) | Execute | Verified |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

- [x] Zero overflow horizontal na viewport do navegador em todas as rotas do frontend em resoluções de 320px até 2560px.
- [x] Menu móvel funcional com drawer deslizante, botão hamburguer e fechamento automático ao selecionar rotas ou clicar fora.
- [x] Todos os modais, tabelas e gráficos utilizáveis e legíveis em smartphones (ex: 375x667), tablets (768x1024) e desktops (1920x1080).
- [x] Build de produção do frontend (`npm run build`) concluído com sucesso sem nenhum erro de TypeScript ou CSS.
