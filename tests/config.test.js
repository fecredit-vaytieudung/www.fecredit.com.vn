/**
 * Unit tests for ConfigManager
 * Tests initialization, validation, session key generation, and CSRF token fetching
 */

// Mock fetch for testing
global.fetch = jest.fn();

// Mock crypto for consistent testing
const mockCrypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  })
};

describe('ConfigManager', () => {
  let ConfigManager;
  let configManager;

  beforeEach(() => {
    // Clear module cache to get fresh instance
    jest.resetModules();
    
    // Setup window mock
    global.window = {
      crypto: mockCrypto
    };

    // Import ConfigManager
    const module = require('../assets/js/config.js');
    ConfigManager = module.ConfigManager;
    configManager = module;

    // Clear fetch mock
    global.fetch.mockClear();
  });

  afterEach(() => {
    delete global.window;
  });

  describe('Initialization', () => {
    test('should initialize without errors', () => {
      expect(configManager).toBeDefined();
      expect(configManager.config).toBeDefined();
    });

    test('should have required configuration sections', () => {
      expect(configManager.config.security).toBeDefined();
      expect(configManager.config.emailjs).toBeDefined();
      expect(configManager.config.api).toBeDefined();
    });

    test('should set session start timestamp', () => {
      expect(configManager.sessionStart).toBeDefined();
      expect(typeof configManager.sessionStart).toBe('number');
    });
  });

  describe('Session Key Generation', () => {
    test('should generate 64-character hex session key', () => {
      const key = configManager.generateSessionKey();
      expect(key).toBeDefined();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
    });

    test('should generate unique keys', () => {
      const key1 = configManager.generateSessionKey();
      const key2 = configManager.generateSessionKey();
      expect(key1).not.toBe(key2);
    });

    test('should use crypto.getRandomValues when available', () => {
      // The key is already generated during initialization, so we need to call it directly
      const instance = new ConfigManager();
      const key = instance.generateSessionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]{64}$/i.test(key)).toBe(true);
    });

    test('should fallback gracefully when crypto is unavailable', () => {
      delete global.window.crypto;
      const key = configManager.generateSessionKey();
      expect(key).toBeDefined();
      expect(key.length).toBe(64);
    });
  });

  describe('Configuration Getter/Setter', () => {
    test('should retrieve nested config values', () => {
      const timeout = configManager.get('security.sessionTimeout');
      expect(timeout).toBe(30);
    });

    test('should return undefined for non-existent paths', () => {
      const value = configManager.get('nonexistent.path');
      expect(value).toBeUndefined();
    });

    test('should set nested config values', () => {
      configManager.set('security.testValue', 'test');
      expect(configManager.get('security.testValue')).toBe('test');
    });

    test('should create nested objects when setting deep paths', () => {
      configManager.set('new.nested.value', 42);
      expect(configManager.get('new.nested.value')).toBe(42);
    });
  });

  describe('Environment Variables', () => {
    test('should get environment variable with fallback', () => {
      const value = configManager.getEnvVar('NONEXISTENT_VAR', 'default');
      expect(value).toBe('default');
    });

    test('should use default value when env var not found', () => {
      const value = configManager.getEnvVar('MISSING_VAR', 'fallback');
      expect(value).toBe('fallback');
    });

    test('should handle process.env if available', () => {
      global.process = { env: { TEST_VAR: 'test-value' } };
      const value = configManager.getEnvVar('TEST_VAR', 'default');
      expect(value).toBe('test-value');
      delete global.process;
    });
  });

  describe('CSRF Token Fetching', () => {
    test('should fetch CSRF token from server', async () => {
      const mockToken = 'test-csrf-token-12345';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken })
      });

      const token = await configManager.getCsrfToken();
      expect(token).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token');
    });

    test('should cache CSRF token', async () => {
      const mockToken = 'cached-token';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken })
      });

      const token1 = await configManager.getCsrfToken();
      const token2 = await configManager.getCsrfToken();
      
      expect(token1).toBe(mockToken);
      expect(token2).toBe(mockToken);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should use fallback token on fetch failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const token = await configManager.getCsrfToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    test('should handle non-ok response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const token = await configManager.getCsrfToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64);
    });

    test('should refetch token after session expires', async () => {
      const mockToken1 = 'token-1';
      const mockToken2 = 'token-2';
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken1 })
      });

      const token1 = await configManager.getCsrfToken();
      expect(token1).toBe(mockToken1);

      // Simulate session expiration
      configManager.sessionStart = Date.now() - (31 * 60 * 1000); // 31 minutes ago

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: mockToken2 })
      });

      const token2 = await configManager.getCsrfToken();
      expect(token2).toBe(mockToken2);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Session Validation', () => {
    test('should validate active session', () => {
      configManager.sessionStart = Date.now();
      expect(configManager.isSessionValid()).toBe(true);
    });

    test('should invalidate expired session', () => {
      configManager.sessionStart = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      expect(configManager.isSessionValid()).toBe(false);
    });

    test('should validate session within timeout window', () => {
      configManager.sessionStart = Date.now() - (29 * 60 * 1000); // 29 minutes ago
      expect(configManager.isSessionValid()).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate required config fields', () => {
      const result = configManager.validate();
      expect(result).toBe(true);
    });

    test('should detect missing required fields', () => {
      const instance = new ConfigManager();
      instance.config.security.encryptionKey = '';
      const result = instance.validate();
      expect(result).toBe(false);
    });

    test('should warn on invalid encryption key format', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const instance = new ConfigManager();
      instance.config.security.encryptionKey = 'invalid-key';
      instance.validate();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Security: No Hardcoded Secrets', () => {
    test('encryption key should not be hardcoded', () => {
      const key = configManager.get('security.encryptionKey');
      expect(key).not.toBe('PLACEHOLDER_KEY_1');
      expect(key).not.toBe('PLACEHOLDER_KEY_2');
      expect(key).not.toBe('shinhan_key');
    });

    test('CSRF token should not be hardcoded', () => {
      const token = configManager.get('security.csrfToken');
      expect(token).not.toBe('PLACEHOLDER_CSRF_TOKEN');
    });

    test('getAll should not expose sensitive data', () => {
      const all = configManager.getAll();
      expect(all.security.encryptionKey).toBeUndefined();
      expect(all.security.csrfToken).toBeUndefined();
      expect(all.security.hasEncryptionKey).toBe(true);
    });
  });

  describe('Session Reset', () => {
    test('should reset session and generate new keys', async () => {
      const oldKey = configManager.get('security.encryptionKey');
      const oldStart = configManager.sessionStart;

      // Wait a tiny bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      configManager.resetSession();

      const newKey = configManager.get('security.encryptionKey');
      const newStart = configManager.sessionStart;

      expect(newKey).not.toBe(oldKey);
      expect(newStart).toBeGreaterThanOrEqual(oldStart);
      expect(configManager.get('security.csrfToken')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('should handle malformed config paths', () => {
      expect(configManager.get('security')).toBeDefined();
      expect(configManager.get('.')).toBeUndefined();
      expect(configManager.get('...')).toBeUndefined();
    });

    test('should handle null/undefined values in set', () => {
      configManager.set('test.nullValue', null);
      configManager.set('test.undefinedValue', undefined);
      expect(configManager.get('test.nullValue')).toBeNull();
      expect(configManager.get('test.undefinedValue')).toBeUndefined();
    });
  });
});
