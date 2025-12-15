// JSDOM setup and globals
const hasDOM = typeof window !== 'undefined' && typeof document !== 'undefined';
if (hasDOM && typeof require === 'function') {
  const $ = require('./jquery-shim');
  global.$ = $;
  global.bootstrap = {
    Tooltip: function() {}
  };
} else {
  // Node environment (used by API tests)
  global.$ = { fn: {} };
  global.bootstrap = {
    Tooltip: function() {}
  };
}

// Minimal grecaptcha mock if any code references it implicitly
if (!global.grecaptcha) {
  global.grecaptcha = {
    getResponse: jest.fn(() => 'mock-recaptcha-response'),
    reset: jest.fn(),
  };
}
