/**
 * Utility helpers shared across legacy FE flows.
 * Provides formatting helpers and ID generators for both browser and Node/Jest.
 */

const nodeCrypto = (() => {
  if (typeof require !== 'function') return null;
  try {
    return require('crypto');
  } catch (e) {
    return null;
  }
})();

const browserCrypto = typeof window !== 'undefined' ? window.crypto || null : null;
const UINT32_RANGE = 0x1_0000_0000; // 2^32, upper bound for Uint32 values in rejection sampling

function secureRandomInt(maxExclusive) {
  if (!maxExclusive || maxExclusive <= 0) {
    return 0;
  }
  if (nodeCrypto && typeof nodeCrypto.randomInt === 'function') {
    return nodeCrypto.randomInt(0, maxExclusive);
  }
  if (browserCrypto && browserCrypto.getRandomValues) {
    const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
    const array = new Uint32Array(1);
    let rand;
    do {
      browserCrypto.getRandomValues(array);
      rand = array[0];
    } while (rand >= limit);
    return rand % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function toNumeric(value) {
  if (value === null || value === undefined) return NaN;
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  const raw = String(value).trim().replace(/,/g, '');
  const dotCount = (raw.match(/\./g) || []).length;
  let numeric;
  if (dotCount === 1) {
    const cleaned = raw.replace(/[^0-9.-]/g, '');
    numeric = parseFloat(cleaned);
  } else {
    const cleaned = raw.replace(/[^0-9-]/g, '');
    numeric = parseInt(cleaned, 10);
  }
  return Number.isNaN(numeric) ? NaN : numeric;
}

function formatNumber(value) {
  const numeric = toNumeric(value);
  return Number.isNaN(numeric) ? '' : numeric.toLocaleString('vi-VN');
}

function formatNumberInput(value) {
  if (!value) return '';
  return formatNumber(value);
}

function unformatNumber(value) {
  const numeric = toNumeric(value);
  return Number.isNaN(numeric) ? 0 : numeric;
}

function generateContractId() {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const randomPart = secureRandomInt(1_000_000);
  return `SHB-${datePart}-${String(randomPart).padStart(6, '0')}`;
}

function generateRandomCode() {
  const code = secureRandomInt(1_000_000);
  return String(code).padStart(6, '0');
}

function getCurrentDate() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

function getDateComponents(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return { day: '', month: '', year: '' };
  }
  const [day = '', month = '', year = ''] = dateString.split('/');
  if (day.length === 0 || month.length === 0 || year.length === 0) {
    return { day: '', month: '', year: '' };
  }
  return { day, month, year };
}

function calculateInterestRate(amount) {
  const numeric = toNumeric(amount);
  if (Number.isNaN(numeric) || numeric <= 0) return '';
  const INTEREST_RATE_THRESHOLDS = [
    { min: 200_000_000, rate: 10 },
    { min: 100_000_000, rate: 11 },
    { min: 50_000_000, rate: 11.5 }
  ];
  const match = INTEREST_RATE_THRESHOLDS.find(({ min }) => numeric >= min);
  return match ? match.rate : 12;
}

function calculateMonthlyPayment(amount, termMonths, annualInterestRate = 0) {
  const principal = toNumeric(amount);
  const months = toNumeric(termMonths);
  const rate = typeof annualInterestRate === 'number' ? annualInterestRate : toNumeric(annualInterestRate);

  if (Number.isNaN(principal) || principal <= 0 || Number.isNaN(months) || months <= 0 || Number.isNaN(rate)) {
    return '';
  }

  const monthlyRate = rate > 0 ? rate / 100 / 12 : 0;
  if (monthlyRate === 0) {
    return formatNumber(Math.round(principal / months));
  }

  const payment =
    principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return formatNumber(Math.round(payment));
}

const exported = {
  formatNumber,
  formatNumberInput,
  unformatNumber,
  generateContractId,
  generateRandomCode,
  getCurrentDate,
  getDateComponents,
  calculateInterestRate,
  calculateMonthlyPayment,
  generateLoanCode: generateContractId
};

if (typeof window !== 'undefined') {
  Object.assign(window, exported);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
