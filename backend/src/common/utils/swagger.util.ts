/**
 * Determina se a documentação Swagger deve ser exposta com base no ambiente de execução.
 * Desativado estritamente se APP_ENV=production ou NODE_ENV=production para prevenir
 * enumeração e vazamento de schemas em produção (SEC-MED-07).
 */
export function isSwaggerEnabled(): boolean {
  return process.env.APP_ENV !== 'production' && process.env.NODE_ENV !== 'production';
}
