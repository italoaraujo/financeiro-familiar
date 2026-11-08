#!/usr/bin/env node

/**
 * gitflow-finish: Finaliza uma Release ou Hotfix seguindo o Git Flow.
 * 
 * Regras:
 * - Detecta automaticamente se a branch atual é 'release/vX.Y.Z' ou 'hotfix/vX.Y.Z'.
 * - Valida se a working tree está limpa.
 * - Faz checkout em 'main' e merge da branch com --no-ff.
 * - Cria a tag anotada 'vX.Y.Z' em 'main'.
 * - Faz checkout em 'develop' e merge da branch com --no-ff.
 * - Deleta a branch local da release/hotfix.
 * - Orienta ou executa o push para o origin (main, develop e tags).
 */

const { execSync } = require('child_process');

function printUsage() {
  console.log(`
Uso:
  node finish.js [opções]

Opções:
  --dry-run        Simula a execução sem realizar merges, tags ou deleção de branch
  --skip-delete    Mantém a branch local de release/hotfix após os merges
  --push           Dispara automaticamente o push para origin (main, develop e tags)
  -h, --help       Exibe esta mensagem de ajuda

Exemplos:
  node finish.js --dry-run
  node finish.js
  node finish.js --push
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    skipDelete: false,
    push: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--skip-delete') {
      options.skipDelete = true;
    } else if (arg === '--push') {
      options.push = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function runGit(cmd, cwd, options = {}) {
  try {
    return execSync(`git ${cmd}`, {
      cwd,
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : ['pipe', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (err) {
    if (options.ignoreError) {
      return '';
    }
    const errorMsg = err.stderr ? err.stderr.toString().trim() : err.message;
    throw new Error(`Falha ao executar 'git ${cmd}': ${errorMsg}`);
  }
}

function getRepoRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Não foi possível identificar a raiz do repositório Git.');
  }
}

function checkCleanWorkingTree(repoRoot) {
  const status = runGit('status --porcelain', repoRoot);
  if (status.length > 0) {
    throw new Error(
      'A árvore de trabalho (working tree) contém arquivos modificados ou não rastreados.\n' +
      'Faça commit das alterações antes de finalizar a release ou hotfix:\n' +
      status
    );
  }
}

function detectCurrentBranch(repoRoot) {
  const currentBranch = runGit('rev-parse --abbrev-ref HEAD', repoRoot);
  const regex = /^(release|hotfix)\/v?([0-9]+\.[0-9]+\.[0-9]+.*)$/;
  const match = currentBranch.match(regex);

  if (!match) {
    throw new Error(
      `A branch atual '${currentBranch}' não é uma branch de release ou hotfix.\n` +
      `O comando deve ser executado a partir de uma branch no padrão 'release/vX.Y.Z' ou 'hotfix/vX.Y.Z'.`
    );
  }

  return {
    branchName: currentBranch,
    type: match[1], // 'release' ou 'hotfix'
    version: match[2].replace(/^v/, ''),
    tagName: `v${match[2].replace(/^v/, '')}`,
  };
}

function main() {
  const options = parseArgs();

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  const repoRoot = getRepoRoot();

  console.log(`\n=== Git Flow: Finalizar Release/Hotfix ===`);
  console.log(`Repositório: ${repoRoot}`);

  if (!options.dryRun) {
    checkCleanWorkingTree(repoRoot);
  } else {
    const status = runGit('status --porcelain', repoRoot, { ignoreError: true });
    if (status) {
      console.log('⚠️ [DRY-RUN] Repositório tem alterações pendentes, mas continuando simulação...');
    }
  }

  const info = detectCurrentBranch(repoRoot);
  console.log(`Branch detectada: ${info.branchName}`);
  console.log(`Tipo: ${info.type.toUpperCase()}`);
  console.log(`Versão: ${info.version}`);
  console.log(`Tag Git: ${info.tagName}`);

  // Verificar se a tag já existe
  const tagExists = runGit(`rev-parse -q --verify refs/tags/${info.tagName}`, repoRoot, { ignoreError: true });
  if (tagExists) {
    throw new Error(`A tag '${info.tagName}' já existe no repositório.`);
  }

  if (options.dryRun) {
    console.log('\n[SIMULAÇÃO DRY-RUN CONCLUÍDA]');
    console.log('Passos que serão executados:');
    console.log(`  1. git checkout main`);
    console.log(`  2. git merge --no-ff ${info.branchName} -m "Merge branch '${info.branchName}'"`);
    console.log(`  3. git tag -a ${info.tagName} -m "${info.type === 'release' ? 'Release' : 'Hotfix'} ${info.tagName}"`);
    console.log(`  4. git checkout develop`);
    console.log(`  5. git merge --no-ff ${info.branchName} -m "Merge branch '${info.branchName}' into develop"`);
    if (!options.skipDelete) {
      console.log(`  6. git branch -d ${info.branchName}`);
    } else {
      console.log(`  6. (Deleção de branch desativada por --skip-delete)`);
    }
    if (options.push) {
      console.log(`  7. git push origin main develop --tags`);
    } else {
      console.log(`  7. Exibirá comando manual para push: 'git push origin main develop --tags'`);
    }
    console.log('\nNenhuma alteração foi realizada.');
    process.exit(0);
  }

  // 1. Checkout main
  console.log(`\n1. Fazendo checkout na branch 'main'...`);
  runGit('checkout main', repoRoot);

  try {
    runGit('pull --rebase origin main', repoRoot, { silent: true });
  } catch {
    // Ignora se não houver remote configurado
  }

  // 2. Merge em main
  console.log(`2. Realizando merge de '${info.branchName}' em 'main' (--no-ff)...`);
  runGit(`merge --no-ff ${info.branchName} -m "Merge branch '${info.branchName}'"`, repoRoot);

  // 3. Tag anotada
  console.log(`3. Criando tag anotada '${info.tagName}'...`);
  const tagMessage = info.type === 'release' ? `Release ${info.tagName}` : `Hotfix ${info.tagName}`;
  runGit(`tag -a ${info.tagName} -m "${tagMessage}"`, repoRoot);

  // 4. Checkout develop
  console.log(`4. Fazendo checkout na branch 'develop'...`);
  runGit('checkout develop', repoRoot);

  try {
    runGit('pull --rebase origin develop', repoRoot, { silent: true });
  } catch {
    // Ignora se não houver remote configurado
  }

  // 5. Merge em develop
  console.log(`5. Realizando merge de '${info.branchName}' em 'develop' (--no-ff)...`);
  runGit(`merge --no-ff ${info.branchName} -m "Merge branch '${info.branchName}' into develop"`, repoRoot);

  // 6. Deletar branch local
  if (!options.skipDelete) {
    console.log(`6. Removendo branch local '${info.branchName}'...`);
    runGit(`branch -d ${info.branchName}`, repoRoot);
  } else {
    console.log(`6. Branch '${info.branchName}' mantida (--skip-delete).`);
  }

  console.log('\n✅ Fluxo finalizado com sucesso!');
  console.log(`Tag criada: ${info.tagName}`);
  console.log(`Branch ativa agora: develop`);

  // 7. Push remoto
  if (options.push) {
    console.log('\n7. Enviando alterações e tags para o repositório remoto (origin)...');
    try {
      runGit('push origin main develop --tags', repoRoot);
      console.log('   ✓ Push concluído com sucesso.');
    } catch (err) {
      console.warn(`   ⚠️ Não foi possível dar push automático: ${err.message}`);
      console.log('   Você pode executar o push manualmente quando estiver conectado:');
      console.log('   git push origin main develop --tags');
    }
  } else {
    console.log('\n📌 Próximo passo para sincronizar com o remoto:');
    console.log('Execute o comando abaixo quando desejar publicar as alterações:');
    console.log('  git push origin main develop --tags\n');
  }
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ERRO: ${err.message}`);
  process.exit(1);
}
