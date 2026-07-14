/* ==========================================================================
   iBuy — main.js
   Пока только то, что нужно герою. Растёт вместе с секциями.
   ========================================================================== */

import { initNetwork } from './network.js';

(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initNetwork();   // SECTION 02


  /* --- Набег цифр -----------------------------------------------------------
     Раньше значение мерцало случайными числами и вставало на место — читалось
     как глюк, а не как счёт. Теперь оно НАБЕГАЕТ к финалу с экспоненциальным
     затуханием: быстро стартует, мягко доезжает. Рывка в конце нет.

     onFrame получает текущее значение — вызывающий сам решает, как его писать
     (в прибор, на землю, в оба места сразу). */

  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const countTo = (from, to, duration, onFrame, onDone) => {
    if (REDUCED) {
      onFrame(to);
      if (onDone) onDone();
      return () => {};
    }

    let raf = null;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      onFrame(from + (to - from) * easeOutExpo(t));

      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else if (onDone) {
        onDone();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);   // отмена, если ввод продолжился
  };

  /* --- Шапка: садится на плотный фон, как только ушли с первого экрана ----- */

  const header = document.getElementById('header');

  if (header) {
    const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }


  /* ==========================================================================
     ПРИБОР
     Одно место, три состояния — иначе ховер по ленте и живая оценка начинают
     драться за один и тот же экран:

       default  — общие цифры, покой
       car      — телеметрия машины из ленты (ховер / тап / фокус)
       estimate — живая оценка, пока человек набирает форму

     Приоритет у estimate: если человек уже вводит свою машину, перебивать
     его оценку случайным ховером нельзя.
     ========================================================================== */

  const readout = document.getElementById('readout');
  const form    = document.getElementById('quote-form');
  const lineup  = document.getElementById('lineup');

  /* Обязательна только ФОРМА. Прибор и лента сейчас закомментированы в разметке
     (на их месте trust bar), но живая оценка на бетоне обязана продолжать
     работать — она к ним не привязана. Поэтому readout и lineup здесь
     необязательные: раскомментируют разметку — всё оживёт само, без правок JS. */
  if (form) {

    const pick = (root, sel) => (root ? root.querySelector(sel) : null);

    const panes = {
      default:  pick(readout, '[data-pane="default"]'),
      car:      pick(readout, '[data-pane="car"]'),
      estimate: pick(readout, '[data-pane="estimate"]'),
    };

    const car = {
      name:  pick(readout, '[data-slot="name"]'),
      paid:  pick(readout, '[data-slot="paid"]'),
      where: pick(readout, '[data-slot="where"]'),
      time:  pick(readout, '[data-slot="time"]'),
    };

    const est = {
      status:  pick(readout, '[data-slot="status"]'),
      range:   pick(readout, '[data-slot="range"]'),
      compare: pick(readout, '[data-slot="compare"]'),
    };

    const items = lineup ? [...lineup.querySelectorAll('.lineup__item')] : [];

    /* Земля: телеметрия, лежащая на бетоне перед машинами. Ведётся тем же
       состоянием, что и прибор, — иначе они начнут показывать разное. */
    const ground = {
      root:   document.querySelector('.hero__ground'),
      label:  document.querySelector('[data-slot="ground-label"]'),
      figure: document.querySelector('[data-slot="ground-figure"]'),
      sub:    document.querySelector('[data-slot="ground-sub"]'),
    };

    /* Надпись на земле не подменяется, а ПЕРЕЗАПИСЫВАЕТСЯ: старая уплывает
       вглубь площадки, новая выступает из неё. Подмена текста происходит
       в паузе, когда старое уже невидимо, — иначе глаз ловит рывок. */
    let swapTimer = null;

    const writeGround = (label, figure, sub, working, afterSwap) => {
      // Земли может не быть в разметке — счёт всё равно обязан пойти,
      // иначе прибор навсегда застрянет на «Computing».
      if (!ground.root) {
        if (afterSwap) afterSwap();
        return;
      }

      const apply = () => {
        ground.label.textContent = label;
        ground.sub.textContent   = sub;

        // figure === null означает «цифру ведёт счётчик» — не трогаем её,
        // иначе apply() затрёт значение, уже набегающее на этом кадре.
        if (figure !== null) ground.figure.textContent = figure;

        ground.root.classList.add('is-live');
        ground.root.classList.toggle('is-working', Boolean(working));
        ground.root.classList.remove('is-swapping');
        if (afterSwap) afterSwap();
      };

      if (REDUCED) { apply(); return; }

      clearTimeout(swapTimer);
      ground.root.classList.add('is-swapping');
      // 220ms — сколько букве нужно, чтобы уйти в бетон (см. --t-base в CSS).
      swapTimer = setTimeout(apply, 220);
    };

    /* Отдельно от writeGround: во время набега цифр перезаписывать плоскость
       нельзя — иначе она будет мигать на каждом кадре. Пишем прямо в узел. */
    const setGroundFigure = (text) => {
      if (ground.figure) ground.figure.textContent = text;
    };

    /* Земля молчит в покое. Дежурная надпись про сеть была дублем секции 02
       (там это делает настоящая карта) и просто лежала поперёк машин.
       Теперь бетон оживает ТОЛЬКО под цифру — иначе он украшение, а не реакция. */
    const hideGround = () => {
      if (ground.root) ground.root.classList.remove('is-live', 'is-working');
    };

    // Пока true — форма ведёт прибор, лента его не трогает.
    let estimating = false;

    const showPane = (name) => {
      Object.entries(panes).forEach(([key, el]) => {
        if (el) el.classList.toggle('is-active', key === name);
      });
    };

    const markItem = (item) => {
      items.forEach((i) => i.classList.toggle('is-active', i === item));
    };


    /* --- Состояние «машина из ленты» --------------------------------------- */

    const money   = (n) => '$' + (Math.round(n / 1000) * 1000).toLocaleString('en-US');
    const unmoney = (s) => Number(String(s).replace(/[^0-9]/g, '')) || 0;

    /* Счётчиков одновременно два — прибор и земля. Прибор стартует сразу,
       земля дожидается перезаписи (буквы должны сперва уйти в бетон), поэтому
       она отстаёт на 220ms. Отменять надо оба разом: перескочил на соседнюю
       машину — старые счётчики не должны дописывать чужую сумму. */
    let cancels = [];

    const cancelCount = () => {
      cancels.forEach((stop) => stop());
      cancels = [];
    };

    const track = (stop) => cancels.push(stop);

    const showCar = (item) => {
      if (estimating) return;

      cancelCount();
      markItem(item);

      car.name.innerHTML    = item.dataset.name;   // в data-name лежат &mdash; и &middot;
      car.where.textContent = item.dataset.where;
      car.time.textContent  = item.dataset.time;
      showPane('car');

      const paid = unmoney(item.dataset.paid);

      // Прибор считает сразу — иначе он 220ms показывает пустоту.
      track(countTo(0, paid, 1100, (v) => { car.paid.textContent = money(v); }));

      // Земля — после того, как старая надпись ушла в бетон.
      writeGround(
        'We paid',
        null,   // цифру ведёт счётчик
        item.textContent.trim() + ' · ' + item.dataset.where,
        false,
        () => track(countTo(0, paid, 1100, (v) => setGroundFigure(money(v)))),
      );
    };

    const resetToDefault = () => {
      if (estimating) return;
      cancelCount();
      markItem(null);
      showPane('default');
      hideGround();
    };

    items.forEach((item) => {
      item.addEventListener('mouseenter', () => showCar(item));
      item.addEventListener('focus', () => showCar(item));
      item.addEventListener('click', () => showCar(item));   // тач: наведения нет
    });

    // Сбрасываем при уходе со ВСЕЙ ленты, а не с одной машины: иначе прибор
    // мигал при переходе между соседними.
    if (lineup) {
      lineup.addEventListener('mouseleave', resetToDefault);
      lineup.addEventListener('focusout', (e) => {
        if (!lineup.contains(e.relatedTarget)) resetToDefault();
      });
    }


    /* --- Состояние «живая оценка» ------------------------------------------
       ⚠️ ТАБЛИЦА ЦЕН — ЗАГЛУШКА. Нужна настоящая модель оценки от клиента
       или эндпоинт. Показывать живому продавцу выдуманную цифру нельзя —
       это ровно то, за что мы ругали старый сайт. */

    const MARKET = {
      ferrari:        { '812': 289000, 'f8': 275000, '296': 310000, 'roma': 215000, 'sf90': 480000, _base: 260000 },
      lamborghini:    { 'revuelto': 561000, 'huracan': 245000, 'urus': 225000, 'aventador': 410000, _base: 300000 },
      porsche:        { 'gt3': 237000, '911': 210000, 'turbo': 215000, 'taycan': 95000, _base: 150000 },
      mclaren:        { '720s': 258000, '765lt': 400000, 'artura': 230000, _base: 240000 },
      mercedes:       { 'amg gt': 342000, 'g63': 180000, 'sl': 130000, _base: 160000 },
      'aston martin': { 'db12': 245000, 'vantage': 165000, _base: 190000 },
      bentley:        { 'continental': 210000, 'bentayga': 195000, _base: 200000 },
      'rolls-royce':  { 'cullinan': 375000, 'ghost': 340000, 'wraith': 290000, _base: 330000 },
    };

    // Совпадение по вхождению, а не по равенству: человек пишет «812 Superfast»,
    // в таблице ключ «812».
    const lookup = (make, model) => {
      const makeKey = Object.keys(MARKET).find((k) => make.includes(k) || k.includes(make));
      if (!makeKey) return null;

      const table = MARKET[makeKey];
      const modelKey = Object.keys(table)
        .filter((k) => k !== '_base')
        .find((k) => model.includes(k) || (model.length > 2 && k.includes(model)));

      return modelKey ? table[modelKey] : table._base;
    };

    // Возраст и пробег давят на цену. Пол — 35% от базы: ниже уходить нечестно.
    const adjust = (base, year, miles) => {
      const age = Math.max(0, new Date().getFullYear() - (year || new Date().getFullYear()));
      let v = base * Math.pow(0.96, age);
      if (miles > 2000) v *= Math.max(0.62, 1 - ((miles - 2000) / 1000) * 0.011);
      return Math.max(base * 0.35, v);
    };

    // Похожая машина в ленте — доказательство рядом с оценкой.
    const findTwin = (make, model) => items.find((i) => {
      const n = i.dataset.name.toLowerCase();
      return n.includes(make) && (model.length > 2 ? n.includes(model) : true);
    });

    const compute = () => {
      const make  = form.querySelector('#q-make').value.trim().toLowerCase();
      const model = form.querySelector('#q-model').value.trim().toLowerCase();
      const year  = parseInt(form.querySelector('#q-year').value, 10);
      const miles = parseInt(form.querySelector('#q-mileage').value.replace(/\D/g, ''), 10) || 0;

      const base = make ? lookup(make, model) : null;

      // Марку не знаем — молча возвращаемся в покой, без «не найдено».
      if (!base) {
        cancelCount();
        estimating = false;
        markItem(null);
        showPane('default');
        hideGround();
        return;
      }

      cancelCount();
      estimating = true;
      markItem(null);
      showPane('estimate');

      if (est.status) {
        est.status.textContent = 'Computing';
        est.status.classList.add('is-working');
      }
      if (est.compare) est.compare.textContent = '';

      const label = [year || '', make, model].filter(Boolean).join(' ').toUpperCase();

      const mid = adjust(base, year, miles);
      const lo  = mid * 0.95;
      const hi  = mid * 1.06;

      const settle = () => {
        if (est.status) {
          est.status.textContent = 'Live';
          est.status.classList.remove('is-working');
        }

        const twin = findTwin(make, model);
        if (twin) markItem(twin);

        if (!est.compare) return;
        est.compare.innerHTML = twin
          ? 'We paid <b>' + twin.dataset.paid + '</b> for a ' +
            twin.textContent.trim() + ' &mdash; ' + twin.dataset.where
          : 'Based on <b>iBuy</b> purchases across 5 locations';
      };

      // Обе границы диапазона набегают вместе, пропорционально — иначе нижняя
      // и верхняя ползут вразнобой и читаются как ошибка.
      const range = (v) => {
        const ratio = hi === 0 ? 1 : v / hi;
        return money(lo * ratio) + ' – ' + money(v);
      };

      // Прибор считает сразу. Если он отключён — счёт всё равно нужен: на нём
      // висит settle(), а землю ведёт отдельный счётчик ниже.
      track(countTo(0, hi, 1100, (v) => {
        if (est.range) est.range.textContent = range(v);
      }, settle));

      // Земля — после перезаписи; она же снимает мерцание, когда досчитает.
      writeGround('Your estimated offer', null, label, true, () => {
        track(countTo(
          0, hi, 1100,
          (v) => setGroundFigure(range(v)),
          () => ground.root && ground.root.classList.remove('is-working'),
        ));
      });
    };

    let debounce = null;
    ['#q-make', '#q-model', '#q-year', '#q-mileage'].forEach((sel) => {
      form.querySelector(sel).addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(compute, 260);
      });
    });
  }


  /* --- Телефон: 3D-корпус и сцена «пять звёзд → галочка» --------------------
     Экран не листает отзывы (они уже набраны слева — это было бы дублирование),
     а показывает результат: звёзды зажигаются по одной, собираются, и на их
     месте дорисовывается галочка. Потом цикл повторяется.

     Вся анимация живёт в CSS-переходах, JS только переключает состояние. Значит
     prefers-reduced-motion гасит её сам: в reduced длительности сведены к 1мс,
     и переключение читается как мгновенная смена картинки. Поэтому в reduced мы
     просто не запускаем цикл и оставляем звёзды. */

  const verdict = document.getElementById('verdict');

  if (verdict) {
    const phone = verdict.closest('.phone');
    const frame = phone.querySelector('.phone__frame');

    /* Цикл. Те же три правила, что и у карты: не крутится за кадром, не крутится
       при скрытой вкладке, и не крутится, когда человек на неё смотрит вблизи. */
    let onScreen = false;
    let hover = false;
    let timer = null;

    const canRun = () => onScreen && !hover && !document.hidden && !REDUCED;

    const stop = () => { clearTimeout(timer); timer = null; };

    // Звёзды держим 2.4с (успеть досчитать до пяти), галочку — 2.8с: это
    // финальный кадр, ему нужно дать постоять.
    const step = (toCheck) => {
      if (!canRun()) return stop();
      verdict.classList.toggle('is-check', toCheck);
      verdict.classList.toggle('is-stars', !toCheck);
      timer = setTimeout(() => step(!toCheck), toCheck ? 2800 : 2400);
    };

    const start = () => {
      stop();
      if (!canRun()) return;
      timer = setTimeout(() => step(true), 2400);
    };

    // Порог низкий: сцена высокая, и на 0.4 она «невидима» даже когда телефон
    // уже наполовину в кадре — цикл просто не запускался.
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      onScreen ? start() : stop();
    }, { threshold: 0.15 }).observe(verdict);

    document.addEventListener('visibilitychange', () => {
      document.hidden ? stop() : start();
    });

    /* Наклон за курсором. Углы покоя заданы в CSS (--ry/--rx), JS только
       отклоняет от них — на тач-устройствах, где mousemove не приходит,
       телефон остаётся наклонённым сам по себе.

       Считаем от центра корпуса, а не от секции: иначе на широком экране
       телефон реагировал бы на курсор, который к нему и не приближался. */
    if (!REDUCED && window.matchMedia('(hover: hover)').matches) {
      const REST_RY = -15;
      const REST_RX = 7;
      const RANGE = 12;          // максимум ±12° от покоя
      let raf = 0;

      const tilt = (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = frame.getBoundingClientRect();
          // Нормируем на два радиуса: курсор в метре от телефона не должен
          // класть его набок.
          const dx = (e.clientX - (r.left + r.width / 2)) / (r.width * 2);
          const dy = (e.clientY - (r.top + r.height / 2)) / (r.height * 2);
          const clamp = (v) => Math.max(-1, Math.min(1, v));
          frame.style.setProperty('--ry', `${REST_RY + clamp(dx) * RANGE}deg`);
          frame.style.setProperty('--rx', `${REST_RX - clamp(dy) * RANGE}deg`);
        });
      };

      // Слушаем всю секцию: телефон должен «замечать» руку заранее, а не только
      // когда на него навели.
      const section = document.getElementById('reviews');
      section.addEventListener('mousemove', tilt);
      section.addEventListener('mouseleave', () => {
        frame.style.removeProperty('--ry');
        frame.style.removeProperty('--rx');
      });

      // Навёл прямо на телефон — цикл замирает: человек разглядывает предмет.
      phone.addEventListener('mouseenter', () => { hover = true; stop(); });
      phone.addEventListener('mouseleave', () => { hover = false; start(); });
    }
  }


  /* ==========================================================================
     ФОРМА
     Валидация ручная, а не через :invalid — нативная красит поле ещё до
     первого ввода. Ошибку показываем после submit и снимаем сразу, как
     человек начал править.
     ========================================================================== */

  if (form) {
    const showError = (input, message) => {
      const slot = form.querySelector(`[data-error-for="${input.id}"]`);
      input.setAttribute('aria-invalid', 'true');
      if (slot) slot.textContent = message;
    };

    const clearError = (input) => {
      const slot = form.querySelector(`[data-error-for="${input.id}"]`);
      input.removeAttribute('aria-invalid');
      if (slot) slot.textContent = '';
    };

    const validate = (input) => {
      const value = input.value.trim();

      if (input.required && !value) {
        return `${input.previousElementSibling.textContent.trim()} is required`;
      }

      if (input.id === 'q-year' && value) {
        const year = Number(value);
        const max = new Date().getFullYear() + 2;   // допускаем модельный год вперёд
        if (!Number.isInteger(year) || year < 1950 || year > max) {
          return `Enter a year between 1950 and ${max}`;
        }
      }

      if (input.id === 'q-vin' && value && value.length !== 17) {
        return 'A VIN is 17 characters';
      }

      return null;
    };

    const inputs = [...form.querySelectorAll('.field__input')];

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      let firstBad = null;

      inputs.forEach((input) => {
        const message = validate(input);
        if (message) {
          showError(input, message);
          if (!firstBad) firstBad = input;
        } else {
          clearError(input);
        }
      });

      if (firstBad) {
        firstBad.focus();
        return;
      }

      // TODO: шаг 2 (Location) и шаг 3 (Name / Email / Phone).
      // Куда уходит заявка — вопрос к клиенту: сейчас на сайте Contact Form 7.
      console.log('Step 1 OK', Object.fromEntries(new FormData(form)));
    });

    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        if (input.hasAttribute('aria-invalid')) clearError(input);
      });
    });
  }

})();
