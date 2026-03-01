# RemedyPillsPharmacy — Deployment & Local Development

This project is a full-stack TypeScript app:
- **Backend:** Express (Node)
- **Frontend:** Vite + React
- **Database:** Postgres (via Drizzle ORM)

## Local development (VS Code)

### 1) Install dependencies
```bash
npm install
```

### 2) Create a local `.env`
Create a `.env` file (do **not** commit it) based on `.env.example`.

Typical local values:
```env
NODE_ENV=development
PORT=5050
APP_BASE_URL=http://localhost:5050
SESSION_SECRET=replace_with_a_long_random_secret
DATABASE_URL=postgres://localhost:5432/remedypills
```

### 3) Run database schema
```bash
npm run db:push
```

### 4) Start the server
```bash
npm run dev
```

Open: `http://localhost:5050`

> Note: macOS can reserve port **5000** for AirPlay/AirTunes, so 5050 is recommended.

## Deploy on Render (recommended)

High level:
1. Create a **PostgreSQL** database on Render.
2. Create a **Web Service** from this GitHub repo.
3. Set environment variables in Render (from `.env.example`), especially:
   - `DATABASE_URL` (Render provides this)
   - `SESSION_SECRET`
   - `APP_BASE_URL` (your Render URL / custom domain)
   - OAuth keys if you enable Google/Facebook sign-in
4. Build & start:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

After deployment, run `npm run db:push` locally against the Render DB only if you know what you’re doing—normally you’ll run schema migrations as part of your release process.

## Security notes
- Never commit `.env` (secrets).
- Use strong `SESSION_SECRET`.
- Keep the repo **private** if it includes any pharmacy operational logic.
