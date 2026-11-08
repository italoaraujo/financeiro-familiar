---
name: gitflow-finish
description: Finaliza uma Release ou Hotfix seguindo o padrão Git Flow. Identifica automaticamente se a branch atual é uma release ou hotfix, realiza os merges em main e develop com --no-ff, cria a tag Git anotada vX.Y.Z, deleta a branch local e orienta o push para o repositório remoto. Use quando o usuário pedir para "finalizar release", "finalizar hotfix", "finish release", "finish hotfix", "concluir release", "fechar release", "publicar release" ou "encerrar hotfix".
---

# Git Flow: Finalizar Release ou Hotfix (`gitflow-finish`)

Esta skill automatiza a conclusão de uma branch de **Release** ou **Hotfix** no projeto, aplicando as etapas canônicas do Git Flow com tags e merges no-fast-forward.

## Identificação Automática da Branch

A skill inspeciona automaticamente a branch atual:
- Se a branch for `release/vX.Y.Z`: identifica como **Release** da versão `X.Y.Z`.
- Se a branch for `hotfix/vX.Y.Z`: identifica como **Hotfix** da versão `X.Y.Z`.
- Se estiver em outra branch (ex: `develop`, `main`, `feature/*`), interrompe a execução com um erro explicativo.

---

## Passos Executados

1. **Validação de Integridade**: Confirma que todos os commits foram feitos e a árvore de trabalho está limpa.
2. **Merge em `main`**:
   - Faz checkout em `main`.
   - Executa `git merge --no-ff <branch> -m "Merge branch '<branch>'"`
3. **Criação da Tag**:
   - Cria uma tag anotada `vX.Y.Z` na branch `main`.
4. **Merge em `develop`**:
   - Faz checkout em `develop`.
   - Executa `git merge --no-ff <branch> -m "Merge branch '<branch>' into develop"`
5. **Limpeza da Branch**:
   - Remove a branch local finalizada (`git branch -d <branch>`).
6. **Sincronização Remota**:
   - Pergunta e orienta o comando para envio remoto (`git push origin main develop --tags`).

---

## Fluxo de Execução

Quando acionado pelo usuário:

### 1. Inspecionar e Simular (Dry-Run)
Verifique a branch atual e rode uma simulação:
```bash
./.agent/skills/gitflow-finish/scripts/finish.sh --dry-run
```
Apresente ao usuário:
- Branch atual detectada e tipo (Release ou Hotfix)
- Versão e tag que serão criadas (ex: `v1.1.0`)
- Relação das ações de merge e exclusão da branch

### 2. Confirmar com o Usuário
Solicite confirmação para prosseguir com a finalização. Pergunte também se deseja que o push para o `origin` seja disparado automaticamente ao final.

### 3. Executar a Finalização
```bash
# Finalização local padrão (com deleção da branch e instrução para push):
./.agent/skills/gitflow-finish/scripts/finish.sh

# Caso o usuário tenha solicitado push automático para o origin:
./.agent/skills/gitflow-finish/scripts/finish.sh --push
```

### 4. Instruções Finais ao Usuário
Exiba o resumo dos merges concluídos, a tag criada e confirme que a branch ativa agora é a `develop`. Se o push não foi disparado automaticamente, forneça o comando:
```bash
git push origin main develop --tags
```
