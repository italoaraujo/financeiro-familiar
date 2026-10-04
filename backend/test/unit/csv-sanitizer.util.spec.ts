import { sanitizeCsvField } from '../../src/common/utils/csv-sanitizer.util';

describe('CSV Sanitizer Utility (SEC-HIGH-01)', () => {
  it('should return empty string for null or undefined', () => {
    expect(sanitizeCsvField(null)).toBe('');
    expect(sanitizeCsvField(undefined)).toBe('');
  });

  it('should disarm formula trigger characters by prefixing with single quote', () => {
    expect(sanitizeCsvField("=cmd|'/C calc'!A0")).toBe("'=cmd|'/C calc'!A0");
    expect(sanitizeCsvField('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvField('+500')).toBe("'+500");
    expect(sanitizeCsvField('-1000')).toBe("'-1000");
    expect(sanitizeCsvField('@SUM(B1:B2)')).toBe("'@SUM(B1:B2)");
    expect(sanitizeCsvField('\tTAB_LAUNCH')).toBe("'\tTAB_LAUNCH");
    expect(sanitizeCsvField('\rRETURN_LAUNCH')).toBe("'\rRETURN_LAUNCH");
  });

  it('should leave normal safe text unchanged', () => {
    expect(sanitizeCsvField('Compra Supermercado')).toBe('Compra Supermercado');
    expect(sanitizeCsvField('Salário Mensal')).toBe('Salário Mensal');
    expect(sanitizeCsvField('Aluguel apto 102')).toBe('Aluguel apto 102');
  });

  it('should convert safe numbers to string without prefix', () => {
    expect(sanitizeCsvField(1234.56)).toBe('1234.56');
    expect(sanitizeCsvField(0)).toBe('0');
  });
});
