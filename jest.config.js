module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.[tj]s$': 'babel-jest',
  },
  moduleNameMapper: {
    '^jquery$': '<rootDir>/tests/jquery-shim.js',
    '^emailjs-com$': '<rootDir>/tests/emailjs-shim.js',
    '^./scripts.js$': '<rootDir>/tests/scripts.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  coverageThreshold: {
    './assets/js/config.js': {
      branches: 80,
      functions: 100,
      lines: 85,
      statements: 85
    },
    './assets/js/shared.js': {
      branches: 45,
      functions: 35,
      lines: 55,
      statements: 55
    }
  },
  collectCoverageFrom: [
    'assets/js/config.js',
    'assets/js/shared.js',
    'assets/js/form.js',
    'assets/js/utils.js'
  ]
};
