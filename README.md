# Asseto Spa Scroll

A Node-served Vite + Three.js scroll experience where the car races around a real track model with day/night lighting and weather controls.

## Structure

```text
backend/
  src/                  Node HTTP server and API endpoints
  public/app/           Generated frontend build, ignored by Git
frontend/
  src/                  Three.js scene
  public/               GLB, Draco, and texture assets
screenshots/            Local visual-check screenshots, ignored by Git
```

## Local Run

```bash
corepack enable
yarn install
yarn build
yarn start
```

The Node server listens on `http://localhost:3000` by default and serves the built frontend from `backend/public/app`.

If you prefer npm, `npm install`, `npm run build`, and `npm start` also work.

For Vite-only frontend iteration:

```bash
yarn dev:frontend
```

## API

- `GET /api/health`
- `GET /api/config`

Both endpoints report whether an external Postgres connection string is configured. The app does not install or run Postgres locally.

## Environment

Copy `.env.example` into your deployment environment and set values there.

```text
PORT=3000
DATABASE_URL=postgresql://...
DATABASE_SSL=true
```

`DATABASE_URL` is reserved for an external Postgres instance. No Postgres container or local database installation is included.

## Docker

```bash
docker build -t asseto-spa-scroll .
docker run --rm -p 3000:3000 --env-file .env asseto-spa-scroll
```

Or with Compose:

```bash
docker compose up --build app
```

## Dokploy

Use the repository Dockerfile as the app build source. Set these environment variables in Dokploy:

```text
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
DATABASE_URL=<external postgres url>
DATABASE_SSL=true
```

If using Dokploy Compose mode, `docker-compose.yml` is ready for the app service. Configure domain routing or proxy behavior inside Dokploy.

## Fly

`fly.toml` is included for Docker-based Fly deployment. Before deploying, change the `app` value if `asseto-spa-scroll` is not available in your Fly account.

```bash
fly deploy
```

Set secrets on Fly instead of committing them:

```bash
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set DATABASE_SSL="true"
```

## Assets

- Car: `frontend/public/models/ferrari.glb`.
- Active track: `frontend/public/models/real track/source/track.glb`.
- Version 1 and Version 3 backup code/assets remain under `backup/version-1-and-3/` and are not imported by the active app.
