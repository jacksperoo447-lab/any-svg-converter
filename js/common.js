/**
 * Common Utilities for AnySVG
 * Navigation, FAQs, Toasts, Modals, and UI Helpers
 */

document.addEventListener('DOMContentLoaded', function() {
  // 1. Mobile Menu Toggle
  var mobileToggle = document.querySelector('.mobile-toggle');
  var navMenu = document.querySelector('.nav-menu');
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', function() {
      navMenu.classList.toggle('open');
    });
  }

  // 2. Sticky Header Shadow on Scroll
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 20) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    });
  }

  // 3. FAQ Accordion
  var faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = this.parentElement;
      var isOpen = item.classList.contains('open');

      // Close all other items in this FAQ list
      var parentList = item.closest('.faq-list');
      if (parentList) {
        parentList.querySelectorAll('.faq-item').forEach(function(el) {
          el.classList.remove('open');
        });
      }

      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // 4. Modal Close Handlers
  var modalOverlay = document.getElementById('codeModal');
  var modalClose = document.getElementById('modalCloseBtn');
  if (modalOverlay && modalClose) {
    modalClose.addEventListener('click', function() {
      modalOverlay.style.display = 'none';
    });
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        modalOverlay.style.display = 'none';
      }
    });
  }
});

/**
 * Toast Notification Helper
 */
function showToast(message, duration) {
  duration = duration || 3000;
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>' + message + '</span>';
  container.appendChild(toast);

  // Trigger animation
  setTimeout(function() {
    toast.classList.add('show');
  }, 10);

  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 300);
  }, duration);
}

/**
 * Copy to Clipboard Helper
 */
function copyTextToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      showToast(successMessage || 'Copied to clipboard!');
    }).catch(function() {
      fallbackCopy(text, successMessage);
    });
  } else {
    fallbackCopy(text, successMessage);
  }
}

function fallbackCopy(text, successMessage) {
  var textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMessage || 'Copied to clipboard!');
  } catch (err) {
    showToast('Failed to copy. Please copy manually.');
  }
  document.body.removeChild(textArea);
}
