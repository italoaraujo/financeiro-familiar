# Política de Senhas Seguras no Cadastro de Usuário Specification

## Problem Statement

Atualmente, o cadastro de novos usuários exige apenas que a senha contenha entre 8 e 72 caracteres com ao menos uma letra e um número. Essa regra permite senhas excessivamente curtas, previsíveis, triviais (como senhas comuns ou senhas idênticas ao login do usuário) ou que contêm espaços, reduzindo a segurança da aplicação contra ataques de força bruta, dicionário e credential stuffing.

## Goals

- [ ] Exigir que a senha no cadastro possua entre 10 e 128 caracteres.
- [ ] Exigir que a senha contenha pelo menos 1 letra maiúscula, 1 letra minúscula, 1 número e 1 caractere especial.
- [ ] Bloquear senhas contendo espaços em qualquer posição.
- [ ] Bloquear senhas idênticas ao e-mail/login ou ao nome informado no cadastro.
- [ ] Bloquear senhas presentes em uma lista conhecida de senhas comuns/fracas.
- [ ] Aplicar todas as validações no backend (via `RegisterDto`) retornando HTTP 400 Bad Request com mensagens explicativas.
- [ ] Fornecer feedback visual em tempo real e validação defensiva no formulário da tela de cadastro (`/register`).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Forçar redefinição imediata de senha de usuários já existentes | O escopo restringe-se ao fluxo de cadastro de novos usuários |
| Integração com APIs externas de vazamento (ex: HaveIBeenPwned k-anonymity API) | Mantém a validação offline, determinística e sem dependência externa ou latência de rede |
| Fluxo de autenticação multifator (MFA/2FA) | Funcionalidade separada que requer arquitetura própria |
| Alteração nas regras de login (`LoginDto`) | Usuários previamente cadastrados devem continuar conseguindo logar sem bloqueio retroativo |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Definição de usuário/login para comparação | Comparação case-insensitive com o e-mail completo (`email`), com o nome de usuário do e-mail (parte anterior ao `@`), e com o nome completo (`name`) | Impede senhas óbvias baseadas no e-mail ou nome cadastrado | y |
| Definição de caractere especial | Qualquer caractere diferente de letras (`a-z`, `A-Z`) e números (`0-9`), incluindo símbolos e pontuações | Padrão da indústria e de segurança que aceita símbolos ASCII (`!@#$%^&*()_+-=[]{}|;':",.<>/?~`) e Unicode | y |
| Lista de senhas comuns | Lista estática de senhas fracas e recorrentes (top senhas conhecidas em vazamentos) verificadas de forma case-insensitive | Garante performance imediata no backend e frontend sem dependência externa | y |
| Experiência visual no frontend | Indicadores dinâmicos dos requisitos de senha e bloqueio de envio com mensagem de alerta caso algum critério não seja atendido | Ajuda o usuário a criar uma senha válida sem frustração | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Validação de Senha Forte no Backend (RegisterDto) ⭐ MVP

**User Story**: As a sistema de gestão financeira familiar, I want validar no backend todos os critérios de complexidade da senha durante o cadastro so that contas só possam ser criadas com senhas robustas e resistentes a ataques.

**Why P1**: O backend é a fonte de autoridade de segurança; nenhuma conta fraca pode ser criada diretamente via API.

**Acceptance Criteria**:

1. IF a senha tiver menos de 10 caracteres ou mais de 128 caracteres THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
2. IF a senha não contiver ao menos uma letra maiúscula THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
3. IF a senha não contiver ao menos uma letra minúscula THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
4. IF a senha não contiver ao menos um número THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
5. IF a senha não contiver ao menos um caractere especial THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
6. IF a senha contiver qualquer espaço THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
7. IF a senha for igual ao e-mail, ao usuário do e-mail ou ao nome do cadastro THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
8. IF a senha constar na lista de senhas comuns THEN the backend SHALL rejeitar a requisição com status 400 e erro de validação.
9. WHEN todos os critérios de senha forem atendidos e os dados estiverem válidos THEN the backend SHALL processar o registro com status 201 Created.

**Independent Test**: Executar requisições no endpoint de registro ou validação no DTO com senhas violando cada uma das regras e verificar rejeição 400 específica; enviar senha válida e receber sucesso 201.

---

### P2: Experiência e Validação no Frontend (/register)

**User Story**: As a novo usuário se cadastrando, I want ver claramente os requisitos da senha e o feedback em tempo real so that eu saiba exatamente como preencher uma senha segura antes de submeter o formulário.

**Why P2**: Melhora a usabilidade, reduz erros de submissão e orienta o usuário de forma transparente.

**Acceptance Criteria**:

1. WHILE o usuário digita a senha na tela `/register` the frontend SHALL exibir dinamicamente o status de atendimento de cada requisito da senha.
2. IF a senha informada não atender a algum dos critérios obrigatórios THEN the frontend SHALL impedir a submissão e exibir uma mensagem explicativa.
3. WHEN todos os critérios de senha forem atendidos e a confirmação coincidir THEN the frontend SHALL permitir a submissão do formulário de cadastro.

**Independent Test**: Acessar a tela `/register`, digitar senhas parciais e observar os itens da lista mudando para atendido/pendente; tentar enviar uma senha inválida e verificar bloqueio com alerta visual.

---

## Edge Cases

- IF a senha contiver espaços no início, meio ou fim (incluindo espaços que seriam afetados por trim) THEN the backend SHALL rejeitar com status 400 informando que espaços não são permitidos.
- IF o e-mail contiver letras maiúsculas e a senha for igual em minúsculas (ou vice-versa) THEN the backend SHALL rejeitar considerando a comparação case-insensitive.
- IF a senha estiver na lista de senhas comuns com variações de maiúsculas/minúsculas THEN the backend SHALL rejeitar considerando a comparação case-insensitive.
- IF o campo nome possuir menos de 10 caracteres e for testado contra uma senha válida de 10 caracteres diferente THEN the backend SHALL aceitar normalmente.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PWD-01 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-02 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-03 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-04 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-05 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-06 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-07 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-08 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-09 | P1: Validação de Senha Forte no Backend (RegisterDto) | Tasks | Verified |
| PWD-10 | P2: Experiência e Validação no Frontend (/register) | Tasks | Pending |
| PWD-11 | P2: Experiência e Validação no Frontend (/register) | Tasks | Pending |
| PWD-12 | P2: Experiência e Validação no Frontend (/register) | Tasks | Pending |

**ID format:** `PWD-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 12 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] 100% dos testes unitários de validação de senha do backend aprovados cobrindo cada um dos 8 critérios.
- [ ] Nenhuma senha com <10 chars, sem maiúscula, sem minúscula, sem número, sem caractere especial, com espaços, igual ao login ou comum é aceita no registro.
- [ ] O frontend fornece feedback em tempo real dos requisitos com visual limpo e moderno.
