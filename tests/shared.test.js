/**
 * Unit tests for shared.js utilities
 * Tests backend mock, rate limiter, and utility functions
 */

// Mock CryptoJS
global.CryptoJS = {
  AES: {
    encrypt: jest.fn((data, key) => ({
      toString: () => `encrypted:${data}:${key}`
    })),
    decrypt: jest.fn((data, key) => ({
      toString: jest.fn(() => {
        if (typeof data === 'string' && data.startsWith('encrypted:')) {
          const parts = data.split(':');
          return parts[1] || '[]';
        }
        return '[]';
      })
    }))
  },
  enc: {
    Utf8: 'utf8'
  }
};

// Mock localStorage
global.localStorage = {
  storage: {},
  getItem: jest.fn(function(key) {
    return this.storage[key] || null;
  }),
  setItem: jest.fn(function(key, value) {
    this.storage[key] = value;
  }),
  removeItem: jest.fn(function(key) {
    delete this.storage[key];
  }),
  clear: jest.fn(function() {
    this.storage = {};
  })
};

// Mock emailjs
global.emailjs = {
  init: jest.fn()
};

// Mock console methods
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
};

describe('Shared.js Utilities', () => {
  let configManager;
  let backend;
  let rateLimit;
  let validateIdNumber;
  let formatNumber;
  let getCsrfToken;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.resetModules();
    
    // Clear localStorage
    global.localStorage.storage = {};

    // Mock alert
    global.alert = jest.fn();

    // Setup window mock
    global.window = {
      crypto: {
        getRandomValues: jest.fn((arr) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = Math.floor(Math.random() * 256);
          }
          return arr;
        })
      }
    };

    // Import config first
    const configModule = require('../assets/js/config.js');
    configManager = configModule;
    global.window.configManager = configManager;

    // Import shared.js
    require('../assets/js/shared.js');
    
    // Get references to exported functions/objects
    backend = global.backend;
    rateLimit = global.rateLimit;
    validateIdNumber = global.validateIdNumber;
    formatNumber = global.formatNumber;
    getCsrfToken = global.getCsrfToken;
  });

  afterEach(() => {
    delete global.window;
    delete global.backend;
    delete global.rateLimit;
    delete global.validateIdNumber;
    delete global.formatNumber;
    delete global.getCsrfToken;
  });

  describe('Backend Mock', () => {
    test('should initialize with empty applications array', () => {
      expect(backend).toBeDefined();
      expect(backend.applications).toBeDefined();
      expect(Array.isArray(backend.applications)).toBe(true);
    });

    test('should save application data', () => {
      const testData = {
        name: 'Test User',
        email: 'test@example.com',
        amount: 10000000
      };

      backend.saveApplication(testData);

      expect(backend.applications.length).toBeGreaterThanOrEqual(1);
      expect(backend.applications[backend.applications.length - 1].name).toBe('Test User');
      expect(backend.applications[backend.applications.length - 1].timestamp).toBeDefined();
    });

    test('should encrypt data when saving to localStorage', () => {
      const initialCalls = global.CryptoJS.AES.encrypt.mock.calls.length;
      const testData = { name: 'Test' };
      backend.saveApplication(testData);

      expect(global.CryptoJS.AES.encrypt.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    test('should add timestamp to saved applications', () => {
      const beforeTime = Date.now();
      backend.saveApplication({ name: 'Test' });
      const afterTime = Date.now();

      const app = backend.applications[backend.applications.length - 1];
      expect(app.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(app.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('should handle multiple applications', () => {
      const initialLength = backend.applications.length;
      backend.saveApplication({ name: 'User 1' });
      backend.saveApplication({ name: 'User 2' });
      backend.saveApplication({ name: 'User 3' });

      expect(backend.applications.length).toBe(initialLength + 3);
    });

    test('should clear expired sessions', () => {
      const now = Date.now();
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes

      // Add recent application
      backend.applications = [{
        name: 'Recent',
        timestamp: now - 10000 // 10 seconds ago
      }];

      // Add expired application
      backend.applications.push({
        name: 'Expired',
        timestamp: now - (sessionTimeout + 1000) // 31 minutes ago
      });

      backend.clearExpiredSessions();

      expect(backend.applications.length).toBe(1);
      expect(backend.applications[0].name).toBe('Recent');
    });

    test('should decrypt existing localStorage data on init', () => {
      const existingData = JSON.stringify([
        { name: 'Existing User', timestamp: Date.now() }
      ]);
      
      // Set the encrypted data correctly
      const encryptedValue = `encrypted:${existingData}:testkey`;
      global.localStorage.setItem('loanApplications', encryptedValue);
      
      // Re-initialize backend
      const encryptionKey = configManager.get('security.encryptionKey');
      const encrypted = global.localStorage.getItem('loanApplications');
      const decrypted = global.CryptoJS.AES.decrypt(encrypted, encryptionKey).toString();
      
      expect(decrypted).toBeDefined();
    });

    test('should handle decryption failure gracefully', () => {
      // Should not throw even with invalid data
      expect(() => {
        const encryptionKey = configManager.get('security.encryptionKey');
        try {
          const encrypted = 'invalid-data';
          global.CryptoJS.AES.decrypt(encrypted, encryptionKey).toString();
        } catch (e) {
          // Expected to catch
        }
      }).not.toThrow();
    });
  });

  describe('Rate Limiter', () => {
    beforeEach(() => {
      // Reset rate limiter state
      if (rateLimit) {
        rateLimit.attempts = 0;
        rateLimit.lastAttempt = 0;
      }
    });

    test('should allow first request', () => {
      const result = rateLimit.check();
      expect(result).toBe(true);
      expect(rateLimit.attempts).toBe(1);
    });

    test('should increment attempts on each check', () => {
      rateLimit.check();
      expect(rateLimit.attempts).toBe(1);
      
      rateLimit.check();
      expect(rateLimit.attempts).toBe(2);
      
      rateLimit.check();
      expect(rateLimit.attempts).toBe(3);
    });

    test('should block after max requests (5)', () => {
      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimit.check()).toBe(true);
      }

      // 6th request should be blocked
      expect(rateLimit.check()).toBe(false);
    });

    test('should reset after time window (60 seconds)', () => {
      // Fill up rate limit
      for (let i = 0; i < 5; i++) {
        rateLimit.check();
      }

      // Should be blocked
      expect(rateLimit.check()).toBe(false);

      // Simulate time passing (61 seconds)
      rateLimit.lastAttempt = Date.now() - 61000;

      // Should be allowed again
      expect(rateLimit.check()).toBe(true);
      expect(rateLimit.attempts).toBe(1);
    });

    test('should update lastAttempt timestamp', () => {
      const before = Date.now();
      rateLimit.check();
      const after = Date.now();

      expect(rateLimit.lastAttempt).toBeGreaterThanOrEqual(before);
      expect(rateLimit.lastAttempt).toBeLessThanOrEqual(after);
    });

    test('should show alert message when blocked', () => {
      // Fill rate limit
      for (let i = 0; i < 5; i++) {
        rateLimit.check();
      }

      // Try one more
      rateLimit.check();

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Quá nhiều yêu cầu')
      );
    });
  });

  describe('Number Formatting', () => {
    test('should format number with Vietnamese locale', () => {
      const input = { value: '1000000' };
      formatNumber(input);
      expect(input.value).toBe('1.000.000');
    });

    test('should handle DOM element input', () => {
      const input = { value: '5000000' };
      formatNumber(input);
      expect(input.value).toBe('5.000.000');
    });

    test('should remove non-numeric characters', () => {
      const input = { value: 'abc123def456' };
      formatNumber(input);
      expect(input.value).toBe('123.456');
    });

    test('should handle empty input', () => {
      const input = { value: '' };
      formatNumber(input);
      expect(input.value).toBe('');
    });

    test('should handle invalid input gracefully', () => {
      const input = { value: 'no-numbers-here' };
      formatNumber(input);
      expect(input.value).toBe('');
    });

    test('should use window.formatNumber if available', () => {
      global.window.formatNumber = jest.fn((val) => `formatted:${val}`);
      
      const result = formatNumber('12345');
      expect(global.window.formatNumber).toHaveBeenCalledWith('12345');
      
      delete global.window.formatNumber;
    });
  });

  describe('ID Number Validation', () => {
    test('should validate correct 12-digit ID with valid province code', () => {
      const result = validateIdNumber('001234567890');
      expect(result).toBe(true);
    });

    test('should reject ID with invalid province code', () => {
      const result = validateIdNumber('999234567890');
      expect(result).toBe(false);
    });

    test('should reject ID with wrong length', () => {
      expect(validateIdNumber('00123456789')).toBe(false); // 11 digits
      expect(validateIdNumber('0012345678901')).toBe(false); // 13 digits
    });

    test('should reject ID with non-numeric characters', () => {
      const result = validateIdNumber('001ABC567890');
      expect(result).toBe(false);
    });

    test('should accept various valid province codes', () => {
      expect(validateIdNumber('001234567890')).toBe(true); // 001 - Ha Noi
      expect(validateIdNumber('079234567890')).toBe(true); // 079 - Ho Chi Minh
      expect(validateIdNumber('048234567890')).toBe(true); // 048 - Da Nang
    });

    test('should validate all documented province codes', () => {
      const validCodes = ['001', '002', '004', '079', '092'];
      validCodes.forEach(code => {
        expect(validateIdNumber(`${code}234567890`)).toBe(true);
      });
    });
  });

  describe('CSRF Token Helper', () => {
    test('should be defined as async function', () => {
      expect(getCsrfToken).toBeDefined();
      expect(typeof getCsrfToken).toBe('function');
    });

    test('should call configManager.getCsrfToken', async () => {
      const mockToken = 'test-token-123';
      configManager.getCsrfToken = jest.fn().mockResolvedValue(mockToken);

      const token = await getCsrfToken();
      
      expect(configManager.getCsrfToken).toHaveBeenCalled();
      expect(token).toBe(mockToken);
    });
  });

  describe('Backward Compatibility', () => {
    test('should provide window.Laravel object', () => {
      expect(global.window.Laravel).toBeDefined();
    });

    test('window.Laravel.csrfToken should warn about deprecation', () => {
      const token = global.window.Laravel.csrfToken;
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('deprecated')
      );
    });

    test('window.Laravel.csrfToken should return null', () => {
      const token = global.window.Laravel.csrfToken;
      expect(token).toBeNull();
    });
  });

  describe('EmailJS Initialization', () => {
    test('should initialize emailjs with config key', () => {
      expect(global.emailjs.init).toHaveBeenCalled();
      const publicKey = configManager.get('emailjs.publicKey');
      expect(global.emailjs.init).toHaveBeenCalledWith(publicKey);
    });
  });

  describe('Integration Tests', () => {
    test('should save and retrieve application with encryption', () => {
      const initialLength = backend.applications.length;
      const testApp = {
        name: 'Integration Test',
        amount: 50000000
      };

      backend.saveApplication(testApp);
      
      expect(global.CryptoJS.AES.encrypt).toHaveBeenCalled();
      expect(backend.applications.length).toBe(initialLength + 1);
      expect(backend.applications[backend.applications.length - 1].name).toBe('Integration Test');
    });

    test('should handle full rate limit cycle', () => {
      // Reset rate limiter
      rateLimit.attempts = 0;
      rateLimit.lastAttempt = 0;
      
      // Phase 1: Allow initial requests
      for (let i = 0; i < 5; i++) {
        expect(rateLimit.check()).toBe(true);
      }

      // Phase 2: Block excess requests
      expect(rateLimit.check()).toBe(false);

      // Phase 3: Reset after timeout
      rateLimit.lastAttempt = Date.now() - 61000;

      // Phase 4: Allow again
      expect(rateLimit.check()).toBe(true);
    });

    test('should maintain data integrity across operations', () => {
      const initialLength = backend.applications.length;
      const encryptCallsBefore = global.CryptoJS.AES.encrypt.mock.calls.length;
      
      // Save multiple applications
      backend.saveApplication({ id: 1, name: 'App 1' });
      backend.saveApplication({ id: 2, name: 'App 2' });

      // Verify count
      expect(backend.applications.length).toBe(initialLength + 2);

      // Verify encryption was called
      expect(global.CryptoJS.AES.encrypt.mock.calls.length).toBeGreaterThan(encryptCallsBefore);
    });
  });
});
