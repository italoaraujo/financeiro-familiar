#!/usr/bin/env node

/**
 * gitflow-start: Inicia uma Release ou Hotfix seguindo o padrão Git Flow e SemVer.
 * 
 * Release:
 *   - Base: branch 'develop'
 *   - Incremento: MINOR (ex: 1.0.1 -> 1.1.0)
 *   - Branch: release/vX.Y.0
 * 
 * Hotfix:
 *   - Base: branch 'main'
 *   - Incremento: PATCH (ex: 1.0.1 -> 1.0.2)
 *   - Branch: hotfix/vX.Y.Z
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function printUsage() {
  console.log(`
Uso:
  node start.js --type <release|hotfix> [opções]

Opções:
  -t, --type <release|hotfix>     Tipo do fluxo (obrigatório: release ou hotfix)
  -v, --custom-version <version>  Define manualmente a versão (ex: 1.2.0)
  --dry-run                       Simula a execução sem criar branches ou alterar arquivos
  -h, --help                      Exibe esta mensagem de ajuda

Exemplos:
  node start.js --type release
  node start.js --type hotfix
  node start.js --type release --custom-version 2.0.0
  node start.js --type release --dry-run
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    type: null,
    customVersion: null,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--type' || arg === '-t') {
      options.type = args[++i];
    } else if (arg.startsWith('--type=')) {
      options.type = arg.split('=')[1];
    } else if (arg === '--custom-version' || arg === '-v') {
      options.customVersion = args[++i];
    } else if (arg.startsWith('--custom-version=')) {
      options.customVersion = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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
      'Faça commit ou stash antes de iniciar uma release ou hotfix:\n' +
      status
    );
  }
}

function parseSemVer(versionStr) {
  const clean = versionStr.replace(/^v/, '').trim();
  const match = clean.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(`Versão inválida: "${versionStr}". Esperado formato SemVer MAJOR.MINOR.PATCH (ex: 1.0.0).`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || null,
    raw: clean,
  };
}

function calculateNextVersion(currentVersionStr, type) {
  const semver = parseSemVer(currentVersionStr);
  if (type === 'release') {
    return `${semver.major}.${semver.minor + 1}.0`;
  } else if (type === 'hotfix') {
    return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
  } else {
    throw new Error(`Tipo de fluxo inválido: "${type}". Esperado "release" ou "hotfix".`);
  }
}

function updateJsonVersion(filePath, newVersion) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo não encontrado: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(content);
  json.version = newVersion;
  if (json.packages && json.packages['']) {
    json.packages[''].version = newVersion;
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf-8');
}

function main() {
  const options = parseArgs();

  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.type || !['release', 'hotfix'].includes(options.type)) {
    console.error('ERRO: Parâmetro --type obrigatório e deve ser "release" ou "hotfix".');
    printUsage();
    process.exit(1);
  }

  const repoRoot = getRepoRoot();
  const type = options.type;
  const baseBranch = type === 'release' ? 'develop' : 'main';

  console.log(`\n=== Git Flow: Iniciar ${type.toUpperCase()} ===`);
  console.log(`Repositório: ${repoRoot}`);
  console.log(`Base branch: ${baseBranch}`);

  // Verificar status do repositório
  if (!options.dryRun) {
    checkCleanWorkingTree(repoRoot);
  } else {
    const status = runGit('status --porcelain', repoRoot, { ignoreError: true });
    if (status) {
      console.log('⚠️ [DRY-RUN] Repositório tem alterações pendentes, mas continuando simulação...');
    }
  }

  // Obter versão atual do backend/package.json
  const backendPkgPath = path.join(repoRoot, 'backend', 'package.json');
  if (!fs.existsSync(backendPkgPath)) {
    throw new Error(`Arquivo backend/package.json não encontrado em ${backendPkgPath}`);
  }
  const backendPkg = JSON.parse(fs.readFileSync(backendPkgPath, 'utf-8'));
  const currentVersion = backendPkg.version || '1.0.0';

  let newVersion;
  if (options.customVersion) {
    newVersion = parseSemVer(options.customVersion).raw;
    console.log(`Versão personalizada informada: ${newVersion}`);
  } else {
    newVersion = calculateNextVersion(currentVersion, type);
    console.log(`Versão atual detectada: ${currentVersion}`);
    console.log(`Próxima versão calculada: ${newVersion} (${type === 'release' ? '+minor' : '+patch'})`);
  }

  const branchName = `${type}/v${newVersion}`;

  // Verificar se branch já existe
  const branchExists = runGit(`rev-parse --verify refs/heads/${branchName}`, repoRoot, { ignoreError: true });
  if (branchExists) {
    throw new Error(`A branch '${branchName}' já existe localmente.`);
  }

  const filesToUpdate = [
    path.join('backend', 'package.json'),
    path.join('backend', 'package-lock.json'),
    path.join('frontend', 'package.json'),
    path.join('frontend', 'package-lock.json'),
  ];

  const commitMessage = type === 'release'
    ? `chore(release): bump version to ${newVersion}`
    : `fix(hotfix): bump version to ${newVersion}`;

  if (options.dryRun) {
    console.log('\n[SIMULAÇÃO DRY-RUN CONCLUÍDA]');
    console.log(`- Tipo: ${type}`);
    console.log(`- Base: ${baseBranch}`);
    console.log(`- Versão atual: ${currentVersion}`);
    console.log(`- Nova versão: ${newVersion}`);
    console.log(`- Nova branch: ${branchName}`);
    console.log(`- Arquivos a atualizar:\n    ${filesToUpdate.join('\n    ')}`);
    console.log(`- Commit inicial: "${commitMessage}"`);
    console.log('\nNenhuma alteração foi realizada.');
    process.exit(0);
  }

  // Executar passos reais
  console.log(`\n1. Fazendo checkout na branch base '${baseBranch}'...`);
  runGit(`checkout ${baseBranch}`, repoRoot);

  // Tenta puxar atualizações do origin se existir
  try {
    runGit(`pull --rebase origin ${baseBranch}`, repoRoot, { silent: true });
    console.log(`   Branch '${baseBranch}' atualizada com origin.`);
  } catch {
    // Pode falhar caso não haja remote ou conexão, segue localmente
  }

  console.log(`2. Criando nova branch '${branchName}' a partir de '${baseBranch}'...`);
  runGit(`checkout -b ${branchName}`, repoRoot);

  console.log('3. Atualizando versão nos arquivos package.json e package-lock.json...');
  for (const relPath of filesToUpdate) {
    const fullPath = path.join(repoRoot, relPath);
    if (fs.existsSync(fullPath)) {
      updateJsonVersion(fullPath, newVersion);
      console.log(`   ✓ Atualizado: ${relPath} -> ${newVersion}`);
    } else {
      console.warn(`   ⚠️ Arquivo não encontrado, ignorado: ${relPath}`);
    }
  }

  console.log('4. Criando commit de bump de versão...');
  runGit(`add ${filesToUpdate.join(' ')}`, repoRoot);
  runGit(`commit -m "${commitMessage}"`, repoRoot);

  console.log('\n✅ Fluxo iniciado com sucesso!');
  console.log(`Branch ativa: ${branchName}`);
  console.log(`Versão: ${newVersion}`);
  console.log(`\nPróximos passos:`);
  if (type === 'release') {
    console.log(`- Realize os testes de homologação e pequenos ajustes finais na branch '${branchName}'.`);
    console.log(`- Quando pronto, execute a skill 'gitflow-finish' para concluir a release.`);
  } else {
    console.log(`- Implemente a correção do bug emergencial na branch '${branchName}'.`);
    console.log(`- Quando pronto e testado, execute a skill 'gitflow-finish' para concluir o hotfix.`);
  }
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ERRO: ${err.message}`);
  process.exit(1);
}
