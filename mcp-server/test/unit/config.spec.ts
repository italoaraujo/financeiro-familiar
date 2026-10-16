import { loadConfig, resolveFamilyId, logError } from '../../src/config';

describe('MCP Configuration & Context Resolution (MCP-03 & MCP-04)', () => {
  it('should load default configuration values when optional env vars are omitted', () => {
    const config = loadConfig({});
    expect(config.apiUrl).toBe('http://localhost:3001');
    expect(config.apiToken).toBeUndefined();
    expect(config.userEmail).toBeUndefined();
    expect(config.userPassword).toBeUndefined();
    expect(config.defaultFamilyId).toBeUndefined();
    expect(config.httpTimeoutMs).toBe(15000);
  });

  it('should trim trailing slashes from MCP_API_URL and parse custom values', () => {
    const config = loadConfig({
      MCP_API_URL: 'http://localhost:3001///',
      MCP_API_TOKEN: '  eyJ.test.token  ',
      MCP_USER_EMAIL: '  admin@exemplo.com ',
      MCP_USER_PASSWORD: '123456',
      MCP_DEFAULT_FAMILY_ID: '  3fa85f64-5717-4562-b3fc-2c963f66afa6  ',
      MCP_HTTP_TIMEOUT_MS: '8000',
    });

    expect(config.apiUrl).toBe('http://localhost:3001');
    expect(config.apiToken).toBe('eyJ.test.token');
    expect(config.userEmail).toBe('admin@exemplo.com');
    expect(config.userPassword).toBe('123456');
    expect(config.defaultFamilyId).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
    expect(config.httpTimeoutMs).toBe(8000);
  });

  it('should fallback to 15000ms when MCP_HTTP_TIMEOUT_MS is invalid or non-positive', () => {
    expect(loadConfig({ MCP_HTTP_TIMEOUT_MS: 'invalid' }).httpTimeoutMs).toBe(15000);
    expect(loadConfig({ MCP_HTTP_TIMEOUT_MS: '-500' }).httpTimeoutMs).toBe(15000);
    expect(loadConfig({ MCP_HTTP_TIMEOUT_MS: '0' }).httpTimeoutMs).toBe(15000);
  });

  describe('resolveFamilyId (MCP-04)', () => {
    it('should return explicit familyId when provided by the tool invocation', () => {
      const config = loadConfig({ MCP_DEFAULT_FAMILY_ID: 'default-family-uuid' });
      expect(resolveFamilyId('explicit-family-uuid', config)).toBe('explicit-family-uuid');
    });

    it('should returnundefined (Personal context) when explicitFamilyId is "personal" or "none"', () => {
      const config = loadConfig({ MCP_DEFAULT_FAMILY_ID: 'default-family-uuid' });
      expect(resolveFamilyId('personal', config)).toBeUndefined();
      expect(resolveFamilyId('none', config)).toBeUndefined();
    });

    it('should fallback to config.defaultFamilyId when explicit familyId is omitted', () => {
      const config = loadConfig({ MCP_DEFAULT_FAMILY_ID: 'default-family-uuid' });
      expect(resolveFamilyId(undefined, config)).toBe('default-family-uuid');
    });

    it('should return undefined when both explicit familyId and defaultFamilyId are omitted', () => {
      const config = loadConfig({});
      expect(resolveFamilyId(undefined, config)).toBeUndefined();
    });
  });

  describe('logError (MCP-03 stderr channel safety)', () => {
    it('should write diagnostic messages exclusively to process.stderr', () => {
      const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
      logError('Test diagnostic message');
      expect(stderrSpy).toHaveBeenCalledWith('[financial-mcp-server] Test diagnostic message\n');
      stderrSpy.mockRestore();
    });
  });
});
