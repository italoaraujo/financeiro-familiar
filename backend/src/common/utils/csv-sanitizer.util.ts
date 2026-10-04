/**
 * Sanitiza valores textuais para exportação CSV a fim de prevenir CSV Formula Injection (CWE-1236).
 * Qualquer texto iniciado por '=', '+', '-', '@', '\t' ou '\r' recebe um apóstrofo como prefixo,
 * instruindo softwares de planilha (Excel, Calc, Google Sheets) a tratá-lo estritamente como texto literal.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/^[=\+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
