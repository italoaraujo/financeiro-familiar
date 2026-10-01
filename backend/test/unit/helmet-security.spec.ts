import helmet from 'helmet';

describe('Helmet HTTP Security Headers (SEC-MED-05)', () => {
  it('should be configured as an express middleware function', () => {
    const middleware = helmet();
    expect(typeof middleware).toBe('function');
  });

  it('should inject security headers onto mock response', () => {
    const middleware = helmet();
    const req = {
      headers: {},
    } as any;

    const headers: Record<string, string> = {};
    const res = {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name.toLowerCase()] = value;
      }),
      getHeader: jest.fn((name: string) => headers[name.toLowerCase()]),
      removeHeader: jest.fn((name: string) => {
        delete headers[name.toLowerCase()];
      }),
    } as any;

    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    // Headers defensivos fundamentais do Helmet
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-dns-prefetch-control']).toBe('off');
    expect(headers['x-download-options']).toBe('noopen');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
