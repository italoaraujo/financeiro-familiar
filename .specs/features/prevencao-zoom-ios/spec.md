# Prevenção de Zoom Automático no iPhone (iOS Safari) Specification

## Problem Statement

No iOS (Safari e navegadores baseados no motor WebKit no iPhone), quando o usuário clica ou foca em qualquer elemento de formulário (`<input>`, `<select>`, `<textarea>`) que possua tamanho de fonte (`font-size`) inferior a 16px (1rem), o navegador dispara um zoom automático invasivo ("Focus Zoom") para aumentar o campo.

No aplicativo de finanças familiar, os campos utilizam classes Tailwind como `text-xs` (12px) e `text-sm` (14px). Como ambas são inferiores a 16px em dispositivos móveis, ao tocar em qualquer campo para digitar, a tela do iPhone sofre zoom in automático, deslocando a tela horizontalmente e ocultando cabeçalhos e botões de ação, degradando a experiência do usuário.

## Goals

- [ ] Garantir que em dispositivos móveis (`max-width: 768px`) todos os campos de texto (`input`), caixas de seleção (`select`) e áreas de texto (`textarea`) possuam `font-size: 16px` para impedir o auto-zoom do iOS Safari.
- [ ] Isentar campos não-textuais (`checkbox`, `radio`, `range`, `color`) do aumento forçado de fonte.
- [ ] Aplicar otimização `touch-action: manipulation` para prevenir atrasos de 300ms de toque e duplo toque indesejado em elementos interativos de formulário.
- [ ] Preservar a acessibilidade nativa do viewport (`initialScale: 1`, `maximumScale: 5`) permitindo zoom manual intencional por pinça (WCAG).
- [ ] Validar a integridade da aplicação com build e lint 100% limpos.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| ------- | ------ |
| Desabilitar zoom no viewport com `user-scalable=no` ou `maximumScale: 1` | Viola diretrizes de acessibilidade da W3C/WCAG e é desencorajado pela Apple |
| Alterações no backend ou regras de negócio da API | Trata-se estritamente de uma melhoria de interface e CSS no frontend |
| Refatoração de bibliotecas de terceiros ou componentes não relacionados | O foco é a prevenção de zoom e ergonomia de toque em inputs mobile |

---

## Assumptions & Open Questions

Every ambiguity is resolved or recorded here - nothing is left silently unclear.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Estratégia de resolução de fonte | CSS global via `@media screen and (max-width: 768px)` com `font-size: 16px !important` no `globals.css` | Garante cobertura completa e à prova de regressão para todos os inputs existentes e futuros componentes | y |
| Seletor de exclusão para inputs | `:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"])` | Inputs de seleção, cor e intervalos numéricos não devem ter tipografia alterada | y |
| Acessibilidade do viewport | Manter `maximumScale: 5` no `layout.tsx` | Permite que usuários com deficiência visual realizem zoom manual quando desejarem | y |
| Otimização de clique em mobile | `touch-action: manipulation` em botões, inputs, selects e textareas | Remove latência de toque no iOS e melhora a reatividade em telas sensíveis ao toque | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Prevenção de Auto-Zoom no iOS Safari e Ergonomia de Toque ⭐ MVP

**User Story**: As a usuário de iPhone acessando o sistema de finanças, I want tocar em campos de formulário sem que a página dê zoom automático indesejado so that eu possa preencher dados com fluidez e com o layout intacto.

**Why P1**: O auto-zoom quebra o alinhamento da tela, oculta campos e frustra o uso móvel do app no dia a dia.

**Acceptance Criteria**:

1. IF a largura da tela for de até 768px (dispositivos móveis) THEN any input text field, select, or textarea SHALL have a computed font-size of at least 16px.
2. IF an input is of type checkbox, radio, range, or color THEN the 16px font-size override SHALL NOT alter its dimensions or behavior.
3. IF the user touches an interactive form element or button THEN the element SHALL utilize `touch-action: manipulation` to eliminate tap delay.
4. IF the frontend application is compiled THEN the build and type-checking process SHALL succeed with zero errors.

---

## Requirement Traceability

| Requirement ID | Description | Source | Status |
| -------------- | ----------- | ------ | ------ |
| ZOOM-01 | Global 16px font size on mobile for inputs, selects, and textareas | spec.md | implementing |
| ZOOM-02 | Touch action manipulation optimization | spec.md | implementing |
| ZOOM-03 | Accessible viewport preservation and clean build | spec.md | in tasks |
