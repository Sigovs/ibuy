/* ==========================================================================
   SECTION 02 — NETWORK
   Точечная карта США + локации Marshall Goldman.

   Точки страны рисуем в <canvas> (их 3094 — в SVG это 3094 узла DOM, и любая
   анимация начинает лагать). Маркеры, дуги и подписи — SVG поверх: их мало,
   зато они интерактивны и масштабируются.
   ========================================================================== */

import { MAP_W, MAP_H, MAP_DOTS, MAP_CITIES } from './us-map.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DOTS = MAP_DOTS.split(' ').map((p) => p.split(',').map(Number));

export function initNetwork() {
  const root = document.getElementById('network');
  if (!root) return;

  const canvas = root.querySelector('.map__dots');
  const svg    = root.querySelector('.map__svg');
  const items  = [...root.querySelectorAll('.loc')];
  if (!canvas || !svg) return;

  const ctx = canvas.getContext('2d');

  /* --- Поле точек ---------------------------------------------------------
     Перерисовываем на resize: canvas растровый, и без учёта devicePixelRatio
     на retina точки превращаются в кашу. */

  const paintDots = () => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const scale = rect.width / MAP_W;
    const r = Math.max(1, 1.5 * scale);

    /* Цвет берём из токена, а не из литерала: canvas не знает про тему, и на
       светлой секции белые точки просто исчезли бы. Читаем на каждой отрисовке,
       поэтому смена темы подхватится сама. */
    ctx.fillStyle = getComputedStyle(root).getPropertyValue('--map-dot').trim()
                 || 'rgba(255, 255, 255, 0.26)';
    DOTS.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * scale, y * scale, r, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  paintDots();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paintDots, 150);
  });


  /* --- Дуги ---------------------------------------------------------------
     Требование клиента №3: машины перегоняются между любыми локациями.
     Дуга — это и есть перегон. Рисуем её как кривую, выгнутую вверх: прямая
     линия между городами читалась бы как граница, а не как маршрут. */

  const arcLayer = svg.querySelector('.map__arcs');

  const arcPath = (a, b) => {
    const [x1, y1] = a;
    const [x2, y2] = b;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // Чем дальше города, тем выше дуга.
    const lift = Math.hypot(x2 - x1, y2 - y1) * 0.22;
    return `M ${x1} ${y1} Q ${mx} ${my - lift} ${x2} ${y2}`;
  };

  const drawArcs = (fromKey) => {
    arcLayer.innerHTML = '';
    const from = MAP_CITIES[fromKey];
    if (!from) return;

    Object.entries(MAP_CITIES).forEach(([key, to]) => {
      if (key === fromKey) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', arcPath(from, to));
      path.setAttribute('class', 'arc');
      arcLayer.appendChild(path);

      if (REDUCED) return;

      // Дуга прочерчивается, а не появляется целиком.
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();   // форсируем reflow, иначе анимации не будет
      path.style.transition = 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.30, 1)';
      path.style.strokeDashoffset = '0';
    });
  };

  const clearArcs = () => { arcLayer.innerHTML = ''; };


  /* --- Связка карты и списка ---------------------------------------------- */

  const markers = new Map();
  root.querySelectorAll('.marker').forEach((m) => markers.set(m.dataset.city, m));

  const panel = {
    root:    root.querySelector('.locpanel'),
    name:    root.querySelector('[data-slot="loc-name"]'),
    address: root.querySelector('[data-slot="loc-address"]'),
    phone:   root.querySelector('[data-slot="loc-phone"]'),
  };

  const select = (item) => {
    const key = item.dataset.city;

    items.forEach((i) => i.classList.toggle('is-active', i === item));
    markers.forEach((m, k) => m.classList.toggle('is-active', k === key));

    drawArcs(key);

    if (panel.root) {
      panel.name.textContent    = item.dataset.name;
      panel.address.textContent = item.dataset.address;

      // У новой локации ещё нет ни адреса, ни телефона — не выдумываем.
      if (item.dataset.phone) {
        panel.phone.textContent = item.dataset.phone;
        panel.phone.href = 'tel:' + item.dataset.phone.replace(/\D/g, '');
        panel.phone.hidden = false;
      } else {
        panel.phone.hidden = true;
      }

      panel.root.classList.add('is-open');
    }
  };

  const reset = () => {
    items.forEach((i) => i.classList.remove('is-active'));
    markers.forEach((m) => m.classList.remove('is-active'));
    clearArcs();
    if (panel.root) panel.root.classList.remove('is-open');
  };


  /* --- Автоперебор ---------------------------------------------------------
     Пока никто не трогает список, карта сама медленно обходит локации:
     Cleveland → Baltimore → Beverly Hills → ... Иначе в покое секция мёртвая,
     и человек может вообще не понять, что с ней можно взаимодействовать.

     DWELL великоват намеренно: дуга прочерчивается 900ms, и ей надо дать
     постоять. Быстрый перебор превращается в мигание. */

  const DWELL = 4200;

  let timer = null;
  let index = 0;
  let onScreen = false;
  let engaged = false;   // человек взял управление на себя

  const step = () => {
    select(items[index % items.length]);
    index += 1;
  };

  const canRun = () => onScreen && !engaged && !document.hidden && !REDUCED;

  const startAuto = () => {
    stopAuto();
    if (!canRun()) return;

    step();                                  // сразу, без ожидания первого тика
    timer = setInterval(() => {
      if (!canRun()) return stopAuto();
      step();
    }, DWELL);
  };

  const stopAuto = () => {
    clearInterval(timer);
    timer = null;
  };

  // Не крутим перебор, когда секции нет на экране: она в самом низу страницы,
  // и без этого таймер жёг бы процессор всё время, что человек читает герой.
  const io = new IntersectionObserver((entries) => {
    onScreen = entries[0].isIntersecting;
    if (onScreen) {
      startAuto();
    } else {
      stopAuto();
      if (!engaged) reset();
    }
  }, { threshold: 0.25 });

  io.observe(root);

  // Скрытая вкладка — таймер не нужен.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
    else startAuto();
  });


  /* --- Человек всегда важнее автоперебора ---------------------------------- */

  let resumeTimer = null;

  /* Возврат автоперебора НЕ должен зависеть только от mouseleave.
     На тачскрине его не существует: человек тапнул локацию — и карта замерла бы
     навсегда. Поэтому любое вмешательство всегда заводит таймер возврата,
     а уход курсора просто укорачивает его. */
  const scheduleResume = (delay) => {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      engaged = false;
      startAuto();
    }, delay);
  };

  const takeOver = (item) => {
    engaged = true;
    stopAuto();
    select(item);

    // Перебор продолжится со СЛЕДУЮЩЕЙ за выбранной, а не с того места, где
    // его прервали: иначе после ухода курсора карта прыгнет обратно к городу,
    // который человек только что посмотрел.
    index = items.indexOf(item) + 1;

    // Страховка на случай, когда mouseleave не придёт вообще (тач).
    scheduleResume(9000);
  };

  items.forEach((item) => {
    item.addEventListener('mouseenter', () => takeOver(item));
    item.addEventListener('focus', () => takeOver(item));
    item.addEventListener('click', () => takeOver(item));   // тач: наведения нет
  });

  // Уход со ВСЕГО списка, а не с одной строки: иначе при переходе между
  // соседними панель успевает мигнуть.
  const list = root.querySelector('.locs');

  if (list) {
    // Пауза перед возвратом: если карта дёрнется в ту же секунду, как курсор
    // ушёл, это читается как сбой, а не как «она снова сама».
    list.addEventListener('mouseleave', () => scheduleResume(1600));
    list.addEventListener('focusout', (e) => {
      if (!list.contains(e.relatedTarget)) scheduleResume(1600);
    });
  }
}
