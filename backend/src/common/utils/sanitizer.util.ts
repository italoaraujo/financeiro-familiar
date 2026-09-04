const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
  'creditcardnumber',
  'cvv',
  'pin',
]);

/**
 * Sanitiza recursivamente objetos e arrays substituindo dados sensíveis por [REDACTED].
 * Trata referências circulares e preserva tipos primitivos.
 */
export function sanitizePayload(payload: any, seen = new WeakSet()): any {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  // Tratamento de referências circulares
  if (seen.has(payload)) {
    return '[CIRCULAR]';
  }
  seen.add(payload);

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, seen));
  }

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');

    if (SENSITIVE_KEYS.has(normalizedKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value, seen);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
