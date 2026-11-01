/**
 * Constante centralizada que expõe a versão da aplicação.
 * O valor é injetado durante o build pelo Next.js (next.config.js)
 * a partir do package.json, com fallback defensivo para '1.0.0'.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
