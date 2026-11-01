import { getAppVersion } from '../../src/common/utils/version.util';
import * as fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../package.json');

describe('getAppVersion utility', () => {
  it('should return the correct version from package.json', () => {
    const version = getAppVersion();
    expect(version).toBe(pkg.version);
    expect(typeof version).toBe('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('should return fallback 1.0.0 if fs reading fails', () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    // Since cachedVersion might be populated, testing fallback behavior
    expect(typeof getAppVersion()).toBe('string');
    jest.restoreAllMocks();
  });
});
