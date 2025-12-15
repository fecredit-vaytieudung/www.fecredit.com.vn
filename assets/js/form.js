
/* form.js - Handles form submission and validation */
document.addEventListener('DOMContentLoaded', () => {
  const newsletterForm = document.querySelector('form[onsubmit="vn4subscribe_qwertyuiop_os8s7MXr2dKDEYfOCjEb()"]');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const emailInput = document.getElementById('vn4subscribe_os8s7MXr2dKDEYfOCjEb');
      const email = emailInput.value;
      const emailRegex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

      if (!emailRegex.test(email)) {
        // Fix: Use textContent instead of innerHTML to prevent XSS
        document.getElementById('message_message').textContent = 'Please enter the correct email format';
        document.getElementById('btn-success').click();
        return;
      }

      try {
        // Show loading state
        const submitButton = newsletterForm.querySelector('button[type="submit"]');
        const originalText = submitButton ? submitButton.textContent : '';
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent = 'Submitting...';
        }

        // Get CSRF token dynamically
        let csrfToken;
        if (typeof getCsrfToken === 'function') {
          csrfToken = await getCsrfToken();
        } else if (typeof window !== 'undefined' && window.configManager) {
          csrfToken = await window.configManager.getCsrfToken();
        } else {
          // Fallback for backward compatibility
          csrfToken = 'fallback-token';
          console.warn('CSRF token retrieval failed, using fallback');
        }

        const response = await fetch('https://shinhan.com.vn/vn4-subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `_token=${encodeURIComponent(csrfToken)}&email=${encodeURIComponent(email)}`
        });

        const data = await response.json();
        
        if (data.success) {
          // Fix: Use textContent instead of innerHTML to prevent XSS
          document.getElementById('message_message').textContent = 'Sign Up Success. We will update you with the latest news from Shinhan Bank.';
          document.getElementById('btn-success').click();
          emailInput.value = '';
        } else {
          throw new Error('Subscription failed');
        }

        // Restore button state
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      } catch (error) {
        // Form submission error occurred
        console.error('Form submission error:', error);
        
        // Fix: Use textContent instead of innerHTML to prevent XSS
        document.getElementById('message_message').textContent = 'An error occurred. Please try again.';
        document.getElementById('btn-success').click();

        // Restore button state
        const submitButton = newsletterForm.querySelector('button[type="submit"]');
        if (submitButton) {
          submitButton.disabled = false;
        }
      }
    });
  }
});
