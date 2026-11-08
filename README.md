# MindSuite Offerings Explorer (React)

React + Vite rebuild of the MindSuite capabilities catalogue: 5 service families, 34 areas, 176 offerings.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
```

## Structure
- `src/data/catalogue.json` – all families, areas and offerings (edit content here)
- `src/data/catalogue.js` – flattened lookups and catalogue search (with SSO/MFA/IAM/DR/CI/CD aliases)
- `src/data/matcher.js` – offline keyword matcher behind the "Help me choose" guide
- `src/components/` – `Hero`, `Globe` (animated canvas), `MapColumn` (scroll-synced service map),
  `Catalogue`, `Dialogs` (search + interests drawer), `Assistant`
- `src/hooks/` – `useInterests` (localStorage, cross-tab sync), `useReadingPosition` (scroll spy)

## AI recommendations (optional)
The guide matches catalogue terms locally by default. To use an AI backend, set
`VITE_ASSISTANT_URL` to an endpoint that accepts `POST {messages}` and returns
`{message, mode, suggestions: [{id, reason}]}` (and `GET` → `{mode}`).
