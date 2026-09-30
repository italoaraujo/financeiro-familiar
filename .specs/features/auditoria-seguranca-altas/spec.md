# Correção de Vulnerabilidades Altas de Segurança Specification

## Problem Statement

A auditoria de segurança identificou cinco vulnerabilidades de severidade Alta no sistema:
1. Injeção de Fórmulas em exportação CSV (`ReportsService.exportCsv`), permitindo que dados fornecidos por usuários executem comandos de planilha ao serem abertos em Excel/Calc.
2. Negação de Serviço (DoS) e exaustão de recursos por criação irrestrita de parcelas de transações (`CreateTransactionDto` sem teto `@Max`), possibilitando travamento do banco e terminação do processo Node.js por Out-Of-Memory.
3. Ausência de Rate Limiting nas rotas críticas de autenticação (`/auth/login` e `/auth/register`), deixando a aplicação vulnerável a ataques massivos de força bruta e enumeração de credenciais.
4. Configuração insegura de CORS (`origin: '*'` com `credentials: true`), gerando permissividade cruzada perigosa em navegadores.
5. BOLA na associação de contas pessoais a metas familiares (`GoalsService.create`), permitindo que membros de uma família vinculem contas bancárias pessoais de terceiros alheios à família.

## Goals

- [x] Sanitizar todos os campos textuais exportados em relatórios CSV prefixando caracteres de controle de fórmula (`=`, `+`, `-`, `@`, `\t`, `\r`) com apóstrofo `'`.
- [x] Limitar o parcelamento de transações no DTO e no serviço a no máximo 72 parcelas.
- [x] Configurar o `@nestjs/throttler` globalmente com limitação estrita de 5 requisições por minuto para endpoints de login e cadastro.
- [x] Restringir o CORS para origens permitidas baseadas em variável de ambiente (`ALLOWED_ORIGINS` / `FRONTEND_URL`), eliminando o curinga irrestrito `*`.
- [x] Exigir que metas familiares sejam vinculadas estritamente a contas pertencentes à própria família, e metas pessoais a contas pessoais do próprio usuário.
- [x] Garantir cobertura de testes automatizados para todas as proteções implementadas.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Rate limiting com Redis distribuído | A arquitetura atual é de nó único, sendo o Throttler local em memória perfeitamente aderente |
| Alteração no formato de saída ou colunas do arquivo CSV | Apenas a sanitização de células de texto é o foco da proteção |
| Suporte a parcelamentos superiores a 72 meses (financiamentos imobiliários) | O escopo do sistema de cartões e despesas familiares é de até 72 vezes |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Caracteres sanitizados em CSV | Prefixar com apóstrofo `'` qualquer texto iniciado por `=`, `+`, `-`, `@`, `\t` ou `\r` | Desarma a execução de fórmulas em planilhas sem corromper o texto visível | y |
| Limite máximo de parcelas | 72 vezes | Suficiente para compras a prazo reais e impede exaustão de conexões transacionais | y |
| Limite de taxa para autenticação | 5 requisições por minuto nos endpoints sensíveis e 60 por minuto global | Equilibra usabilidade legítima contra ataques automatizados de força bruta | y |
| Origens padrão para CORS | `http://localhost:3000` e `http://localhost:3001` quando variável não for especificada | Garante funcionamento local em desenvolvimento enquanto bloqueia origens arbitrárias | y |
| Vínculo de conta em meta familiar | A conta deve obrigatoriamente possuir `account.familyId === dto.familyId` | Impede que contas pessoais externas sejam manipuladas por contexto familiar | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Sanitização contra Injeção de Fórmulas em CSV (SECH-01) ⭐ MVP

**User Story**: Como usuário ou gestor financeiro familiar, quero exportar meus relatórios em CSV com segurança para que planilhas eletrônicas não executem comandos maliciosos contidos em descrições ou notas de lançamentos.

**Why P1**: Neutraliza o risco de execução remota de código ou exfiltração de dados locais na abertura de arquivos CSV.

**Acceptance Criteria** (each line is one EARS pattern):

1. IF qualquer campo textual exportado no CSV iniciar com `=`, `+`, `-`, `@`, `\t` ou `\r` THEN the system SHALL prefixar o valor com apóstrofo `'`. <!-- unwanted-behavior -->
2. WHEN a exportação de CSV for solicitada para transações com descrições normais THEN the system SHALL manter os textos originais intactos e gerar o CSV válido. <!-- event-driven -->

**Independent Test**: Executar exportação de CSV com lançamentos contendo `=cmd|'/C calc'!A0` e `+500` e verificar que os campos são exportados desarmados como `'=cmd|'/C calc'!A0` e `'+500`.

---

### P2: Proteção contra Exaustão de Recursos por Parcelamento (SECH-02) ⭐ MVP

**User Story**: Como operador do sistema, quero que o número de parcelas de uma transação seja limitado para que requisições abusivas não esgotem o pool de conexões do banco de dados nem derrubem o servidor.

**Why P2**: Elimina vulnerabilidade de negação de serviço e Out-Of-Memory.

**Acceptance Criteria**:

1. IF uma requisição de criação de transação fornecer `totalInstallments` maior que 72 THEN the system SHALL rejeitar a operação com erro de validação HTTP 400 BadRequestException. <!-- unwanted-behavior -->
2. WHEN uma transação for criada com até 72 parcelas válidas THEN the system SHALL criar as parcelas normalmente respeitando os limites da aplicação. <!-- event-driven -->

**Independent Test**: Submeter POST `/transactions` com `totalInstallments: 73` e validar retorno de HTTP 400 BadRequestException.

---

### P3: Limitação de Taxa (Rate Limiting) em Rotas de Autenticação (SECH-03) ⭐ MVP

**User Story**: Como gestor de segurança, quero que tentativas de login e registro sejam limitadas por tempo para que nenhum atacante possa efetuar ataques de força bruta contra senhas de usuários.

**Why P3**: Protege as credenciais dos usuários contra adivinhação massiva.

**Acceptance Criteria**:

1. IF o número de requisições a rotas de autenticação exceder 5 tentativas por minuto por cliente THEN the system SHALL responder com HTTP 429 Too Many Requests. <!-- unwanted-behavior -->
2. WHEN requisições de autenticação forem realizadas dentro dos limites de taxa definidos THEN the system SHALL processar as solicitações normalmente. <!-- event-driven -->

**Independent Test**: Executar sucessivas tentativas de autenticação e verificar que o limite dispara HTTP 429 após atingir o teto por minuto.

---

### P4: Restrição Segura de Origens CORS (SECH-04) ⭐ MVP

**User Story**: Como usuário, quero que apenas aplicações autorizadas possam interagir com a API com credenciais para evitar vazamento cruzado de dados entre domínios.

**Why P4**: Elimina o risco de abuso de credenciais através de origens arbitrárias.

**Acceptance Criteria**:

1. The system SHALL não permitir a combinação de curinga `origin: '*'` com `credentials: true` na configuração de CORS. <!-- ubiquitous -->
2. WHEN uma requisição for originada de um domínio listado em `ALLOWED_ORIGINS` THEN the system SHALL responder com os cabeçalhos de CORS autorizados. <!-- event-driven -->

**Independent Test**: Verificar configuração de CORS em `main.ts` garantindo resolução por lista de origens seguras sem curinga.

---

### P5: Proteção BOLA em Vínculo de Contas a Metas Familiares (SECH-05) ⭐ MVP

**User Story**: Como correntista, quero que minha conta bancária pessoal nunca possa ser vinculada a metas financeiras de famílias alheias por outros membros do sistema.

**Why P5**: Impede a vinculação e manipulação indevida de contas pessoais fora do escopo legítimo.

**Acceptance Criteria**:

1. IF uma meta familiar (`familyId !== null`) for criada utilizando uma conta que não pertença a essa família (`account.familyId !== dto.familyId`) THEN the system SHALL lançar HTTP 403 Forbidden. <!-- unwanted-behavior -->
2. IF uma meta pessoal (`familyId === null`) for criada utilizando uma conta que não pertença exclusivamente ao usuário autenticado (`account.userId !== userId || account.familyId !== null`) THEN the system SHALL lançar HTTP 403 Forbidden. <!-- unwanted-behavior -->
3. WHEN uma meta for criada associada a uma conta legítima do mesmo escopo THEN the system SHALL criar a meta com sucesso. <!-- event-driven -->

**Independent Test**: Tentar criar meta familiar associando UUID de conta pessoal e comprovar o bloqueio com HTTP 403 Forbidden.

---

## Edge Cases

- IF um campo no CSV for nulo ou indefinido THEN the system SHALL retornar uma string vazia sem lançar exceções.
- IF a variável `ALLOWED_ORIGINS` contiver espaços entre as vírgulas THEN the system SHALL aplicar trim em cada origem antes de configurar o CORS.
- IF `totalInstallments` for omitido THEN the system SHALL adotar 1 como valor padrão sem acionar erro de validação.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SECH-01 | P1: Sanitização contra Injeção de Fórmulas em CSV (SECH-01) | Tasks | Verified |
| SECH-02 | P2: Proteção contra Exaustão de Recursos por Parcelamento (SECH-02) | Tasks | Verified |
| SECH-03 | P3: Limitação de Taxa (Rate Limiting) em Rotas de Autenticação (SECH-03) | Tasks | Pending |
| SECH-04 | P4: Restrição Segura de Origens CORS (SECH-04) | Tasks | Pending |
| SECH-05 | P5: Proteção BOLA em Vínculo de Contas a Metas Familiares (SECH-05) | Tasks | Pending |

**Coverage:** 5 total, 5 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Todas as 5 vulnerabilidades altas são mitigadas e verificadas com testes automatizados.
- [ ] O CSV exportado tem fórmulas desarmadas sem perda de legibilidade.
- [ ] Parcelamentos > 72 vezes são barrados antes da abertura de transações no banco.
- [ ] Rate limiting ativo em rotas críticas com HTTP 429 em abusos.
- [ ] CORS sem curinga e metas familiares restritas a contas familiares.
- [ ] 100% dos testes da suíte passam sem regressões.
