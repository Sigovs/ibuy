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
    /* offsetWidth/offsetHeight, а НЕ getBoundingClientRect.

       Canvas лежит внутри наклонённой плоскости (rotateX). getBoundingClientRect
       возвращает СПРОЕЦИРОВАННЫЙ размер — сплющенный наклоном: высота приходила
       371 вместо 489. Битмап получался на четверть короче нужного, и весь юг
       страны — Техас, Флорида, залив — просто не рисовался: точки уезжали
       за нижний край битмапа. Карта выглядела чётко обрезанной, и никакая
       правка секции этого не лечила.

       offset* отдаёт РАЗМЕР В РАЗМЕТКЕ и трансформами не искажается. */
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (!w || !h) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const scale = w / MAP_W;
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
    resizeTimer = setTimeout(() => {
      paintDots();
      // Дуги привязаны к ЭКРАННЫМ координатам маркеров: изменился размер —
      // города уехали, и дуги надо перечертить, иначе они повиснут в стороне.
      if (currentKey) drawArcs(currentKey);
    }, 150);
  });


  /* --- Дуги ---------------------------------------------------------------
     Требование клиента №3: машины перегоняются между любыми локациями.

     Дуги живут в ОТДЕЛЬНОМ, НЕ наклонённом слое (.map__air) поверх плоскости.
     Если бы они были внутри наклонённого <svg>, то легли бы на землю крашеными
     полосами. Здесь они выгибаются НАД страной — и только тогда читаются как
     маршруты, а не как границы.

     Из-за этого концы дуг НЕЛЬЗЯ брать из MAP_CITIES: те координаты — в системе
     карты, а после rotateX город на экране оказывается совсем не там. Берём
     реальные экранные позиции маркеров (getBoundingClientRect уже учитывает
     3D-трансформ) и пересчитываем их в координаты слоя. */

  const air = root.querySelector('.map__air');
  const arcLayer = air.querySelector('.map__arcs');

  /* Экранная позиция города = центр его точки после наклона. */
  const screenPoint = (key) => {
    const dot = root.querySelector(`.marker[data-city="${key}"] .marker__dot`);
    if (!dot) return null;

    const r = dot.getBoundingClientRect();
    const box = air.getBoundingClientRect();
    return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  };

  const arcPath = (a, b) => {
    const [x1, y1] = a;
    const [x2, y2] = b;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    // Чем дальше города, тем выше летит маршрут.
    const lift = Math.hypot(x2 - x1, y2 - y1) * 0.26;
    return `M ${x1} ${y1} Q ${mx} ${my - lift} ${x2} ${y2}`;
  };

  /* Слой рисуем в ПИКСЕЛЯХ карты, а не в её внутренних координатах: экранные
     позиции маркеров приходят именно в пикселях. */
  const syncAirViewBox = () => {
    const box = air.getBoundingClientRect();
    if (box.width) air.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  };

  let currentKey = null;

  const drawArcs = (fromKey) => {
    currentKey = fromKey;
    arcLayer.innerHTML = '';
    syncAirViewBox();

    const from = screenPoint(fromKey);
    if (!from) return;

    Object.keys(MAP_CITIES).forEach((key) => {
      if (key === fromKey) return;

      const to = screenPoint(key);
      if (!to) return;

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

  const clearArcs = () => {
    currentKey = null;
    arcLayer.innerHTML = '';
  };


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
