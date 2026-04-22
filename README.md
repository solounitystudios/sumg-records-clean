# SUMG Records
SUMG Records official website, CMS, storefront, artist ecosystem, and media platform.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Auth**: Cookie-based session (stateless)

## Routes

### Public
- `/` — Homepage
- `/artists` — Artist roster
- `/artists/[slug]` — Artist profile
- `/producers` — Producer network
- `/brands` — Brand system
- `/brands/[slug]` — Brand detail
- `/releases` — Full discography
- `/news` — Label news

### Admin (auth required)
- `/login` — Access portal
- `/admin` — Overview dashboard
- `/admin/artists` — Artist management
- `/admin/releases` — Release command center
- `/admin/royalties` — Royalty platform

### Artist Dashboard (auth required)
- `/dashboard` — Dashboard overview
- `/dashboard/royalties` — Earnings breakdown
- `/dashboard/releases` — Release status

## Dev

```bash
npm install
npm run dev
```

Default admin password: `sumg2024`
Override via `ADMIN_PASSWORD` environment variable.

## Build

```bash
npm run build
npm run lint
```
