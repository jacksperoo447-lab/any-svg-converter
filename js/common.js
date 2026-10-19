/**
 * AnySVG Core UI, Navigation, PWA Installation & Modal Handlers
 */

// 1. PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function(err) {
      console.log('SW registration error:', err);
    });
  });
}

// 2. Global PWA Install Handler
var deferredPWAInstallPrompt = null;
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  deferredPWAInstallPrompt = e;
  var btns = document.querySelectorAll('.btn-install-app');
  btns.forEach(function(btn) {
    btn.classList.add('ready');
  });
});

window.triggerAppInstall = function() {
  if (deferredPWAInstallPrompt) {
    deferredPWAInstallPrompt.prompt();
    deferredPWAInstallPrompt.userChoice.then(function(choice) {
      deferredPWAInstallPrompt = null;
    });
  } else {
    // Show instruction modal for iOS Safari, Desktop, and Android fallback
    var modal = document.getElementById('installAppModal');
    if (modal) {
      modal.classList.add('visible');
    } else {
      alert("To install AnySVG App:\n• iPhone / iPad: Tap Share (⬆️) and select 'Add to Home Screen'\n• Android: Tap Menu (⋮) and select 'Install App'");
    }
  }
};

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Navigation Toggle
  var mobileToggle = document.getElementById('mobileToggleBtn') || document.querySelector('.mobile-toggle');
  var navMenu = document.getElementById('navMenu') || document.querySelector('.nav-menu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      navMenu.classList.toggle('open');
    });

    document.addEventListener('click', function(e) {
      if (navMenu.classList.contains('open')) {
        if (!navMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
          navMenu.classList.remove('open');
        }
      }
    });
  }

  // Sticky Header Scrolled Class
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 15) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    });
  }

  // Install App Buttons
  var installBtns = document.querySelectorAll('.btn-install-app');
  installBtns.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      window.triggerAppInstall();
    });
  });

  // Install Modal Close Listeners
  var closeInstallBtn = document.getElementById('closeInstallModal');
  var gotItInstallBtn = document.getElementById('gotItInstallBtn');
  var installModal = document.getElementById('installAppModal');

  if (closeInstallBtn && installModal) {
    closeInstallBtn.addEventListener('click', function(e) {
      e.preventDefault();
      installModal.classList.remove('visible');
    });
  }
  if (gotItInstallBtn && installModal) {
    gotItInstallBtn.addEventListener('click', function(e) {
      e.preventDefault();
      installModal.classList.remove('visible');
    });
  }
  if (installModal) {
    installModal.addEventListener('click', function(e) {
      if (e.target === installModal) {
        installModal.classList.remove('visible');
      }
    });
  }

  // FAQ Accordion
  var faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = this.parentElement;
      var isOpen = item.classList.contains('open');

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

  // Code Modal Handlers (from original common.js)
  var modalOverlay = document.getElementById('codeModal');
  var closeModalBtn = document.getElementById('closeModalBtn');
  var copySvgCodeBtn = document.getElementById('copySvgCodeBtn');
  var svgCodeText = document.getElementById('svgCodeText');

  if (closeModalBtn && modalOverlay) {
    closeModalBtn.addEventListener('click', function() {
      modalOverlay.classList.remove('active');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', function(e) {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  if (copySvgCodeBtn && svgCodeText) {
    copySvgCodeBtn.addEventListener('click', function() {
      svgCodeText.select();
      document.execCommand('copy');
      var origText = copySvgCodeBtn.textContent;
      copySvgCodeBtn.textContent = 'Copied!';
      setTimeout(function() {
        copySvgCodeBtn.textContent = origText;
      }, 2000);
    });
  }
});
