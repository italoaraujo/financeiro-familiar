# Encerramento de Sessão ao Fechar Navegador Specification

## Problem Statement

Atualmente, ao autenticar no sistema, o token de acesso (JWT) e os dados do usuário são gravados no `localStorage` do navegador, e o cookie de autenticação `financial_token` é gerado com expiração persistente de 1 dia (`expires = Date.now() + 1 dia`). Por consequência, quando o usuário encerra e fecha o navegador, as credenciais permanecem salvas em disco no `localStorage` e nos cookies persistentes. Ao reabrir o navegador, o usuário continua logado automaticamente. Para garantir a privacidade e segurança patrimonial, o usuário requer que a sessão de login não persista em disco e seja automaticamente invalidada assim que o navegador for fechado.

## Goals

- [ ] Converter o cookie de autenticação `financial_token` em um Session Cookie estrito (sem atributo `Expires` e sem `Max-Age`), garantindo que o navegador descarte o cookie da memória ao ser fechado.
- [ ] Eliminar a gravação de credenciais e tokens no `localStorage`, evitando que dados de autenticação sobrevivam ao encerramento do processo do navegador.
- [ ] Implementar limpeza defensiva imediata no carregamento do frontend para expurgar tokens legados de autenticação remanescentes em `localStorage`.
- [ ] Assegurar compartilhamento transparente de sessão entre múltiplas abas abertas simultaneamente na mesma sessão de navegação, com recuperação automática de dados do perfil via `GET /auth/me` quando necessário.
- [ ] Garantir que o encerramento explícito de sessão (`logout`) ou expiração (HTTP 401) limpe imediatamente os cookies de sessão, armazenamentos locais e redirecione para a tela de login.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Opção de checkbox "Lembrar de mim" para login persistente de 30 dias | O requisito atual exige expressamente que a sessão não seja persistida entre reinicializações do navegador |
| Alteração no tempo de expiração do JWT emitido pelo backend (1 dia) | A expiração do token no backend governa o teto máximo de validade do JWT, enquanto o ciclo de vida do cliente governa o fechamento da janela |
| Implementação de WebSockets ou SSE para heartbeat de fechamento de aba | O mecanismo nativo de Session Cookies e Session Storage do navegador resolve com total robustez sem sobrecarga de rede |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mecanismo de expiração no fechamento | Session Cookie (sem `Expires`/`Max-Age`) combinado com `sessionStorage` e remoção total de tokens em `localStorage` | Padrão formal da Web (RFC 6265) que instrui o navegador a manter o cookie apenas em memória e descartá-lo ao encerrar o navegador | y |
| Comportamento ao abrir nova aba no mesmo navegador aberto | O usuário permanece autenticado na nova aba sem precisar digitar credenciais novamente | O Session Cookie é compartilhado entre abas da mesma instância do navegador, preservando a usabilidade multitarefa | y |
| Hidratação de dados do usuário em nova aba | Consultar `GET /auth/me` se o token existir no Session Cookie mas o perfil não estiver no cache em memória/sessionStorage | Garante que novas abas independentes restaurem perfil e permissões familiares sem inconsistências | y |
| Limpeza de tokens legados pré-existentes em disco | Executar `localStorage.removeItem('financial_token')` e `localStorage.removeItem('financial_user')` no bootstrap da aplicação | Evita que sessões salvas em versões anteriores continuem ativas indevidamente | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco ⭐ MVP

**User Story**: As a usuário do sistema financeiro, I want que minhas credenciais e tokens não fiquem salvos em disco no navegador so that quando eu fechar o navegador ninguém que use meu computador consiga acessar minha conta sem autenticar.

**Why P1**: Atende diretamente à solicitação do usuário e elimina a permanência indevida de dados de sessão após fechar o navegador.

**Acceptance Criteria**:

1. WHEN o usuário realiza login ou cadastro com sucesso THEN the frontend SHALL armazenar o token `financial_token` exclusivamente como Session Cookie sem atributos `Expires` e sem `Max-Age`.
2. The frontend SHALL NOT gravar `financial_token` nem credenciais no `localStorage`.
3. WHEN o frontend inicializa e detecta chave residual `financial_token` no `localStorage` THEN the frontend SHALL remover a chave imediatamente de `localStorage`.
4. WHEN o navegador é fechado e reaberto pelo usuário THEN the frontend SHALL redirecionar o usuário para a página de login ao acessar rotas protegidas devido à ausência do Session Cookie.
5. WHEN o usuário clica em sair ou a API retorna status HTTP 401 THEN the frontend SHALL remover o Session Cookie `financial_token`, limpar `sessionStorage` e redirecionar para `/login`.

**Independent Test**: Realizar login, verificar que o cookie `financial_token` possui `Expires/Max-Age: Session` e que o `localStorage` não contém o token. Fechar todas as instâncias do navegador, reabrir e verificar redirecionamento para `/login`.

---

### P2: Continuidade de Sessão Multi-Abas e Hidratação de Perfil

**User Story**: As a usuário do sistema financeiro, I want poder abrir múltiplas abas do sistema enquanto o navegador estiver aberto so that eu consiga consultar relatórios e realizar lançamentos simultaneamente sem ser deslogado.

**Why P2**: Garante excelente usabilidade enquanto a sessão legítima do navegador estiver em execução.

**Acceptance Criteria**:

1. WHILE a sessão do navegador estiver aberta em qualquer janela, WHEN uma nova aba for aberta com a URL do sistema THEN the frontend SHALL reconhecer o Session Cookie `financial_token` ativo.
2. WHERE o Session Cookie `financial_token` estiver presente mas os dados do usuário não estiverem carregados no estado do cliente THEN the frontend SHALL recuperar os dados do perfil via `GET /auth/me` e hidratar a sessão.
3. WHILE o usuário estiver com sessão ativa THEN the frontend SHALL manter o contexto da família selecionada acessível entre as telas da aplicação.

**Independent Test**: Fazer login em uma aba, abrir uma nova aba do mesmo navegador navegando para `/transactions` e validar que a tela carrega autenticada com as permissões da família ativa.

---

## Edge Cases

- IF o usuário estiver em conexão HTTPS THEN the frontend SHALL manter o atributo `Secure` no Session Cookie juntamente com `SameSite=Strict`.
- IF a requisição `GET /auth/me` falhar com 401 ao hidratar uma nova aba THEN the frontend SHALL expurgar os cookies de sessão e encaminhar para `/login`.
- IF a sessão do navegador for restaurada por recursos atípicos de hibernação de aba THEN the frontend SHALL validar a autenticidade do token junto às chamadas de API, garantindo bloqueio imediato se revogado.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SESS-01 | P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco | Phase 1 | Implemented |
| SESS-02 | P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco | Phase 2 | Implemented |
| SESS-03 | P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco | Phase 2 | Implemented |
| SESS-04 | P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco | Phase 2 | Implemented |
| SESS-05 | P1: Descarte de Sessão ao Fechar Navegador e Remoção de Persistência em Disco | Phase 1 | Implemented |
| SESS-06 | P2: Continuidade de Sessão Multi-Abas e Hidratação de Perfil | Phase 2 | Implemented |
| SESS-07 | P2: Continuidade de Sessão Multi-Abas e Hidratação de Perfil | Phase 2 | Implemented |
| SESS-08 | P2: Continuidade de Sessão Multi-Abas e Hidratação de Perfil | Phase 2 | Implemented |

**ID format:** `SESS-[NUMBER]`
