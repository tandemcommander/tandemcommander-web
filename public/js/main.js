(function () {
  'use strict';

  /* ---- Theme switching (persisted; the anti-FOUC read lives inline in <head>) ---- */
  var root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('tc-theme', theme); } catch (e) { /* private mode: theme lasts for the visit only */ }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-set-theme]'), function (btn) {
    btn.addEventListener('click', function () {
      setTheme(btn.getAttribute('data-set-theme'));
    });
  });

  /* ---- Mobile menu (hamburger; breakpoint must match main.css) ---- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var closeMenu = function () {
      toggle.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    };
    var openMenu = function () {
      toggle.setAttribute('aria-expanded', 'true');
      menu.classList.add('open');
    };

    toggle.addEventListener('click', function () {
      if (toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); } else { openMenu(); }
    });

    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link) {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeMenu(); }
    });

    var mq = window.matchMedia('(min-width: 860px)');
    var onChange = function (e) { if (e.matches) { closeMenu(); } };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); } else { mq.addListener(onChange); }
  }

  /* ---- Screenshot lightbox (spec: specs/002-screenshot-lightbox/) ---- */
  var lightbox = document.querySelector('.lightbox');
  if (lightbox && typeof lightbox.showModal === 'function') {
    var lightboxImg = lightbox.querySelector('.lightbox-img');
    var lightboxClose = lightbox.querySelector('.lightbox-close');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var status = 'closed'; /* closed -> opening -> open -> closing -> closed */
    var sourceBtn = null;
    var settleTimer = null;

    var cleanup = function (closeDialog) {
      clearTimeout(settleTimer);
      settleTimer = null;
      status = 'closed';
      if (closeDialog) { lightbox.close(); }
      lightbox.classList.remove('is-open');
      lightbox.classList.remove('is-closing');
      document.documentElement.classList.remove('lightbox-open');
      document.documentElement.style.paddingRight = '';
      lightboxImg.removeAttribute('src');
      lightboxImg.alt = '';
      if (sourceBtn) { sourceBtn.focus(); }
      sourceBtn = null;
    };

    var openLightbox = function (btn) {
      if (status !== 'closed') { return; }
      var img = btn.querySelector('img');
      if (!img) { return; }
      sourceBtn = btn;
      lightboxImg.src = img.currentSrc || img.src;
      lightboxImg.alt = img.alt;

      /* Lock scroll; pad for the vanished scrollbar so the layout cannot shift. */
      var scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.classList.add('lightbox-open');
      if (scrollbar > 0) { document.documentElement.style.paddingRight = scrollbar + 'px'; }
      lightbox.showModal();

      if (reduceMotion.matches) {
        lightbox.classList.add('is-open');
        status = 'open';
        return;
      }

      /* Entrance: backdrop fades in while the image rises into place at its
         final size. Nothing is scaled mid-animation, so the raster stays
         alias-free. Double rAF: the hidden start state must paint first. */
      status = 'opening';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          lightbox.classList.add('is-open');
          settleTimer = setTimeout(function () {
            if (status === 'opening') { status = 'open'; }
          }, 450);
        });
      });
    };

    var closeLightbox = function () {
      if (status === 'open' && !reduceMotion.matches) {
        clearTimeout(settleTimer);
        status = 'closing';
        lightbox.classList.add('is-closing');
        lightbox.classList.remove('is-open');
        settleTimer = setTimeout(function () {
          if (status === 'closing') { cleanup(true); }
        }, 400);
      } else if (status === 'open' || status === 'opening') {
        cleanup(true);
      }
    };

    lightboxImg.addEventListener('transitionend', function (e) {
      if (e.target !== lightboxImg || e.propertyName !== 'transform') { return; }
      if (status === 'opening') {
        clearTimeout(settleTimer);
        status = 'open';
      } else if (status === 'closing') {
        cleanup(true);
      }
    });

    Array.prototype.forEach.call(document.querySelectorAll('.shot-zoom'), function (btn) {
      btn.addEventListener('click', function () { openLightbox(btn); });
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('cancel', function (e) {
      e.preventDefault();
      closeLightbox();
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) { closeLightbox(); }
    });
    /* Safety net: if the browser force-closes the dialog, resync our state. */
    lightbox.addEventListener('close', function () {
      if (status !== 'closed') { cleanup(false); }
    });
  }
})();
