/**
 * EmailJS Configuration Reference
 * 
 * This file documents the environment variables used for EmailJS configuration.
 * HTML files check for these window variables and use fallback values if not set.
 * 
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * The fallback values below are DEVELOPMENT KEYS and are publicly visible in source code.
 * These keys MUST be replaced in production by setting window variables BEFORE page load.
 * 
 * PRODUCTION DEPLOYMENT (REQUIRED):
 * Add this script block to your HTML <head> BEFORE any other scripts:
 * 
 * <script>
 *   // Set production API keys - NEVER commit these values to source control
 *   window.EMAILJS_PUBLIC_KEY = 'your-production-key-here';
 *   window.EMAILJS_ALT_USER_ID = 'your-alt-production-key-here';
 *   window.GEMINI_API_KEY = 'your-gemini-key-here'; // Optional for AI features
 * </script>
 * 
 * Best Practice: Use server-side templating or build-time environment variable injection
 * to set these values dynamically based on your deployment environment.
 * 
 * Environment variables required:
 * - window.EMAILJS_PUBLIC_KEY (for most pages: atm, otp, visa, momo, zalopay)
 * - window.EMAILJS_ALT_USER_ID (for Evaluate-conditions.html)
 * - window.GEMINI_API_KEY (for AI features in otp.html - optional)
 */
export const EMAIL_CONFIG = {
  // ⚠️ These are DEVELOPMENT fallbacks - visible in source code
  // ALWAYS override in production via window variables
  PUBLIC_KEY: window.EMAILJS_PUBLIC_KEY || 'J4YH-lyfEfxXeu7aV',
  ALT_USER_ID: window.EMAILJS_ALT_USER_ID || 'WczeDOjRNJxEsxZSP'
};

// Non-module fallback for browsers without ES6 module support
if (typeof window !== 'undefined') {
  window.EMAIL_CONFIG = EMAIL_CONFIG;
}
