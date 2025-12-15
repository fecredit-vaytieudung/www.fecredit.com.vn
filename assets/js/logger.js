/**
 * Professional Logging Service
 * Replaces console statements with a production-ready logging system
 * Version: 1.0.0
 */

(function() {
  'use strict';

  /**
   * Logger Class
   * Provides structured logging with levels and environment awareness
   */
  class Logger {
    constructor() {
      this.isDevelopment = this.detectEnvironment();
      this.logHistory = [];
      this.maxHistorySize = 100;
      this.levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 4
      };
      this.currentLevel = this.isDevelopment ? this.levels.DEBUG : this.levels.ERROR;
      this._isLogging = false;
      
      // Save native console methods before they're overridden
      this._nativeConsole = {
        log: console.log.bind(console),
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      };
    }

    /**
     * Detect if running in development mode
     */
    detectEnvironment() {
      // Check for development indicators
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '';
      const hasDevParam = new URLSearchParams(window.location.search).has('dev');
      const isDevMode = sessionStorage.getItem('devMode') === 'true';
      
      return isLocalhost || hasDevParam || isDevMode;
    }

    /**
     * Add log entry to history
     */
    addToHistory(level, message, data) {
      try {
        this.logHistory.push({
          timestamp: new Date().toISOString(),
          level,
          message,
          data: data ? JSON.stringify(data) : null,
          userAgent: navigator.userAgent,
          url: window.location.href
        });

        // Keep history size manageable
        if (this.logHistory.length > this.maxHistorySize) {
          this.logHistory.shift();
        }
      } catch (e) {
        // Silently fail if we can't add to history
        // Use native console to avoid recursion
        if (this._nativeConsole?.error) {
          this._nativeConsole.error('Failed to add to log history:', e);
        }
      }
    }

    /**
     * Send error to monitoring service (if configured)
     */
    sendToMonitoring(level, message, data) {
      // Only send errors in production
      if (level === 'ERROR' && !this.isDevelopment) {
        try {
          // Check if monitoring service is available
          if (window.monitoring && typeof window.monitoring.logError === 'function') {
            window.monitoring.logError(new Error(message), {
              level,
              data,
              timestamp: new Date().toISOString(),
              url: window.location.href
            });
          }
        } catch (e) {
          // Silently fail - don't break the app
        }
      }
    }

    /**
     * Format log message
     */
    formatMessage(level, message, data) {
      const timestamp = new Date().toLocaleTimeString('vi-VN');
      const prefix = `[${timestamp}] [${level}]`;
      
      if (data) {
        return `${prefix} ${message}`, data;
      }
      return `${prefix} ${message}`;
    }

    /**
     * Debug level logging
     */
    debug(message, data) {
      if (this.currentLevel <= this.levels.DEBUG) {
        this.addToHistory('DEBUG', message, data);
        if (this.isDevelopment) {
          const nativeDebug = this._nativeConsole?.debug || Function.prototype;
          nativeDebug.call(console, this.formatMessage('DEBUG', message), data || '');
        }
      }
    }

    /**
     * Info level logging
     */
    info(message, data) {
      if (this.currentLevel <= this.levels.INFO) {
        this.addToHistory('INFO', message, data);
        if (this.isDevelopment) {
          const nativeInfo = this._nativeConsole?.info || Function.prototype;
          nativeInfo.call(console, this.formatMessage('INFO', message), data || '');
        }
      }
    }

    /**
     * Warn level logging
     */
    warn(message, data) {
      // Prevent infinite recursion
      if (this._isLogging) {
        return;
      }
      
      this._isLogging = true;
      
      try {
        if (this.currentLevel <= this.levels.WARN) {
          this.addToHistory('WARN', message, data);
          if (this.isDevelopment) {
            const nativeWarn = this._nativeConsole?.warn || Function.prototype;
            nativeWarn.call(console, this.formatMessage('WARN', message), data || '');
          }
          this.sendToMonitoring('WARN', message, data);
        }
      } finally {
        this._isLogging = false;
      }
    }

    /**
     * Error level logging
     */
    error(message, error, data) {
      // Prevent infinite recursion
      if (this._isLogging) {
        return;
      }
      
      this._isLogging = true;
      
      try {
        if (this.currentLevel <= this.levels.ERROR) {
          this.addToHistory('ERROR', message, { error: error?.message || error, ...data });
          
          if (this.isDevelopment) {
            // Use native console directly to avoid recursion
            const nativeError = this._nativeConsole?.error || Function.prototype;
            nativeError.call(console, this.formatMessage('ERROR', message), error || '', data || '');
          } else {
            // In production, only log critical errors using native console
            const nativeError = this._nativeConsole?.error || Function.prototype;
            nativeError.call(console, `[ERROR] ${message}`);
          }
          
          this.sendToMonitoring('ERROR', message, { error, ...data });
        }
      } finally {
        this._isLogging = false;
      }
    }

    /**
     * Get log history (for debugging)
     */
    getHistory() {
      return this.logHistory;
    }

    /**
     * Clear log history
     */
    clearHistory() {
      this.logHistory = [];
    }

    /**
     * Export logs (for error reporting)
     */
    exportLogs() {
      return JSON.stringify(this.logHistory, null, 2);
    }
  }

  // Create global logger instance
  window.Logger = new Logger();

  // Provide convenience methods
  window.logDebug = (message, data) => window.Logger.debug(message, data);
  window.logInfo = (message, data) => window.Logger.info(message, data);
  window.logWarn = (message, data) => window.Logger.warn(message, data);
  window.logError = (message, error, data) => window.Logger.error(message, error, data);

  // Backward compatibility - replace console methods
  if (!window.Logger.isDevelopment) {
    // In production, silence console methods but avoid infinite recursion
    const nativeConsole = window.Logger._nativeConsole;
    window.console = {
      ...window.console,
      log: () => {},
      debug: () => {},
      info: () => {},
      warn: (msg, ...args) => {
        // Use Logger's warn without triggering console.warn again
        if (!window.Logger._isLogging) {
          window.Logger.warn(msg, args);
        }
      },
      error: (msg, ...args) => {
        // Use Logger's error without triggering console.error again
        if (!window.Logger._isLogging) {
          window.Logger.error(msg, args[0], args.slice(1));
        }
      }
    };
  }
})();

