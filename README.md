# Aley — the digital home of a city

A modern, multi-city platform for discovering and supporting a town: a business
directory, events, offers, an interactive map, community crowdfunding projects,
business dashboards, visitor accounts, an admin panel, and a no-code site CMS.
Built for **Aley, Lebanon** and architected to expand to other cities.

## Stack
- **web/** — React + Vite + TypeScript + Tailwind v4 (light/dark)
- **server/** — Node + Express + Prisma + **PostgreSQL** (Neon)

## Getting started

```bash
# 1. Backend
cd server
npm install
cp .env.example .env      # then fill in the values (see below)
npm run db:push           # create tables
npm run seed              # demo data (city, categories, businesses, projects)
npm run dev               # http://localhost:4100

# 2. Frontend (new terminal)
cd web
npm install
# create web/.env with VITE_GOOGLE_MAPS_API_KEY=... (optional, for the map)
npm run dev               # http://localhost:5174
```

The web dev server proxies `/api` → `http://localhost:4100`.

## Environment variables (server/.env)
| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `PORT` | API port (default 4100) |
| `JWT_SECRET` | Secret for signing auth tokens |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Admin panel login |

web/.env: `VITE_GOOGLE_MAPS_API_KEY` (interactive map; degrades gracefully without it).

## Demo logins
- **Admin:** `admin@aley.com` / `aley` → `/admin`
- **Business owner:** `owner@aley.com` / `owner` → `/owner`
- **Visitor:** register from the site.

## Features
- Business directory with search, filters (open-now, delivery, rating, price), categories
- Rich business profiles (gallery, hours, map, socials, offers, events, reviews)
- Interactive map with filters
- Events & offers
- **Community Projects** — civic crowdfunding (donations, transparency, updates, votes, follows)
- **Business dashboards** — owners manage their listing, photos, hours, offers, events, reviews, analytics
- **Visitor accounts** — favorites/saved places, reviews
- **Admin panel** — businesses, categories, review moderation, projects, events/offers, cities, users
- **Site Content CMS** — edit homepage, hero, sections, About/Love Aley, branding with no code

> Note: online payments for orders/donations are simulated in this build (no real gateway yet).
