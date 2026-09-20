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

  /* ---- Language switcher (spec: specs/004-multilingual-czech/) ----
     Plain links do the navigation; this handler only persists the explicit
     choice (the ONLY writer of tc-lang) and carries the section anchor over
     so the reader lands on the same place in the other language. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-set-lang]'), function (link) {
    link.addEventListener('click', function () {
      try { localStorage.setItem('tc-lang', link.getAttribute('data-set-lang')); } catch (e) { /* private mode: choice lasts for the visit only */ }
      if (location.hash) {
        link.href = link.getAttribute('href').split('#')[0] + location.hash;
      }
    });
  });

  /* ---- Copy-to-clipboard buttons (spec: specs/007-release-news-gallery/) ----
     Rendered hidden: without scripting or the Clipboard API the command stays
     plain selectable text. */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-copy-target]'), function (btn) {
      var source = document.getElementById(btn.getAttribute('data-copy-target'));
      if (!source) { return; }
      var label = btn.textContent;
      var status = btn.parentNode.parentNode.querySelector('[data-copy-status]');
      var timer = null;
      btn.hidden = false;
      btn.addEventListener('click', function () {
        navigator.clipboard.writeText(source.textContent.trim()).then(function () {
          var copied = btn.getAttribute('data-copied-label') || label;
          btn.textContent = copied;
          if (status) { status.textContent = copied; }
          clearTimeout(timer);
          timer = setTimeout(function () {
            btn.textContent = label;
            if (status) { status.textContent = ''; }
          }, 2000);
        }, function () { /* denied: the command is still selectable */ });
      });
    });
  }

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

  /* ---- Gallery viewer (spec 007) ----
     PhotoSwipe, self-hosted under js/vendor/photoswipe (MIT). It is loaded as
     a module only when the page actually has a gallery, and only by browsers
     that support modules: without it every card is still a plain link to the
     full-size picture, so the gallery keeps working.

     Replaces the hand-written lightbox of spec 002; that page section is gone. */
  if (document.querySelector('[data-gallery]')) {
    import('/js/gallery.js').catch(function () { /* the links still work */ });
  }
})();
