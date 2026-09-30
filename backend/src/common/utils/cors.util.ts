/**
 * Retorna as origens CORS autorizadas com base nas variáveis de ambiente.
 * Evita o uso inseguro de curinga '*' associado a credentials: true.
 */
export function getAllowedCorsOrigins(envOrigins: string | undefined = process.env.ALLOWED_ORIGINS): string[] {
  if (!envOrigins || !envOrigins.trim()) {
    return ['http://localhost:3000', 'http://localhost:3001'];
  }
  const parsed = envOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');

  return parsed.length > 0 ? parsed : ['http://localhost:3000', 'http://localhost:3001'];
}
