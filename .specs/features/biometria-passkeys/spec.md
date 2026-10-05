# Biometria e Passkeys no PWA Specification

## Problem Statement

Usuários que utilizam o aplicativo financeiro instalado em dispositivos móveis (smartphones Android e iPhones com PWA) precisam digitar e-mail e senha complexa a cada autenticação, tornando a experiência lenta e suscetível à visualização de credenciais em público. Esta funcionalidade implementa autenticação biométrica nativa (WebAuthn / Passkeys / FIDO2) diretamente no PWA instalado, permitindo login instantâneo com impressão digital ou reconhecimento facial sem comprometer a privacidade ou a segurança criptográfica.

## Goals

- [ ] Permitir o registro e vinculação da biometria de hardware do celular à conta do usuário autenticado.
- [ ] Permitir login biométrico instantâneo na tela de entrada do aplicativo via leitor nativo do dispositivo.
- [ ] Preservar a segurança criptográfica com chaves assimétricas de hardware, prevenção a replay attacks e fallback permanente para senha.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Armazenamento de biometria física no servidor | Violação de privacidade e especificação FIDO2; a biometria nunca sai do chip do aparelho |
| Bloqueio do login tradicional por e-mail e senha | Acesso por senha permanece como fallback obrigatório para novos dispositivos ou falhas de hardware |
| Sincronização em nuvem proprietária de chaves privadas | Chaves privadas são gerenciadas exclusivamente pelo enclave de segurança do sistema operacional (Google Password Manager / Apple iCloud Keychain) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Modalidade de login biométrico na tela inicial | Login por Passkey em um clique sem exigir e-mail prévio | Proporciona UX moderna idêntica a apps bancários nativos | y |
| Validade do desafio criptográfico (challenge) | Desafio temporário expira em no máximo 5 minutos | Previne ataques de timing e esgotamento de sessão | y |
| Tolerância a dispositivos múltiplos por usuário | Suporte a cadastro de múltiplos celulares/passkeys por usuário | Permite ao usuário utilizar celular pessoal, tablet ou notebook | y |
| Estratégia de armazenamento de challenges temporários | Tabela transitória `AuthChallenge` no PostgreSQL com limpeza periódica | Mantém resiliência e integridade em múltiplos contêineres sem exigir Redis | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Registro e Autenticação Biométrica no Dispositivo ⭐ MVP

**User Story**: As a usuário com o app instalado no celular, I want registrar e utilizar minha biometria (impressão digital ou Face ID) so that eu possa entrar na minha conta financeira instantaneamente com segurança.

**Why P1**: Núcleo da funcionalidade que viabiliza o login nativo seguro sem senha no PWA móvel.

**Acceptance Criteria**:

1. WHERE o dispositivo suportar autenticador de plataforma, the PWA SHALL exibir o botão de cadastro de biometria nas configurações de segurança do usuário.
2. WHEN um usuário autenticado solicitar o registro de biometria, the system SHALL gerar um desafio criptográfico único com validade de 5 minutos.
3. WHEN o usuário confirmar a biometria no celular e enviar a resposta assinada, the system SHALL validar o atestado FIDO2 e armazenar a chave pública na tabela de credenciais.
4. WHERE existirem passkeys cadastradas e suporte de hardware, the PWA SHALL exibir o botão "Entrar com Biometria" na tela de login.
5. WHEN o usuário autenticar via biometria com assinatura válida, the system SHALL emitir os tokens de acesso JWT da sessão e atualizar o contador de uso.
6. IF a assinatura for inválida ou o desafio expirar, THEN the system SHALL recusar o login retornando HTTP 401 com mensagem neutra.
7. IF o contador da credencial for menor ou igual ao contador anterior, THEN the system SHALL recusar a autenticação por suspeita de replay attack.
8. The system SHALL manter o formulário de login por e-mail e senha acessível como alternativa contínua de fallback.

**Independent Test**: Usuário autentica com e-mail/senha, ativa a biometria em seu perfil, realiza logout e efetua login com sucesso utilizando a biometria do dispositivo.

---

### P2: Gerenciamento e Revogação de Dispositivos Biométricos

**User Story**: As a usuário, I want visualizar a lista de aparelhos com biometria cadastrada e revogar acessos antigos so that eu mantenha o controle de quais dispositivos podem acessar minha conta.

**Why P2**: Fundamental para segurança caso um dispositivo seja perdido, vendido ou trocado.

**Acceptance Criteria**:

1. WHEN o usuário acessar a seção de segurança da conta, the system SHALL listar todos os dispositivos biométricos cadastrados com nome, data de cadastro e último uso.
2. WHEN o usuário solicitar a revogação de um dispositivo biométrico, the system SHALL excluir permanentemente a chave pública correspondente do banco de dados.
3. IF o dispositivo revogado tentar autenticar posteriormente, THEN the system SHALL rejeitar a tentativa com HTTP 401.

**Independent Test**: Cadastrar uma biometria, excluí-la na tela de segurança e verificar que o login por biometria naquele dispositivo é prontamente recusado.

---

## Edge Cases

- IF o navegador ou celular não tiver suporte a autenticador de plataforma (WebAuthn), THEN the PWA SHALL ocultar os controles de biometria e manter o fluxo tradicional de e-mail e senha sem erros no console.
- IF o usuário cancelar o prompt biométrico no sistema operacional, THEN the PWA SHALL tratar o cancelamento graciosamente sem recarregar a tela ou exibir alerta crítico.
- IF a conexão com a internet falhar durante a validação da credencial, THEN the PWA SHALL exibir mensagem amigável solicitando nova tentativa.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| BIO-01 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-02 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-03 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-04 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-05 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-06 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-07 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-08 | P1: Registro e Autenticação Biométrica no Dispositivo | In Tasks | Implementing |
| BIO-09 | P2: Gerenciamento e Revogação de Dispositivos Biométricos | In Tasks | Implementing |
| BIO-10 | P2: Gerenciamento e Revogação de Dispositivos Biométricos | In Tasks | Implementing |
| BIO-11 | P2: Gerenciamento e Revogação de Dispositivos Biométricos | In Tasks | Implementing |

**Coverage:** 11 total, 11 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] Usuário consegue registrar a biometria do seu celular em menos de 10 segundos.
- [ ] Login biométrico é completado com emissão de token JWT sem exigir digitação de senha.
- [ ] Zero vulnerabilidades de replay attacks ou autenticação forjada em credenciais biométricas.
- [ ] 100% dos testes unitários e de integração aprovados no backend e build limpo no frontend.
