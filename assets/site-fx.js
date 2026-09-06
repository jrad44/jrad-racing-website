/* JRAD Racing — shared interactive polish, loaded on every page.
   Everything here is additive and defensive: if an element isn't on the
   current page, the relevant bit just no-ops. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 1. Scroll progress bar ---------- */
  var bar = document.createElement('div');
  bar.className = 'fx-scrollbar';
  document.body.appendChild(bar);

  function updateBar() {
    var doc = document.documentElement;
    var scrollable = doc.scrollHeight - doc.clientHeight;
    var pct = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
    bar.style.width = pct + '%';
  }
  window.addEventListener('scroll', updateBar, { passive: true });
  window.addEventListener('resize', updateBar);
  updateBar();

  /* ---------- 2. Custom cursor (fine pointers only, no reduced motion) ---------- */
  if (fine && !reduceMotion) {
    document.documentElement.classList.add('fx-has-cursor');

    var ring = document.createElement('div');
    ring.className = 'fx-cursor-ring';
    var dot = document.createElement('div');
    dot.className = 'fx-cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var mouseX = window.innerWidth / 2;
    var mouseY = window.innerHeight / 2;
    var ringX = mouseX;
    var ringY = mouseY;
    var shown = false;

    window.addEventListener('mousemove', function (e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = 'translate(' + mouseX + 'px,' + mouseY + 'px)';
      if (!shown) {
        shown = true;
        ring.style.opacity = '1';
        dot.style.opacity = '1';
      }
    });
    document.addEventListener('mouseleave', function () {
      ring.style.opacity = '0';
      dot.style.opacity = '0';
      shown = false;
    });

    (function tick() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      ring.style.transform = 'translate(' + ringX + 'px,' + ringY + 'px)';
      requestAnimationFrame(tick);
    })();

    var hoverSelector = 'a, button, .btn, input, textarea, select, [role="button"], .hero-photo';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        ring.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(hoverSelector)) {
        ring.classList.remove('is-hover');
      }
    });
  }

  /* ---------- 3. Magnetic CTA buttons ---------- */
  if (fine && !reduceMotion) {
    var buttons = document.querySelectorAll('.btn');
    buttons.forEach(function (btn) {
      if (btn.closest('.nav')) return; // keep the navbar snappy, not floaty
      btn.classList.add('fx-magnetic');
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var relX = e.clientX - r.left - r.width / 2;
        var relY = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + (relX * 0.22).toFixed(1) + 'px,' + (relY * 0.35).toFixed(1) + 'px)';
      });
      btn.addEventListener('mouseleave', function () {
        btn.style.transform = '';
      });
    });
  }

  /* ---------- 4. Scroll-reveal for card/section blocks ---------- */
  var revealSelector = [
    '.crew-card', '.sponsor-card', '.trophy-card', '.class-block',
    '.day-card', '.extra-card', '.board', '.contact-card',
    '.section-head', '.gear-cat', '.about-grid'
  ].join(', ');
  var revealEls = document.querySelectorAll(revealSelector);
  if (revealEls.length) {
    revealEls.forEach(function (el) { el.classList.add('fx-reveal'); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---------- 5. Dynamic nav links active state ---------- */
  var navList = document.getElementById('navLinks');
  if (navList) {
    var navLinks = navList.querySelectorAll('a');
    var path = (window.location.pathname || '').replace(/\/$/, '') || '/';
    var file = path.split('/').pop() || 'index.html';
    var isHome = file === '' || file === 'index.html';

    navLinks.forEach(function (a) {
      var href = a.getAttribute('href') || '';
      var clean = href.split('#')[0].replace(/^\.\//, '');
      var hash = href.indexOf('#') !== -1 ? href.slice(href.indexOf('#')) : '';

      if (!isHome && clean && (file === clean || path.endsWith('/' + clean))) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else if (isHome && !hash) {
        // Page links on home page are gray
        a.classList.remove('active', 'is-active');
        a.removeAttribute('aria-current');
      }

      a.addEventListener('click', function () {
        if (hash) {
          navLinks.forEach(function (o) { o.classList.remove('active', 'is-active'); });
          a.classList.add('active');
        }
      });
    });

    if (isHome) {
      var sectionIds = ['#garage', '#crew', '#about'];
      var sections = sectionIds.map(function (id) {
        return document.querySelector(id);
      }).filter(Boolean);

      if (sections.length && 'IntersectionObserver' in window) {
        var secIo = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var hashId = '#' + entry.target.id;
              navLinks.forEach(function (a) {
                var h = a.getAttribute('href') || '';
                if (h === hashId || h.endsWith(hashId)) {
                  a.classList.add('active');
                } else if (h.indexOf('#') !== -1) {
                  a.classList.remove('active', 'is-active');
                }
              });
            }
          });
        }, { threshold: 0.35 });

        sections.forEach(function (sec) { secIo.observe(sec); });

        window.addEventListener('scroll', function () {
          if (window.scrollY < 200) {
            navLinks.forEach(function (a) {
              if ((a.getAttribute('href') || '').indexOf('#') !== -1) {
                a.classList.remove('active', 'is-active');
              }
            });
          }
        }, { passive: true });
      }
    }
  }
})();
