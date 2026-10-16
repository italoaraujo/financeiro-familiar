import * as fs from 'fs';
import * as path from 'path';

let cachedVersion: string | null = null;

/**
 * Obtém a versão da aplicação de forma segura e resiliente,
 * suportando execução local (ts-node), testes (Jest) e contêineres Docker (dist/src ou dist/).
 */
export function getAppVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const candidatePaths = [
    path.join(process.cwd(), 'package.json'),
    path.join(__dirname, '..', '..', '..', 'package.json'),
    path.join(__dirname, '..', '..', 'package.json'),
    path.join(__dirname, '..', 'package.json'),
  ];

  for (const candidate of candidatePaths) {
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
          cachedVersion = pkg.version.trim();
          return cachedVersion;
        }
      }
    } catch {
      // Tenta o próximo candidato
    }
  }

  cachedVersion = '1.0.0';
  return cachedVersion;
}
