---
name: gitflow-start
description: Inicia uma nova Release ou Hotfix seguindo o padrão Git Flow e versionamento SemVer. Calcula automaticamente a próxima versão (+minor para release, +patch para hotfix), cria a branch release/vX.Y.Z ou hotfix/vX.Y.Z, atualiza os package.json e package-lock.json (backend e frontend) e gera o commit inicial. Use quando o usuário pedir para "iniciar release", "iniciar hotfix", "start release", "start hotfix", "criar release", "preparar release" ou "subir versão".
---

# Git Flow: Iniciar Release ou Hotfix (`gitflow-start`)

Esta skill automatiza a abertura de uma nova branch de **Release** ou **Hotfix** no projeto, aplicando as boas práticas do Git Flow e a especificação SemVer.

## Regras de Versionamento

- **Release**:
  - Origem (base): branch `develop`
  - Incremento padrão: **MINOR** (`X.Y.Z` -> `X.(Y+1).0`)
  - Exemplo: `1.0.1` -> `1.1.0`
  - Nome da branch: `release/vX.Y.0`
  - Mensagem do commit: `chore(release): bump version to X.Y.0`
- **Hotfix**:
  - Origem (base): branch `main`
  - Incremento padrão: **PATCH** (`X.Y.Z` -> `X.Y.(Z+1)`)
  - Exemplo: `1.0.1` -> `1.0.2`
  - Nome da branch: `hotfix/vX.Y.Z`
  - Mensagem do commit: `fix(hotfix): bump version to X.Y.Z`

## Arquivos Atualizados
A skill sincroniza a nova versão em:
1. `backend/package.json`
2. `backend/package-lock.json`
3. `frontend/package.json`
4. `frontend/package-lock.json`

---

## Fluxo de Execução

Quando acionado pelo usuário:

### 1. Identificar o Tipo (Release ou Hotfix)
- Se o usuário disse explicitamente (ex: "inicia uma release" ou "inicia um hotfix"), use o tipo correspondente.
- Se não estiver especificado, pergunte se o objetivo é uma **release** (nova funcionalidade/versão regular) ou um **hotfix** (correção emergencial para produção).

### 2. Simular e Confirmar a Versão (Dry-Run)
Execute o script em modo `--dry-run` para obter a versão atual e a sugestão automática:
```bash
./.agent/skills/gitflow-start/scripts/start.sh --type <release|hotfix> --dry-run
```
Apresente ao usuário:
- Versão atual detectada
- Versão proposta (+minor ou +patch)
- Nome da branch que será criada (`release/v...` ou `hotfix/v...`)

Dê a oportunidade do usuário confirmar a versão sugerida ou fornecer uma versão customizada (ex: `2.0.0` para major).

### 3. Executar a Criação
Após confirmação, execute o script:

```bash
# Caso versão padrão sugerida:
./.agent/skills/gitflow-start/scripts/start.sh --type <release|hotfix>

# Caso versão customizada aprovada pelo usuário:
./.agent/skills/gitflow-start/scripts/start.sh --type <release|hotfix> --custom-version <X.Y.Z>
```

### 4. Instruções Finais ao Usuário
Informe que a branch foi criada com sucesso e exiba o estado atual (`git status`, `git branch --show-current`).
- Para **Release**: instrua que testes de homologação podem ser feitos nesta branch antes da finalização com `gitflow-finish`.
- Para **Hotfix**: instrua que a correção do bug deve ser commitada nesta branch antes de finalizar com `gitflow-finish`.
