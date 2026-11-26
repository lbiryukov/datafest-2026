# datafest-2026 — инструкции проекта

Статическая страница без сборки: `index.html` + `app.js`, данные в `data/`. Публикация: GitHub Pages из ветки `main`, корень.

- Программа фестиваля — `data/agenda.json`. При обновлении расписания: источник — публичная Google-таблица, которую грузит https://www.datafest.ge/agenda/ (CSV, колонки Date, Start, End, Room, Row type, Format, Track, Title, Speakers, Description, Registration link, Show). id сессии = номер строки в этой таблице; не перенумеровывать, иначе сломается `data/plan.json`.
- План Льва — `data/plan.json` (`{"updated": ISO, "picks": [id,…]}`). Его пишет страница; правишь руками — сохраняй формат.
- Не класть токены и `.env` в репозиторий.
- Тексты для пользователя по-русски, даты DD/MM/YYYY, без эмодзи.
