# Заметки клиента

Получено от Alex 13 июля 2026. Ниже — исходный текст дословно, потом разбор.

---

## Оригинал

> **Additional notes:**
>
> 1. **Immersive Hero Experience**
>    Incorporate a cinematic hero video that immediately establishes the luxury feel of the brand. They expect to have professional footage available once their new facility is completed in the coming weeks.
>
> 2. **Build Trust Through Social Proof**
> 3. Feature Google Reviews prominently to reinforce credibility, customer satisfaction, and the premium buying experience.
>
> 4. **Highlight the Marshall Goldman Network**
> 5. Emphasize their affiliation with the Marshall Goldman family of dealerships, showcasing the strength and reach of the brand. With locations in Cleveland, Maryland, Beverly Hills, Newport Beach, and Kansas City, customers should understand that vehicles can be purchased from or transferred between any location.
>
> 6. **Nationwide Luxury Concierge Experience**
> 7. Reinforce that clients can complete a purchase regardless of location, with nationwide vehicle transportation available. Position the dealership as an established, trusted luxury retailer with a transparent buying process and a national presence.

*(Нумерация в оригинале сбита: чётные пункты — заголовки, нечётные — их расшифровка. По сути требований четыре.)*

---

## Четыре требования

### 1. Кинематографичный видео-герой
Первый экран — видео, которое сразу задаёт премиум. **Профессиональные съёмки будут через несколько недель**, когда клиент достроит новый объект.

→ Герой надо строить **под видео с первого дня**: `<video>` с постером, фото как фолбэк, `prefers-reduced-motion`, мобильный фолбэк на статику. Пока footage нет — на месте видео стоит кадр, но архитектура секции уже видео-готовая. Переделывать потом нельзя.

### 2. Доверие через соцдоказательство
**Google Reviews — на видном месте.** Не одна цитата в белой коробке, как сейчас, а реальная витрина отзывов.

### 3. Сеть Marshall Goldman
Подчеркнуть принадлежность к семье дилерств Marshall Goldman — силу и охват бренда.

**Пять локаций:** Cleveland · Maryland · Beverly Hills · Newport Beach · Kansas City.
Машины можно **покупать в любой и перегонять между локациями**.

> ⚠️ На текущем сайте карта показывает Cleveland, Miami, Kansas City, Beverly Hills — **Miami лишний, Maryland и Newport Beach отсутствуют**. Список из заметок считаем верным.

### 4. Общенациональный luxury-конcierge
Клиент **завершает покупку из любой точки страны**, есть общенациональная перевозка машин. Позиционирование: устоявшийся, надёжный luxury-ритейлер с прозрачным процессом покупки и национальным присутствием.

---

## ⚠️ Главный вопрос: сайт про ПОКУПКУ или про ПРОДАЖУ?

Заметки последовательно говорят о том, что клиент **покупает машину У ДИЛЕРА**:

- «vehicles can be **purchased** from or transferred between any location»
- «clients can complete a **purchase** regardless of location»
- «established, trusted luxury **retailer** with a transparent **buying process**»
- «nationwide vehicle **transportation**»

Но ibuylc.com сегодня — ровно противоположное. Это лидоген на **выкуп**: «Sell My Car», «The Nation's Largest Luxury & Exotic Car **Buyer**», форма Year/Make/Model/VIN, 30 SEO-страниц «sell my {марка}». iBuy = *они* покупают машину у частника.

Возможные прочтения:

| | Что это значит для сайта |
|---|---|
| **A. Заметки на самом деле про Marshall Goldman** (дилерство, которое продаёт) — а не про iBuy | Мы делаем не тот сайт. Нужно уточнить объём. |
| **B. iBuy разворачивают в две стороны** — и выкуп, и продажа/консьерж | Сайт получает два равных входа: «Sell us your car» и «Buy from our network». Меняется вся структура. |
| **C. «Purchase» написано с точки зрения iBuy** (это *они* покупают у клиента), просто формулировка кривая | Всё остаётся как в аудите: чистый лидоген на выкуп. Тогда «transferred between locations» = логистика выкупленных машин. |

**Это надо снять с клиента до того, как рисовать хоть один экран.** От ответа зависит, что вообще стоит на первом экране: форма «получить оффер за свою машину» — или витрина инвентаря и консьерж.

---

## Что уже понятно независимо от ответа

- Герой строим видео-готовым.
- Google Reviews — отдельная сильная секция.
- Пять локаций Marshall Goldman + общенациональная перевозка — сильный блок, и он же заменяет ту клипартовую карту США.
- Наследие Marshall Goldman (с 1978) — вытаскиваем из мелкой подписи под логотипом.
