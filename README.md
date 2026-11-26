# DataFest Tbilisi 2026: программа и мой план

Страница с программой фестиваля (26–28/11/2026, Pullman Tbilisi Axis Towers) и личным планом посещения.

- Сайт: https://lbiryukov.github.io/datafest-2026/ (GitHub Pages, ветка `main`, корень).
- `index.html`, `app.js` — страница без сборки.
- `data/agenda.json` — 90 сессий с официального сайта (https://www.datafest.ge/agenda/, состояние на 25/11/2026), русские пересказы и рекомендации Claude (`rec`, `why`, `route`).

## Где хранится план

Как в проекте trips: вход через Google (Firebase Auth), план — документ Firestore `datafest/2026` в проекте `trips-250e3`
(`{"picks": [id из agenda.json], "updated": ISO}`). Доступ ограничен правилами `firestore.rules` репозитория trips.
Без входа отметки хранятся только в браузере и уходят в облако после входа.

Что должно быть настроено:
1. В `trips/firestore.rules` — блок `match /datafest/{doc}` (см. ниже), задеплоен.
2. Firebase Console → Authentication → Settings → Authorized domains — добавлен `lbiryukov.github.io`.

```
    match /datafest/{doc} {
      allow read: if traveler();
      allow write: if traveler()
        && request.resource.data.keys().hasOnly(['picks', 'updated'])
        && request.resource.data.picks is list
        && request.resource.data.picks.size() < 300;
    }
```
