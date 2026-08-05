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
})();
