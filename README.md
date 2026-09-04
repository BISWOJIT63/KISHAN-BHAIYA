# KISHAN BHAIYA

KISHAN BHAIYA is a production-oriented MERN agriculture marketplace and smart-logistics platform. It combines a direct-to-consumer marketplace with structured B2B procurement, farmer/FPO workspaces, lot traceability, pre-harvest demand, surplus rescue, multi-seller fulfilment and consolidated logistics.

The repository is a modular monolith: MongoDB is the system of record, Express owns business rules, Socket.IO delivers real-time enhancements, and React consumes the same REST APIs in every role-specific experience.

## Quick start

Requirements: Node.js 20+, npm 10+ (or pnpm 9+), and MongoDB 7+. Docker is optional.

```bash
cp .env.example .env
docker compose up -d mongodb
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs on `http://localhost:5000`.

## Vercel deployment

Deploy the frontend and API as two Vercel projects from the same repository:

1. Create an API project with **Root Directory** set to `server`. Vercel detects `src/index.js`, which exports the Express application as a serverless function. Do not set a start command or deploy `src/server.js` as the function entry point.
2. In the API project's Production (and Preview, if needed) environment variables, set `NODE_ENV=production`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CRON_SECRET`, `CLIENT_URL`, `ALLOW_MEMORY_FALLBACK=false`, and `AUTO_SEED_DEMO=false`. `CLIENT_URL` must be the HTTPS URL of the frontend Vercel project.
3. Create a frontend project with **Root Directory** set to `client`. Add `VITE_API_URL=https://<your-api-project>.vercel.app/api/v1`, then redeploy the frontend.
4. The included `server/vercel.json` invokes the freshness job once daily at 02:00 UTC. Set the same `CRON_SECRET`; Vercel sends it to the secured job endpoint.

Vercel Functions cannot act as a WebSocket server, so Socket.IO is deliberately not started by the serverless entry point. The production frontend automatically keeps realtime disabled unless `VITE_SOCKET_URL` points to a dedicated Socket.IO host; REST mutations and cache refetching remain fully functional. Uploads also need a persistent object-storage provider such as Cloudinary before using them in production because a serverless filesystem is not durable.

The default local database is `kisanexpress-demo`. In development, the server non-destructively inserts missing fictional demo records there; it never replaces an existing record. Set `AUTO_SEED_DEMO=false` to disable this behavior. If MongoDB is unavailable, the API starts with a clearly logged in-memory demo store when `ALLOW_MEMORY_FALLBACK=true`. All UI mutations still travel through Express, but that fallback resets when the server restarts. Production never enables either demo behavior.

For pnpm, use `pnpm install` and `pnpm dev`. The dedicated demo database fills itself non-destructively on first development startup.

## Development demo accounts

All accounts are fictional and use the same development-only password: `KishanBhaiya@2026`.

| Role                          | Email                              |
| ----------------------------- | ---------------------------------- |
| Individual buyer              | `consumer@kishanbhaiya.demo`       |
| Business buyer                | `buyer@kishanbhaiya.demo`          |
| Approved farmer               | `farmer@kishanbhaiya.demo`         |
| Approved FPO manager          | `fpo@kishanbhaiya.demo`            |
| Active fleet partner          | `fleet@kishanbhaiya.demo`          |
| Pending farmer                | `pending.farmer@kishanbhaiya.demo` |
| Changes-requested FPO         | `pending.fpo@kishanbhaiya.demo`    |
| Logistics operator            | `logistics@kishanbhaiya.demo`      |
| Verification/operations admin | `admin@kishanbhaiya.demo`          |

Never use these credentials outside local development.

## Working vertical slices

- Retail: browse → product → quantity-aware cart → checkout → mock/test payment → order → tracking.
- Buyer-only commerce: consumer and business-buyer accounts can browse the marketplace and purchase. Producer, fleet, logistics and admin accounts remain limited to their role-specific operational workspaces.
- Accessible commerce: English, Hindi and Odia cover authentication, role-aware navigation, marketplace discovery, saved produce, cart, checkout and account preferences. Signed-in users change language only from Profile → App preferences.
- Personalization: saved-produce lists, device-location detection with the nearest supported Odisha market area, notification read state, alert preferences and low-bandwidth motion reduction persist safely on the device.
- Discovery and trust: product pages include related and recently viewed produce, save/share actions, and links to public-safe seller profiles with active catalogs, reliability context and inventory summaries.
- Bulk direct: crossing a product threshold applies the seller’s published bulk price while remaining a direct order.
- Procurement: post requirement → inspect explainable matches → compare offers → counter → accept → reserve FEFO inventory → create order.
- Multi-seller: generate a transparent capacity-aware combination → enforce full-fill or buyer minimum-fill rules → reserve exact FEFO lots → create visible seller sub-fulfilments.
- Pre-harvest: publish expected supply → reserve conditionally → convert the harvest to an actual lot.
- Surplus rescue: freshness job flags lots → seller confirms a promotional price → rescue offer is persisted.
- FPO: farmer requests membership → the matching FPO manager approves or rejects → approved member joins aggregation and settlement workflows.
- Automatic logistics: accepting a bulk split creates capacity-safe trips, assigns available compatible vehicles and verified fleet partners, and optimizes pickup → hub → delivery routes with fuel, savings, capacity and cold-chain signals.
- Fleet trip execution: manage assigned vehicles and trips → follow the enforced next stop → complete each hand-off → recalculate remaining stops → report an exception or capture pickup/delivery proof.
- Failure recovery: report shortage → preserve audit event → calculate an alternate-supplier plan for explicit approval.
- Disputes: open case → attach context/evidence → admin review/resolution → audit log.
- Verification: role-aware registration → restricted verification center → private document metadata → admin approve/request changes/reject/suspend/reactivate → notification and audit log.
- Approval enforcement: pending grower, business and logistics accounts can edit permitted profile fields and provide documents, but Express blocks operational APIs until `accountStatus=ACTIVE`.
- Logistics separation: fleet partners manage assigned fleet trips, while logistics operators retain cross-fleet route-planning access.

## Architecture

```text
client/                      React + Vite PWA
  src/api/                   Central Axios client and auth interceptor
  src/components/            Shared cards, navigation, status, maps and real-time bridge
  src/layouts/               Public and role-aware dashboard shells
  src/pages/                 Marketplace, procurement, producer, logistics and admin screens
  src/store/                 Zustand UI/session/cart state only
  src/data/                  Dexie offline listing drafts
  src/i18n/                  English, Hindi and Odia resources

server/                      Express modular monolith
  src/config/                Environment and Mongo connection
  src/models/                Mongoose schemas, indexes and references
  src/routes/                Versioned REST surface
  src/services/              Persistence boundary, matching and route optimisation
  src/providers/             Payment, routing, weather, pricing and upload boundaries
  src/jobs/                  Idempotent-friendly freshness scheduling
  src/seed/                  Relational Odisha development data
  src/tests/                 API and business-logic tests
```

TanStack Query owns server state and cache invalidation. Zustand persists only safe session presentation, preferences and cart drafts. Socket.IO is authenticated when a token exists and invalidates cached source-of-truth records after persisted server events.

The matching weights are centralized in `server/src/services/matching.js`. The route service exposes a provider-compatible result shape so a future Python FastAPI + OR-Tools service can replace the local heuristic without coupling the React UI to an algorithm.

## API overview

All endpoints live under `/api/v1` and respond as `{ success, data, meta? }` or `{ success: false, error }`.

| Domain       | Endpoints                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Auth         | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`; `GET/PATCH /auth/me`; profile image upload/removal                                          |
| Verification | `GET /auth/verification`, `POST /auth/verification/documents`, `/auth/verification/submit`; `GET /admin/verifications`, `PATCH /admin/verifications/:id/review`    |
| Marketplace  | `GET/POST /products`, `GET /products/:id/related`, `GET /sellers/:id`, `GET /lots`, `/marketplace/surplus`, `/price-intelligence/:productId`                       |
| Uploads      | Public/profile images use validated JPG/PNG/WebP up to 5 MB; verification evidence uses private PDF/image storage up to 10 MB and never exposes file keys publicly |
| Retail       | `POST /orders`, `GET /orders`, `GET /orders/:id`                                                                                                                   |
| Procurement  | `GET/POST /bulk-requirements`, `GET /:id/matches`, `GET/POST /:id/quotations`                                                                                      |
| Negotiation  | `GET /quotations/:id`, `POST /counter`, `/accept`, `/reject`                                                                                                       |
| Multi-seller | `POST /bulk-requirements/:id/fulfillment-plans/accept` creates supplier reservations and auto-planned shipments                                                    |
| Pre-harvest  | `GET/POST /expected-harvests`, `POST /:id/reservations`, `POST /:id/convert`                                                                                       |
| Rescue       | `POST /lots/:id/rescue-offers`                                                                                                                                     |
| FPO          | `GET /fpo/members`, `POST /fpo/aggregations`, `GET /fpo/settlements`                                                                                               |
| Logistics    | `GET /shipments`, `POST /:id/dispatch`, `/start`, `/optimize`, `/stops/:stop/complete`, `/issues`, `/proof-of-pickup`, `/proof-of-delivery`                        |
| Recurring    | `GET/POST/PATCH /recurring-requirements`                                                                                                                           |
| Trust        | `GET/POST /disputes`, `PATCH /disputes/:id`, `GET /admin/audit`                                                                                                    |

Mutation routes use Zod validation where structured input is required, role checks, server-side totals and inventory checks, plus audit records for high-impact actions. In a production replica set, the quotation-acceptance service boundary is the place to wrap reservation and order creation in a MongoDB transaction.

## Providers and honest fallbacks

- Payment: Razorpay test boundary when keys exist; otherwise labelled `Mock payment provider`.
- Routing: OpenRouteService-style boundary when configured; otherwise labelled nearest-neighbour development estimate with explicit assumptions.
- Pricing: seeded 30-day local/reference history behind an adapter. No government website scraping.
- Weather: configured provider boundary; otherwise seeded advisory data explicitly marked advisory.
- Images: Cloudinary-ready boundary; otherwise validated local development uploads.
- Jobs: in-process freshness scheduling for development. Redis/BullMQ should back production-critical recurring and fan-out jobs.

No external provider is presented as live without configuration. Secrets belong only in `.env`; `.env.example` is safe to commit.

## Quality checks

```bash
npm run build
npm test
npm run lint
```

Tests cover multi-seller coverage/explanations, FEFO split reservations, capacity-safe automatic trips, enforced route order, protected fleet actions, demo authentication, server-side order calculation, producer purchasing permissions, pending-account restrictions, admin approval/audit transitions, private document metadata, plaintext-password prevention, profile editing and cart threshold behaviour. The PWA caches the app shell and safe read-only imagery; IndexedDB stores farmer listing drafts. It never claims an order, payment or reservation succeeded while offline.
