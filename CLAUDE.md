# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SkinCareFriends: public product showcase + admin panel (CRUD). Node/Express API serving a static frontend, images on Cloudinary, data in MongoDB. Comments and user-facing strings are in Portuguese (pt-BR).

## Commands

```bash
npm install
npm run dev          # nodemon
npm start            # production start
docker compose up --build   # app + mongo locally (compose overrides MONGODB_URI to the internal service)
bash scripts/railway-setup.sh [project-name]   # provisions Railway project + Mongo plugin + envs from .env
```

No test suite, linter, or build step is configured.

A `.env` must exist for both local runs and the Railway setup script; copy from `.env.example`. The app exits at boot if `MONGODB_URI` is missing.

## Architecture

Single-process Express app — there is no separate frontend build. All HTTP routes live in `server.js`; the static HTML under `public/` consumes the JSON API on the same origin.

- **`server.js`** — every route (pages, auth, products, healthcheck) plus Mongo bootstrap. `start()` connects to Mongo first, then listens; order matters.
- **`middleware/auth.js`** — `requireAuth` gates admin routes. Dual-mode: redirects to `/login` for HTML clients, returns 401 JSON otherwise. Reuse this pattern rather than inventing per-route checks.
- **`config/cloudinary.js`** — exports the configured `cloudinary` SDK and a ready-to-use `multer` instance backed by `multer-storage-cloudinary`. Uploaded file objects carry `path` (CDN URL) and `filename` (Cloudinary `public_id`); both are persisted on `Product` so deletes/replaces can call `cloudinary.uploader.destroy(imagePublicId)`. When replacing an image on PUT, destroy the old `imagePublicId` before overwriting.
- **`models/Product.js`** — Mongoose model. `price` is intentionally a `String` (free-form display, not a number) and `timestamps: true` drives the `createdAt DESC` sort in the list endpoint.

### Auth model

Session-based with a single fixed credential pair from env (`ADMIN_USER` / `ADMIN_PASS`) — there is no user table. `express-session` uses the default MemoryStore, so sessions do not survive restarts and do not scale across instances. `trust proxy` is on and cookies flip to `secure` when `NODE_ENV=production` (required behind Railway's proxy).

### Deploy

Railway is the target. Two paths coexist:
- `railway.json` + `Procfile` → Nixpacks build, `node server.js`, healthcheck `/healthz`.
- `Dockerfile` → two-stage node:20-alpine; used by `docker-compose.yml` locally. Railway currently prefers Nixpacks (per `railway.json`); don't delete one assuming the other is unused.

`scripts/railway-setup.sh` reads `.env` line-by-line and pushes every key as a Railway variable, **rewriting `MONGODB_URI` to `${{ MongoDB.MONGO_URL }}`** so the plugin stays the source of truth. If you add a new env var, it propagates automatically on next run of the script — no code change needed.

## Design system

`design-system.md` defines the visual language (palette, typography, component rules). Honor it when editing `public/*.html`: Playfair Display for headings, Inter for body, Rose Gold (`#E2A9A1`) CTAs, pill buttons (`999px`), 20px card radii, near-invisible shadows.
