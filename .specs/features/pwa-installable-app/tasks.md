# PWA (Progressive Web App) Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/pwa-installable-app/design.md`
**Status**: Draft

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| PWA Assets | unit | Validação de dimensões e formato dos ícones (192, 512, maskable, apple-touch) | `frontend/public/icons/*.png` | `python3 -c "from PIL import Image; assert Image.open('frontend/public/icons/icon-192x192.png').size == (192, 192); assert Image.open('frontend/public/icons/icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/maskable-icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/apple-touch-icon.png').size == (180, 180); print('Icons OK')"` |
| Web Manifest | unit | Validação estrutural de campos obrigatórios e ícones no manifest.json | `frontend/public/manifest.json` | `node -e "const m = require('./frontend/public/manifest.json'); if(!m.name || !m.icons || m.icons.length < 3 || m.display !== 'standalone') process.exit(1); console.log('Manifest OK');"` |
| Offline Fallback | unit | Verificação de integridade da página estática de offline | `frontend/public/offline.html` | `test -f frontend/public/offline.html && grep -q "Tentar novamente" frontend/public/offline.html` |
| Service Worker | unit | Validação sintática do sw.js e presença de regras de cache | `frontend/public/sw.js` | `node --check frontend/public/sw.js && grep -q "CACHE_NAME" frontend/public/sw.js && grep -q "/offline.html" frontend/public/sw.js` |
| Frontend Components | unit | Verificação de compilação Next.js do App Router e tipagem TypeScript | `frontend/src/app/layout.tsx` | `npm --prefix frontend run build` |

---

## Gate Check Commands

> Generated from codebase - confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após geração de assets, manifesto ou scripts de service worker | `node --check frontend/public/sw.js` |
| Build | Após criação ou edição de componentes React e layouts | `npm --prefix frontend run build` |
| Full | Ao concluir todas as tarefas da feature | `npm --prefix frontend run build` |

---

## Execution Plan

Phases are ordered and run sequentially - each phase completes before the next begins, and tasks within a phase execute in order.

### Phase 1: Assets e Manifesto PWA

Geração dos ícones em alta fidelidade e estruturação do manifesto web app para compatibilidade com Chrome, Edge, Safari e Android.

```
T1 → T2
```

### Phase 2: Service Worker e Resiliência Offline

Desenvolvimento da tela de fallback offline e do Service Worker com ciclo de vida seguro e políticas de cache para assets estáticos.

```
T3 → T4
```

### Phase 3: Integração no App Shell e Experiência de Instalação

Registro do Service Worker no ciclo de vida do cliente, injeção de metadados PWA/iOS no RootLayout e disponibilização do componente de prompt de instalação e instruções para iOS.

```
T5 → T6 → T7
```

---

## Task Breakdown

### Phase 1: Assets e Manifesto PWA

### T1: Geração de Ícones PWA e Favicons Adaptativos [DONE]

**What**: Gerar ícones PWA a partir de `frontend/public/logo.png` com proporções quadradas perfeitas, fundo preenchido ou transparente conforme o padrão, incluindo ícone padrão 192x192, ícone de alta resolução 512x512, ícone com margem de segurança de 20% para Android (`maskable` 512x512) e `apple-touch-icon.png` 180x180 para dispositivos iOS.
**Where**: `frontend/public/icons/icon-512x512.png`
**Depends on**: none
**Requirement**: PWA-02
**Done when**:
- [x] Diretório `frontend/public/icons` criado
- [x] Ícones `icon-192x192.png`, `icon-512x512.png`, `maskable-icon-512x512.png` e `apple-touch-icon.png` gerados
- [x] Proporções quadradas exatas validadas via script
**Tests**: `python3 -c "from PIL import Image; assert Image.open('frontend/public/icons/icon-192x192.png').size == (192, 192); assert Image.open('frontend/public/icons/icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/maskable-icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/apple-touch-icon.png').size == (180, 180); print('Icons OK')"`
**Gate**: `python3 -c "from PIL import Image; assert Image.open('frontend/public/icons/icon-192x192.png').size == (192, 192); assert Image.open('frontend/public/icons/icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/maskable-icon-512x512.png').size == (512, 512); assert Image.open('frontend/public/icons/apple-touch-icon.png').size == (180, 180); print('Icons OK')"`

### T2: Criação do Manifesto Web App manifest.json

**What**: Criar o arquivo `frontend/public/manifest.json` com especificações completas de PWA: `name`, `short_name`, `description`, `start_url`, `display: standalone`, `theme_color: #020617`, `background_color: #020617`, `orientation: portrait-primary` e lista de ícones gerados na tarefa T1.
**Where**: `frontend/public/manifest.json`
**Depends on**: T1
**Requirement**: PWA-01, PWA-04
**Done when**:
- [ ] Arquivo `frontend/public/manifest.json` criado com todas as propriedades do padrão W3C Web App Manifest
- [ ] Links de ícones apontam corretamente para `/icons/`
- [ ] Propriedades validadas com sucesso via script Node.js
**Tests**: `node -e "const m = require('./frontend/public/manifest.json'); if(!m.name || !m.icons || m.icons.length < 3 || m.display !== 'standalone') process.exit(1); console.log('Manifest OK');"`
**Gate**: `node -e "const m = require('./frontend/public/manifest.json'); if(!m.name || !m.icons || m.icons.length < 3 || m.display !== 'standalone') process.exit(1); console.log('Manifest OK');"`

---

### Phase 2: Service Worker e Resiliência Offline

### T3: Criação da Página Estática de Fallback Offline

**What**: Criar o arquivo `frontend/public/offline.html` estilizado em tema escuro (Slate 950) com mensagem amigável em português avisando que o dispositivo está desconectado da internet, além de botão para tentar reconectar.
**Where**: `frontend/public/offline.html`
**Depends on**: none
**Requirement**: PWA-06
**Done when**:
- [ ] Arquivo `frontend/public/offline.html` criado com layout responsivo e cores Slate escuras
- [ ] Mensagem de orientação offline e botão "Tentar novamente" implementados
**Tests**: `test -f frontend/public/offline.html && grep -q "Tentar novamente" frontend/public/offline.html`
**Gate**: `test -f frontend/public/offline.html && grep -q "Tentar novamente" frontend/public/offline.html`

### T4: Implementação do Service Worker com Políticas de Cache Seguras

**What**: Criar `frontend/public/sw.js` com gerenciamento de ciclo de vida (`install`, `activate`, `fetch`), pré-cache de `/offline.html` e assets de ícones, estratégia Network-First com fallback para offline em navegação, e bypass estrito (Network-Only) para endpoints de API e mutações financeiras.
**Where**: `frontend/public/sw.js`
**Depends on**: T3
**Requirement**: PWA-05, PWA-07, PWA-08
**Done when**:
- [ ] `sw.js` criado com `install` realizando precache seguro
- [ ] `activate` limpando versões antigas do cache
- [ ] `fetch` interceptando navegações com fallback para `/offline.html` e ignorando chamadas de API
- [ ] Sintaxe verificada com `node --check`
**Tests**: `node --check frontend/public/sw.js && grep -q "CACHE_NAME" frontend/public/sw.js && grep -q "/offline.html" frontend/public/sw.js`
**Gate**: `node --check frontend/public/sw.js && grep -q "CACHE_NAME" frontend/public/sw.js && grep -q "/offline.html" frontend/public/sw.js`

---

### Phase 3: Integração no App Shell e Experiência de Instalação

### T5: Atualização de Metadados e Viewport no RootLayout

**What**: Atualizar `frontend/src/app/layout.tsx` adicionando link do manifesto `/manifest.json`, metadados de suporte ao iOS (`appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Finanças' }`), cores de tema no viewport e tags de ícones compatíveis com navegadores móveis.
**Where**: `frontend/src/app/layout.tsx`
**Depends on**: none
**Requirement**: PWA-01, PWA-03
**Done when**:
- [ ] `manifest: '/manifest.json'` configurado nos metadados do Next.js
- [ ] Propriedades `themeColor` e `colorScheme: 'dark'` configuradas no viewport
- [ ] Configuração `appleWebApp` adicionada
- [ ] `npm --prefix frontend run build` executado com sucesso
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

### T6: Criação do Componente de Registro do Service Worker

**What**: Criar `frontend/src/components/pwa/ServiceWorkerRegister.tsx` para registrar `/sw.js` em escopo `/` de forma assíncrona após o carregamento inicial da página no navegador, tratando com segurança ambientes de SSR e navegadores sem suporte a Service Worker.
**Where**: `frontend/src/components/pwa/ServiceWorkerRegister.tsx`
**Depends on**: T5
**Requirement**: PWA-05
**Done when**:
- [ ] Componente cliente React criado com registro em `useEffect`
- [ ] Invocado no `RootLayout` sem quebrar SSR
- [ ] Build do Next.js compila com sucesso
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`

### T7: Criação do Componente de Instalação e Ajuda iOS

**What**: Criar `frontend/src/components/pwa/InstallPrompt.tsx` com banner e botão de ação para instalação via evento `beforeinstallprompt`, suporte e instruções modais para dispositivos Apple/iOS Safari, e desativação automática quando o app já estiver rodando em modo `standalone`.
**Where**: `frontend/src/components/pwa/InstallPrompt.tsx`
**Depends on**: T6
**Requirement**: PWA-09, PWA-10, PWA-11, PWA-12
**Done when**:
- [ ] Componente escuta `beforeinstallprompt` e expõe botão de instalação
- [ ] Detecta modo standalone e não exibe prompt desnecessário
- [ ] Modal/Tooltip para iOS Safari implementado
- [ ] Build e testes executados com sucesso
**Tests**: `npm --prefix frontend run build`
**Gate**: `npm --prefix frontend run build`
