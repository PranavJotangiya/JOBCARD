# JOBCARD — frontend

Angular 22 (standalone, signals, lazy routes). Mobile-first.

```bash
npm --workspace frontend start     # ng serve → http://localhost:4200 (proxies /api → :3000)
npm --workspace frontend run build # production bundle → dist/frontend/browser
npm --workspace frontend run lint
npm --workspace frontend test      # Vitest
```

See the repository root [README.md](../README.md) and [docs/](../docs) for the
full picture. Feature areas: `src/app/{auth,dashboard,jobber,manufacturer,jobcards,reports,settings}`;
infrastructure in `src/app/core`; reusable UI in `src/app/shared`; shells in
`src/app/layout`. API base URL and other env values live in
`src/environments/environment*.ts`.
