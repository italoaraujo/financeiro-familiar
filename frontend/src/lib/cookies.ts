/**
 * Utilitário seguro para manipulação de cookies de autenticação no frontend
 */

export function setAuthCookie(name: string, value: string, days: number = 1): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict${secureFlag}`;
}

export function getAuthCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeAuthCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict${secureFlag}`;
}
