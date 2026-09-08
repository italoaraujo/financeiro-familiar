# RBAC Viewer - Permissão de Somente Leitura no Contexto Familiar Specification

## Problem Statement

Membros associados a um grupo familiar com o papel de Visualizador (`VIEWER`) conseguem atualmente executar operações de mutação (criação, edição, exclusão e movimentações financeiras) nos módulos de transações, transferências, contas, cartões de crédito, orçamentos, metas e categorias da família. O papel `VIEWER` deve ser restrito exclusivamente a consultas e relatórios (somente leitura), impedindo alterações de dados acidentais ou não autorizadas no patrimônio da família tanto no backend quanto no frontend.

## Goals

- [ ] Bloquear no backend (HTTP 403 Forbidden) todas as operações de escrita/mutação (criação, alteração, exclusão, transferência, aporte, resgate e pagamento de fatura) executadas por membros com papel `VIEWER` no contexto do grupo familiar.
- [ ] Garantir que todas as consultas de leitura (GET) continuem funcionando normalmente para o `VIEWER` em todos os módulos (dashboard, transações, relatórios, contas, cartões, metas, orçamentos, categorias e membros da família).
- [ ] Atualizar o frontend para identificar o papel `VIEWER` no contexto familiar ativo e ocultar/desabilitar botões de ação mutativa (novos lançamentos, edição, exclusão, aportes, etc.), exibindo sinalização visual de modo somente leitura.
- [ ] Assegurar que as operações no contexto individual (`selectedFamilyId = null`) do usuário permaneçam totalmente funcionais e independentes de seus vínculos familiares.
- [ ] Cobrir as novas regras de autorização com testes automatizados no backend.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Criação de novos papéis granulares de permissão além dos 4 existentes (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) | O modelo RBAC atual já possui a taxonomia necessária |
| Restrição de visualização de relatórios para `VIEWER` | O papel `VIEWER` existe justamente para consultar dados financeiros da família sem modificá-los |
| Alteração de regras de acesso no contexto Individual | O usuário sempre tem controle total sobre suas finanças pessoais |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Nível de bloqueio no Backend | Validação de papel `VIEWER` em todos os métodos de mutação via verificação centralizada ou checagem de permissão de escrita | Garante segurança consistente da API contra requisições diretas de mutação | y |
| Resposta da API para mutações de `VIEWER` | HTTP 403 (ForbiddenException) com mensagem explicativa ("Membros com perfil de apenas visualização não podem realizar alterações") | Padrão REST/NestJS semântico para falha de autorização | y |
| Comportamento de UI para `VIEWER` | Ocultar/desabilitar botões de adicionar/editar/excluir e exibir tag "Somente Leitura" | Evita frustração do usuário ao tentar submeter formulários que seriam rejeitados pelo backend | y |
| Permissões de `MEMBER` | `MEMBER` continua podendo criar e editar transações normais, respeitando as regras existentes | Mantém a distinção entre membros ativos da família e visualizadores | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Proteção e Bloqueio de Mutações no Backend ⭐ MVP

**User Story**: Como administrador do sistema e gestor da família, quero que o backend rejeite com HTTP 403 qualquer requisição de criação, alteração ou exclusão de dados da família originada por um membro com papel `VIEWER`.

**Why P1**: É a camada fundamental de segurança que garante a integridade dos dados e impede modificações indevidas mesmo se chamadas diretamente via API.

**Acceptance Criteria** (each line is one EARS pattern):

1. IF um usuário com papel `VIEWER` no grupo familiar tentar criar, atualizar ou excluir transações no contexto da família THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
2. IF um usuário com papel `VIEWER` tentar realizar transferências entre contas ou pagar fatura de cartão no contexto da família THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
3. IF um usuário com papel `VIEWER` tentar criar, atualizar, arquivar ou remover contas bancárias ou cartões de crédito vinculados à família THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
4. IF um usuário com papel `VIEWER` tentar criar, atualizar ou remover orçamentos ou categorias no contexto da família THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
5. IF um usuário com papel `VIEWER` tentar criar, atualizar, remover, aportar ou resgatar metas financeiras no contexto da família THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
6. IF um usuário com papel `VIEWER` tentar convidar membros, alterar papéis, remover membros ou criar/excluir pessoas no grupo familiar THEN the system SHALL retornar HTTP 403 Forbidden. <!-- unwanted-behavior -->
7. WHEN um usuário com papel `VIEWER` consultar transações, relatórios, contas, faturas, metas, orçamentos ou membros do grupo familiar THEN the system SHALL retornar os dados normalmente com status HTTP 200 OK. <!-- event-driven -->

**Independent Test**: Executar requisições de teste autenticadas como usuário `VIEWER` para criar uma despesa na família e verificar o retorno de erro 403 Forbidden, e depois executar um GET `/transactions?familyId=...` e verificar retorno 200 OK.

---

### P2: Experiência Visual e Modo Somente Leitura no Frontend ⭐ MVP

**User Story**: Como usuário com papel de Visualizador em uma família, quero visualizar claramente as informações financeiras sem botões confusos de ação que resultariam em erro, compreendendo que estou em modo de leitura.

**Why P2**: Fornece clareza imediata na interface, melhora a experiência do usuário e bloqueia fluxos mutativos no cliente.

**Acceptance Criteria**:

1. WHILE o usuário estiver navegando em um contexto familiar onde seu papel é `VIEWER` the system SHALL ocultar ou desabilitar os botões de criação ("Nova Transação", "Nova Transferência", "Nova Conta", "Novo Cartão", "Nova Meta", "Novo Orçamento", "Nova Categoria", "Convidar Membro", "Adicionar Pessoa"). <!-- state-driven -->
2. WHILE o usuário estiver navegando em um contexto familiar onde seu papel é `VIEWER` the system SHALL ocultar as opções de edição, exclusão, arquivamento, aportes, resgates e pagamento de faturas em tabelas e cards. <!-- state-driven -->
3. WHILE o contexto familiar ativo possuir papel `VIEWER` the system SHALL exibir um badge ou aviso informativo indicando "Visualizador (Somente Leitura)". <!-- state-driven -->
4. WHEN o usuário alternar para o contexto Individual (`selectedFamilyId = null`) THEN the system SHALL restabelecer normalmente todos os botões e ações de criação e edição pessoal. <!-- event-driven -->

**Independent Test**: Selecionar uma família onde o usuário é `VIEWER`, verificar a ausência de botões mutativos e a presença do indicador de somente leitura nas páginas principais; em seguida, alternar para o contexto Individual e confirmar a disponibilidade dos botões de criação.

---

## Edge Cases

- IF um usuário for `OWNER` ou `ADMIN` em uma família A e `VIEWER` em uma família B THEN the system SHALL aplicar restrições de escrita estritamente quando a família B for o contexto da operação.
- IF um usuário com papel `VIEWER` tentar atualizar uma transação que ele mesmo criou antes de ter seu papel alterado para `VIEWER` THEN the system SHALL manter o bloqueio e retornar HTTP 403 Forbidden.
- IF a requisição não informar `familyId` (contexto pessoal) THEN the system SHALL aplicar apenas as regras normais de propriedade do usuário (`userId`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RBAC-01 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-02 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-03 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-04 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-05 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-06 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-07 | P1: Proteção e Bloqueio de Mutações no Backend | Specify | Pending |
| RBAC-08 | P2: Experiência Visual e Modo Somente Leitura no Frontend | Specify | Pending |
| RBAC-09 | P2: Experiência Visual e Modo Somente Leitura no Frontend | Specify | Pending |
| RBAC-10 | P2: Experiência Visual e Modo Somente Leitura no Frontend | Specify | Pending |
| RBAC-11 | P2: Experiência Visual e Modo Somente Leitura no Frontend | Specify | Pending |

**ID format:** `[CATEGORY]-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 11 total, 11 mapped to stories, 0 unmapped

---

## Success Criteria

- [ ] Todas as mutações no contexto de família executadas por usuário com papel `VIEWER` são rejeitadas com HTTP 403.
- [ ] Todas as leituras e relatórios continuam acessíveis e íntegros para usuários `VIEWER`.
- [ ] Interface reflete o papel `VIEWER` com badge informativo e botões de ação desabilitados/ocultados.
- [ ] Contexto individual do usuário continua funcionando sem restrições.
- [ ] Todos os testes automatizados do backend passam com 100% de sucesso.
