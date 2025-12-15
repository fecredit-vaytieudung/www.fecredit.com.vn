/**
 * Configuration Manager
 * Centralized configuration management with dynamic secret generation
 * Replaces hardcoded secrets with session-based keys
 */

class ConfigManager {
  constructor() {
    this.config = {
      security: {
        // Generate a unique encryption key per session (not hardcoded)
        encryptionKey: this.generateSessionKey(),
        // CSRF token will be fetched from server
        csrfToken: null,
        sessionTimeout: 30, // minutes
        rateLimitMax: 5
      },
      emailjs: {
        // Public key is safe to expose, but can be overridden via environment variable
        publicKey: this.getEnvVar('EMAILJS_PUBLIC_KEY', 'Cc-147hLWigAZAdeZ')
      },
      api: {
        csrfTokenEndpoint: '/api/csrf-token',
        subscribeEndpoint: 'https://shinhan.com.vn/vn4-subscribe'
      }
    };

    // Initialize session timestamp
    this.sessionStart = Date.now();
  }

  /**
   * Generate a cryptographically secure session key
   * @returns {string} 64-character hexadecimal string
   */
  generateSessionKey() {
    // Use crypto API if available (browser)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for Node.js environment
    if (typeof require !== 'undefined') {
      try {
        const crypto = require('crypto');
        return crypto.randomBytes(32).toString('hex');
      } catch (e) {
        // crypto not available
      }
    }

    // Final fallback (development only) - generate from timestamp and random
    console.warn('Using fallback key generation - not suitable for production');
    const timestamp = Date.now().toString(16);
    const random = Math.random().toString(16).substring(2);
    return (timestamp + random + random + random).substring(0, 64);
  }

  /**
   * Get environment variable with fallback
   * @param {string} key - Environment variable name
   * @param {string} defaultValue - Default value if not found
   * @returns {string}
   */
  getEnvVar(key, defaultValue = '') {
    // Try to get from process.env (Node.js or bundler)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }

    // Try to get from window.ENV (injected by build process)
    if (typeof window !== 'undefined' && window.ENV && window.ENV[key]) {
      return window.ENV[key];
    }

    return defaultValue;
  }

  /**
   * Get nested configuration value
   * @param {string} path - Dot-notation path (e.g., 'security.encryptionKey')
   * @returns {*} Configuration value or undefined
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Set configuration value
   * @param {string} path - Dot-notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) obj[key] = {};
      return obj[key];
    }, this.config);
    target[lastKey] = value;
  }

  /**
   * Fetch CSRF token from server
   * @returns {Promise<string>} CSRF token
   */
  async getCsrfToken() {
    // Return cached token if available and session is valid
    if (this.config.security.csrfToken && this.isSessionValid()) {
      return this.config.security.csrfToken;
    }

    try {
      const response = await fetch(this.config.api.csrfTokenEndpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }

      const data = await response.json();
      this.config.security.csrfToken = data.token;
      return data.token;
    } catch (error) {
      console.warn('Failed to fetch CSRF token from server, using fallback:', error.message);
      
      // Fallback: Generate a temporary token for development
      // In production, this should fail gracefully
      const fallbackToken = this.generateSessionKey();
      this.config.security.csrfToken = fallbackToken;
      return fallbackToken;
    }
  }

  /**
   * Check if current session is still valid
   * @returns {boolean}
   */
  isSessionValid() {
    const elapsed = (Date.now() - this.sessionStart) / 1000 / 60; // minutes
    return elapsed < this.config.security.sessionTimeout;
  }

  /**
   * Validate configuration on initialization
   * @returns {boolean}
   */
  validate() {
    // Check required fields
    const required = [
      'security.encryptionKey',
      'security.sessionTimeout',
      'emailjs.publicKey'
    ];

    for (const path of required) {
      const value = this.get(path);
      if (value === undefined || value === null || value === '') {
        console.error(`Required configuration missing: ${path}`);
        return false;
      }
    }

    // Validate encryption key format (should be 64 hex characters)
    const encryptionKey = this.get('security.encryptionKey');
    if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
      console.warn('Encryption key is not in expected format (64 hex chars)');
    }

    return true;
  }

  /**
   * Get all configuration (for debugging - excludes sensitive data)
   * @returns {object}
   */
  getAll() {
    // Return a sanitized copy without sensitive data
    return {
      security: {
        sessionTimeout: this.config.security.sessionTimeout,
        rateLimitMax: this.config.security.rateLimitMax,
        hasEncryptionKey: !!this.config.security.encryptionKey,
        hasCsrfToken: !!this.config.security.csrfToken,
        sessionValid: this.isSessionValid()
      },
      emailjs: {
        publicKey: this.config.emailjs.publicKey
      },
      api: this.config.api
    };
  }

  /**
   * Reset session (generates new keys)
   */
  resetSession() {
    this.config.security.encryptionKey = this.generateSessionKey();
    this.config.security.csrfToken = null;
    this.sessionStart = Date.now();
  }
}

// Create singleton instance
const configManager = new ConfigManager();

// Validate on initialization
if (!configManager.validate()) {
  console.error('Configuration validation failed. Some features may not work properly.');
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = configManager;
} else if (typeof window !== 'undefined') {
  window.configManager = configManager;
}

// Also export the class for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports.ConfigManager = ConfigManager;
}
