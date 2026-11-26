# datafest-2026 — инструкции проекта

Статическая страница без сборки: `index.html` + `app.js`, данные в `data/`. Публикация: GitHub Pages из ветки `main`, корень.

- Программа фестиваля — `data/agenda.json`. При обновлении расписания: источник — публичная Google-таблица, которую грузит https://www.datafest.ge/agenda/ (CSV, колонки Date, Start, End, Room, Row type, Format, Track, Title, Speakers, Description, Registration link, Show). id сессии = номер строки в этой таблице; не перенумеровывать, иначе сломается `data/plan.json`.
- План Льва — Firestore `datafest/2026` в Firebase-проекте trips (`trips-250e3`), вход через Google. Правила доступа живут в репозитории trips (`firestore.rules`, блок `datafest`). Подробнее — README.
- Не класть токены и `.env` в репозиторий.
- Тексты для пользователя по-русски, даты DD/MM/YYYY, без эмодзи.
- После правки `app.js` увеличивай версию в `index.html` (`app.js?v=N`): GitHub Pages кэширует файлы на 10 минут.
