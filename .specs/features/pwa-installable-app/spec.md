# PWA (Progressive Web App) Specification

## Problem Statement

Atualmente, o sistema de Finanças Familiar funciona apenas como aplicação web aberta no navegador. O usuário precisa de uma experiência nativa de aplicativo no celular e desktop, com a possibilidade de instalar o app diretamente na tela inicial ("Adicionar à tela de início" / "Instalar App"), execução em janela dedicada sem barras de navegação do browser (modo standalone), ícones com resolução adequada e suporte a funcionamento resiliente com fallback offline via Service Worker.

## Goals

- [ ] Permitir a instalação do sistema como Progressive Web App (PWA) em dispositivos móveis (Android, iOS) e desktops (Chrome, Edge).
- [ ] Fornecer manifesto PWA completo (`manifest.json`) com tema escuro (`#020617`), ícones em múltiplos formatos (192x192, 512x512, maskable e apple-touch-icon) e metadados de standalone.
- [ ] Registrar Service Worker para gerenciamento de cache de assets estáticos e tela de fallback amigável quando o usuário estiver offline.
- [ ] Exibir botão e banner intuitivo de "Instalar Aplicativo" integrado à interface (capturando evento `beforeinstallprompt` no Android/Desktop e instruções de instalação no iOS).

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature     | Reason         |
| ----------- | -------------- |
| Notificações Push via WebPush / FCM | Requer infraestrutura de mensageria dedicada e chaves VAPID no backend, devendo ser implementado em feature futura |
| Sincronização em segundo plano (Background Sync) de transações offline | Requer fila transacional local complexa (IndexedDB + resolução de conflitos contábeis) fora do escopo de instalação PWA |
| Publicação nas lojas Google Play Store (TWA) ou Apple App Store | O escopo restringe-se a PWA nativo direto via navegador (Web Installable) |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default  | Rationale | Confirmed? |
| --------------------- | --------------- | --------- | ---------- |
| Estratégia de Service Worker | Implementação nativa limpa em `public/sw.js` com registro via componente React no App Router | Evita incompatibilidades de compilação do Next 14 e `output: 'standalone'` no Docker, garantindo controle total sobre cache e ciclo de vida | y |
| Política de cache para chamadas à API | Network-First com bypass direto sem armazenamento de mutações | Dados financeiros exigem consistência estrita e não podem exibir saldos desatualizados ou mascarar falhas | y |
| Posicionamento do prompt de instalação | Botão/Aviso elegante na barra de navegação/menu lateral e banner flutuante descartável | Garante alta visibilidade sem poluir a visão das informações financeiras | y |
| Cores e tema do manifesto | Fundo `#020617` (Slate 950) e tema escuro consistente com o design system | Mantém fidelidade visual à identidade atual do aplicativo | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Manifesto Web App e Ícones Adaptativos ⭐ MVP

**User Story**: As an usuário do sistema, I want acessar a aplicação e ter os metadados de PWA e ícones carregados so that o navegador reconheça o site como um aplicativo instalável com identidade visual consistente.

**Why P1**: É a fundação técnica mandatória exigida pelos navegadores para habilitar o critério de instalabilidade (PWA Installability Criteria).

**Acceptance Criteria**:

1. The system SHALL disponibilizar o arquivo `manifest.json` com propriedades `name`, `short_name`, `start_url`, `display: standalone`, `theme_color: #020617` e `background_color: #020617`.
2. The system SHALL fornecer ícones nos formatos 192x192 e 512x512 (`any`), 512x512 (`maskable`) e 180x180 (`apple-touch-icon`).
3. The system SHALL configurar no `layout.tsx` os metadados e tags para iOS (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` e `apple-mobile-web-app-title`).
4. WHEN o navegador requisitar `/manifest.json` THEN the system SHALL responder com status 200 e content-type `application/manifest+json` ou `application/json`.

**Independent Test**: Acessar `http://localhost:3000/manifest.json` e verificar o retorno correto do JSON com ícones acessíveis via browser.

---

### P2: Service Worker e Fallback Offline

**User Story**: As an usuário, I want que o aplicativo registre um Service Worker com cache de assets estáticos e página offline so that a aplicação carregue rapidamente e apresente uma mensagem clara quando não houver conexão com a internet.

**Why P2**: O Service Worker com evento fetch ativo é requisito mandatório do Chromium para habilitar o prompt nativo de instalação, além de prevenir a tela padrão de erro do navegador em quedas de rede.

**Acceptance Criteria**:

1. WHEN a aplicação é carregada no navegador THEN the system SHALL registrar o Service Worker `/sw.js` com escopo raiz `/`.
2. WHILE o usuário estiver sem conexão de rede, WHEN navegar para uma página não armazenada em cache THEN the system SHALL exibir uma tela amigável de fallback offline.
3. The system SHALL utilizar estratégia Network-First com fallback para cache em requisições de navegação e Stale-While-Revalidate/Cache-First para assets estáticos (`/icons/`, `logo.png`).
4. IF a requisição for para endpoints da API (`/api/` ou backend de transações) THEN the system SHALL executar Network-Only sem cachear respostas financeiras.

**Independent Test**: Inspecionar aba Application > Service Workers no Chrome DevTools, verificar status `Activated and running` e simular modo Offline no navegador para verificar a página amigável de offline.

---

### P3: Banner e Botão de Instalação no App

**User Story**: As an usuário, I want visualizar um botão ou banner de instalação diretamente na interface so that eu possa instalar o aplicativo com um único clique ou receber instruções claras se estiver no iPhone/iPad.

**Why P3**: Melhora consideravelmente a taxa de conversão e conveniência para usuários que não sabem localizar a opção nos menus do navegador.

**Acceptance Criteria**:

1. WHEN o navegador disparar o evento `beforeinstallprompt` THEN the system SHALL capturar o evento e exibir o botão/banner "Instalar Aplicativo".
2. WHEN o usuário clicar no botão "Instalar Aplicativo" THEN the system SHALL invocar o prompt nativo de instalação e ocultar o botão após a resposta do usuário.
3. WHERE o dispositivo for identificado como iOS Safari THEN the system SHALL exibir opção de ajuda explicando o passo a passo ("Compartilhar" -> "Adicionar à Tela de Início").
4. WHILE a aplicação estiver sendo executada em modo `standalone` (já instalada) the system SHALL ocultar qualquer botão ou banner de instalação.

**Independent Test**: Simular visualização em navegador desktop/mobile, verificar aparição do botão de instalação quando disponível e ausência quando em modo standalone.

---

## Edge Cases

- IF o navegador não suportar Service Worker THEN the system SHALL carregar normalmente a aplicação sem gerar erros no console.
- IF o usuário rejeitar a instalação no prompt nativo THEN the system SHALL fechar o banner e registrar a recusa sem bloquear o uso da aplicação.
- IF a conexão cair durante o uso THEN the system SHALL manter os assets visuais já carregados e exibir aviso de offline.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story       | Phase  | Status  |
| -------------- | ----------- | ------ | ------- |
| PWA-01         | P1: Manifesto Web App e Ícones Adaptativos | Design | Pending |
| PWA-02         | P1: Manifesto Web App e Ícones Adaptativos | Design | Pending |
| PWA-03         | P1: Manifesto Web App e Ícones Adaptativos | Design | Pending |
| PWA-04         | P1: Manifesto Web App e Ícones Adaptativos | Design | Pending |
| PWA-05         | P2: Service Worker e Fallback Offline | Design | Pending |
| PWA-06         | P2: Service Worker e Fallback Offline | Design | Pending |
| PWA-07         | P2: Service Worker e Fallback Offline | Design | Pending |
| PWA-08         | P2: Service Worker e Fallback Offline | Design | Pending |
| PWA-09         | P3: Banner e Botão de Instalação no App | Design | Pending |
| PWA-10         | P3: Banner e Botão de Instalação no App | Design | Pending |
| PWA-11         | P3: Banner e Botão de Instalação no App | Design | Pending |
| PWA-12         | P3: Banner e Botão de Instalação no App | Design | Pending |

---

## Success Criteria

How we know the feature is successful:

- [ ] Auditoria do Lighthouse PWA ou verificação de critérios de PWA no Chrome DevTools com status "Installable".
- [ ] Ícones de alta resolução renderizados corretamente na tela inicial do dispositivo sem distorções.
- [ ] Service worker ativo e registrado no escopo `/` sem erros de runtime.
- [ ] Botão de instalação funcional em navegadores compatíveis e guia para iOS.
