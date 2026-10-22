/* =========================================================
   Zadanie — консоль CI/CD
   Ванильный JavaScript: без сборки и без зависимостей.
   ========================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------
     Тема оформления: тёмная / светлая, запоминается в браузере
     --------------------------------------------------------- */

  const THEME_KEY = 'zadanie-theme';

  const initTheme = () => {
    const root = document.documentElement;
    const toggle = document.querySelector('[data-theme-toggle]');
    const label = document.querySelector('[data-theme-label]');

    const apply = (theme) => {
      root.dataset.theme = theme;
      if (label) {
        label.textContent = theme === 'dark' ? 'Тёмная' : 'Светлая';
      }
    };

    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    apply(localStorage.getItem(THEME_KEY) || preferred);

    toggle?.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      apply(next);
      localStorage.setItem(THEME_KEY, next);
    });
  };

  /* ---------------------------------------------------------
     Копирование команды в буфер обмена
     --------------------------------------------------------- */

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Запасной вариант для браузеров без Clipboard API.
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();

      const done = document.execCommand('copy');
      helper.remove();
      return done;
    }
  };

  const initCopyButtons = () => {
    document.querySelectorAll('[data-copy]').forEach((button) => {
      const initial = button.dataset.label || button.textContent.trim();

      button.addEventListener('click', async () => {
        const source = document.querySelector(button.dataset.copy);
        if (!source) {
          return;
        }

        const ok = await copyToClipboard(source.textContent.trim());
        button.textContent = ok ? 'скопировано' : 'не вышло';
        button.disabled = true;

        window.setTimeout(() => {
          button.textContent = initial;
          button.disabled = false;
        }, 1600);
      });
    });
  };

  /* ---------------------------------------------------------
     Имитация прогона пайплайна в консоли
     --------------------------------------------------------- */

  const BUILD_STEPS = [
    { kind: 'step', text: '$ checkout --depth 1 main' },
    { kind: 'info', text: 'runner: ubuntu-latest · 4 vCPU · 16 GB RAM' },
    { kind: 'step', text: 'setup go 1.27.x · cache restored' },
    { kind: 'ok', text: 'gofmt -l . → чисто' },
    { kind: 'ok', text: 'go vet ./... → без замечаний' },
    { kind: 'ok', text: 'go test ./... → 3 passed' },
    { kind: 'step', text: 'build: linux/amd64, linux/arm64, darwin/amd64, darwin/arm64, windows/amd64' },
    { kind: 'warn', text: 'skipped: darwin/arm64 требует macOS-раннера' },
    { kind: 'ok', text: 'artifacts: 5 бинарников собрано' },
    { kind: 'step', text: 'publish → GitHub Releases' },
    { kind: 'ok', text: 'release hello-go-releases-v1.0.0 создан' },
  ];

  const TAG_BY_KIND = {
    step: '$',
    info: 'info',
    ok: 'ok',
    warn: 'warn',
    fail: 'fail',
  };

  const formatTime = (date) =>
    [date.getHours(), date.getMinutes(), date.getSeconds()]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');

  const initConsole = () => {
    const output = document.querySelector('[data-console]');
    const progress = document.querySelector('[data-progress]');
    const replay = document.querySelector('[data-replay]');

    if (!output) {
      return;
    }

    let timers = [];

    const clearTimers = () => {
      timers.forEach((id) => window.clearTimeout(id));
      timers = [];
    };

    const renderLine = (step) => {
      const line = document.createElement('div');
      line.className = `log-line log-line--${step.kind}`;

      const time = document.createElement('span');
      time.className = 'log-line__time';
      time.textContent = formatTime(new Date());

      const tag = document.createElement('span');
      tag.className = 'log-line__tag';
      tag.textContent = TAG_BY_KIND[step.kind] || '';

      const text = document.createElement('span');
      text.className = 'log-line__text';
      text.textContent = step.text;

      line.append(time, tag, text);
      output.appendChild(line);
    };

    const play = () => {
      clearTimers();
      output.textContent = '';

      if (progress) {
        progress.style.width = '0%';
      }

      let delay = 0;

      BUILD_STEPS.forEach((step, index) => {
        delay += step.kind === 'warn' ? 420 : 260;

        timers.push(
          window.setTimeout(() => {
            renderLine(step);

            if (progress) {
              const percent = Math.round(((index + 1) / BUILD_STEPS.length) * 100);
              progress.style.width = `${percent}%`;
            }
          }, delay)
        );
      });

      // Мигающий курсор в конце последней строки.
      timers.push(
        window.setTimeout(() => {
          const cursor = document.createElement('span');
          cursor.className = 'log-cursor';
          output.appendChild(cursor);
        }, delay + 200)
      );
    };

    replay?.addEventListener('click', play);
    play();
  };

  /* ---------------------------------------------------------
     Часы в правом нижнем углу консоли
     --------------------------------------------------------- */

  const initClock = () => {
    const clock = document.querySelector('[data-clock]');
    if (!clock) {
      return;
    }

    const tick = () => {
      clock.textContent = `${formatTime(new Date())} · UTC${new Date().getTimezoneOffset() / -60}`;
    };

    tick();
    window.setInterval(tick, 1000);
  };

  /* ---------------------------------------------------------
     Счётчик: значение переживает перезагрузку страницы
     --------------------------------------------------------- */

  const COUNTER_KEY = 'zadanie-counter';

  const initCounter = () => {
    const output = document.querySelector('[data-counter]');
    const addButton = document.querySelector('[data-counter-add]');
    const resetButton = document.querySelector('[data-counter-reset]');

    if (!output) {
      return;
    }

    const read = () => {
      const stored = Number.parseInt(localStorage.getItem(COUNTER_KEY) || '0', 10);
      return Number.isFinite(stored) && stored >= 0 ? stored : 0;
    };

    const write = (value) => {
      output.value = String(value);
      output.textContent = String(value);
      localStorage.setItem(COUNTER_KEY, String(value));
    };

    write(read());

    addButton?.addEventListener('click', () => {
      write(read() + 1);
    });

    resetButton?.addEventListener('click', () => {
      write(0);
    });
  };

  /* ---------------------------------------------------------
     Появление блоков при прокрутке и подсветка активного раздела
     --------------------------------------------------------- */

  const initObservers = () => {
    const targets = document.querySelectorAll('.stats, .panel, .cards');

    if ('IntersectionObserver' in window) {
      const reveal = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              reveal.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      targets.forEach((target, index) => {
        target.classList.add('reveal');
        target.style.transitionDelay = `${Math.min(index, 4) * 60}ms`;
        reveal.observe(target);
      });
    }

    const links = Array.from(document.querySelectorAll('.nav a'));
    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (!links.length || !sections.length || !('IntersectionObserver' in window)) {
      return;
    }

    const highlight = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          links.forEach((link) => {
            link.classList.toggle('is-active', link.getAttribute('href') === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    sections.forEach((section) => highlight.observe(section));
  };

  /* ---------------------------------------------------------
     Запуск
     --------------------------------------------------------- */

  initTheme();
  initCopyButtons();
  initConsole();
  initClock();
  initCounter();
  initObservers();
})();
