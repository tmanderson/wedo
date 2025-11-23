Developer Specification
=======================

Project: Multi-Party Gift Registry — MVP
Stack (MVP)
-----------
- Frontend: Next.js v16 (App Router) + React + TypeScript
- Backend: Next.js app routes (server-side API) + TypeScript
- Database: Supabase Postgres
- ORM / Migrations: Prisma (v5+)
- Auth: Supabase magic-link (email OTP)
- Email for user sign-in invites: Supabase built-in email (auto-send on invite)
- Hosting: Vercel (Next.js-first)
- Observability: Sentry (errors), basic request/metrics (e.g., Datadog/Prometheus optional)

High-level goals
----------------
- Invite-only registries with auto-created sub-lists (one per collaborator)
- Collaborators add/edit/delete items only on their own sub-list
- Collaborators can claim/unclaim items on other people’s sub-lists
- Claimer can mark bought. Sub-list owner cannot see claim/bought metadata for items on their own sub-list
- Owner deletes items → soft-delete (visible to collaborators). Removing collaborator → hard-delete sub-list/items; any claims they hold on others’ items must be cleared
- Simple item model: label and optional URL (server-side URL title parsing)
- No payment; no notification emails for claim/bought events (only magic link invites)

Acceptance criteria (MVP)
-------------------------
- Create registries, invite collaborators, auto-sublist creation
- Invites auto-send Supabase magic-link emails; invite acceptance binds user to collaborator
- Collaborators add/edit/delete their own items
- Claim/unclaim/mark-bought flows work with visibility rules
- Owner cannot see claim/bought metadata for their sub-list items
- Owner soft-deletes items; collaborators still see them with a "deleted by owner" badge
- Removing a collaborator cascades deletes for their sub-list and items; claims they held on other items are cleared
- Persistent user accounts via Supabase magic link

Architecture & Responsibility
-----------------------------
- All business logic, authorization, and privacy/visibility rules enforced on server-side Next.js API routes. Do not rely on client-side enforcement or Supabase RLS for core privacy constraints.
- Frontend interacts with Supabase auth natively for sign-in; it calls server-side API endpoints for all registry operations, sending auth token as Bearer.
- Prisma communicates with Supabase Postgres. Use transactions + SELECT … FOR UPDATE for concurrency-sensitive operations (claim/release/mark-bought).
- Deploy on Vercel; DB hosted on Supabase Postgres; Prisma migrations applied during deploy or via CI/CD step.

Environment variables
---------------------
- DATABASE_URL — Postgres connection string (Supabase)
- NEXT_PUBLIC_SUPABASE_URL — Supabase project URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key (frontend)
- SUPABASE_SERVICE_ROLE_KEY — Supabase service_role key (server-only; used to send magic-link RD)
- SUPABASE_JWT_SECRET — Secret to verify Supabase JWTs (server-only)
- APP_BASE_URL — https://wedoto.day
- NODE_ENV
- SENTRY_DSN (optional)
- RATE_LIMIT_CONFIG (optional)
- Other typical envs (VERCEL_* etc.)

Redirect URLs (to register in Supabase Auth)
--------------------------------------------
- Production: https://wedoto.day
- Accept-invite path: https://wedoto.day/accept-invite?token=INVITE_TOKEN
- Dev: https://dev.wedoto.day
- Local: http://localhost:3000

Data Model (Prisma schema)
--------------------------
File: prisma/schema.prisma

(generator & datasource omitted for brevity — use the values from your environment)

enum CollaboratorStatus {
  PENDING
  ACCEPTED
  REMOVED
}

enum ItemStatus {
  UNCLAIMED
  CLAIMED
  BOUGHT
}

model User {
  id          String    @id @default(uuid())
  email       String    @unique
  name        String?
  createdAt   DateTime  @default(now())
  lastAuthAt  DateTime?
  registries  Registry[]       @relation("registryOwner")
  collaborators Collaborator[]
  itemsCreated  Item[]          @relation("itemCreatedBy")
  itemsClaimed  Item[]          @relation("itemClaimedBy")
  inviteTokens  InviteToken[]   @relation("inviteCreatedBy")
}

model Registry {
  id                     String         @id @default(uuid())
  title                  String
  occasionDate           DateTime?
  deadline               DateTime?
  ownerId                String
  collaboratorsCanInvite Boolean        @default(false)
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  owner      User         @relation("registryOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  collaborators Collaborator[]
  sublists   SubList[]
  inviteTokens InviteToken[]

  @@index([ownerId])
}

model Collaborator {
  id            String             @id @default(uuid())
  registryId    String
  userId        String?            // nullable until invite accepted
  email         String
  name          String?
  status        CollaboratorStatus @default(PENDING)
  createdAt     DateTime           @default(now())
  acceptedAt    DateTime?
  removedAt     DateTime?

  registry  Registry @relation(fields: [registryId], references: [id], onDelete: Cascade)
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  sublist   SubList?

  @@unique([registryId, email])
  @@index([userId])
}

model SubList {
  id             String     @id @default(uuid())
  registryId     String
  collaboratorId String
  createdAt      DateTime   @default(now())

  registry     Registry     @relation(fields: [registryId], references: [id], onDelete: Cascade)
  collaborator Collaborator @relation(fields: [collaboratorId], references: [id], onDelete: Cascade)
  items        Item[]

  @@index([registryId])
  @@index([collaboratorId])
}

model Item {
  id               String     @id @default(uuid())
  sublistId        String
  label            String?
  url              String?
  parsedTitle      String?
  createdByUserId  String?
  createdAt        DateTime   @default(now())

  // soft-delete by owner
  deletedByUserId  String?
  deletedAt        DateTime?

  // single-row claim fields
  status           ItemStatus @default(UNCLAIMED)
  claimedByUserId  String?
  claimedAt        DateTime?
  boughtAt         DateTime?

  sublist         SubList     @relation(fields: [sublistId], references: [id], onDelete: Cascade)
  createdByUser   User?       @relation("itemCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)
  claimedByUser   User?       @relation("itemClaimedBy", fields: [claimedByUserId], references: [id], onDelete: SetNull)
  deletedByUser   User?       @relation(fields: [deletedByUserId], references: [id], onDelete: SetNull)

  @@index([sublistId])
  @@index([claimedByUserId])
  @@index([status])
}

model InviteToken {
  id            String   @id @default(uuid())
  token         String   @unique
  registryId    String
  collaboratorId String? // optional
  email         String
  createdAt     DateTime @default(now())
  expiresAt     DateTime
  used          Boolean  @default(false)
  createdByUserId String?

  registry        Registry @relation(fields: [registryId], references: [id], onDelete: Cascade)
  collaborator    Collaborator? @relation(fields: [collaboratorId], references: [id], onDelete: Cascade)
  createdByUser   User? @relation("inviteCreatedBy", fields: [createdByUserId], references: [id], onDelete: SetNull)

  @@index([registryId])
  @@index([email])
  @@index([expiresAt])
}

Migration & setup notes
-----------------------
1. Set DATABASE_URL to Supabase Postgres. Ensure the DB user has rights for migrations.
2. Run:
   - npx prisma migrate dev --name init
   - npx prisma generate
3. Seed test data as needed.
4. Register the redirect URLs in Supabase Auth settings.
5. Configure Supabase project to allow magic-link OTP and add APP_BASE_URL as an allowed redirect.

Tokens & expiry
---------------
- Invite tokens: single-use, expire after 30 days (as requested). On resend, mark previous tokens used or expired.
- Token generation: use cryptographically secure RNG, >= 32 bytes base64/hex string. Store token hashed? (Optional) — MVP stores token plaintext but if you want stronger security, store a hashed token and send plaintext to email.

Server-side Auth (verify Supabase JWT)
--------------------------------------
- Clients include Authorization: Bearer <access_token> from Supabase.
- Server verifies token signature & expiry using SUPABASE_JWT_SECRET (symmetric key) via jose or similar.
- Example pattern (TypeScript + jose):
  - const { jwtVerify } = require('jose');
  - const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
  - const { payload } = await jwtVerify(token, secret, { issuer: process.env.NEXT_PUBLIC_SUPABASE_URL, audience: 'authenticated' });
  - userId = payload.sub; email = payload.email;
- On each request, set req.user = { id: userId, email } for use in handlers.

Auth & session notes
--------------------
- Stateless bearer token verification (recommended). No additional server-managed session necessary for MVP.
- For extra safety: on critical flows you may call Supabase admin APIs using SUPABASE_SERVICE_ROLE_KEY to verify the user and email, but verifying JWT locally is sufficient.

Invite flow (auto-send magic link)
---------------------------------
Flow:
1. Inviter (creator or allowed collaborator per registry.collaboratorsCanInvite) calls POST /api/registries/:id/invite with email(s) + optional name(s).
2. Server:
   - Validate inviter permissions.
   - For each email:
     - Create Collaborator record with status = PENDING (userId null).
     - Create InviteToken { token, email, registryId, collaboratorId, expiresAt = now + 30 days }.
     - Use SUPABASE_SERVICE_ROLE_KEY to call Supabase Admin OTP send for the invitee:
       - Trigger signInWithOtp / magic-link with redirectTo = APP_BASE_URL + `/accept-invite?token=${token}`
     - Return status (success or aggregated errors).
3. Recipient clicks the magic link in their email, is authenticated by Supabase, and is redirected to frontend route /accept-invite?token=TOKEN.
4. Frontend calls GET /api/invite/accept?token=TOKEN with Authorization: Bearer <access_token> (user has just signed in).
5. Server validates token (exists, not used, not expired) and that token.email === authenticated user's email. Then:
   - Mark InviteToken.used = true.
   - Set collaborator.userId = currentUser.id.
   - Set collaborator.status = ACCEPTED and acceptedAt = now.
   - Return registry data or redirect to registry view.

Note: User requested that invites remain PENDING even if recipient already has an account; acceptance must still be explicit by clicking the invite magic link.

API Surface (recommended minimal)
--------------------------------

Auth: all endpoints require Authorization: Bearer <Supabase access_token> (except a few public endpoints like health).

- POST /api/registries
  - Create registry
  - Body: { title, occasionDate?, deadline?, collaboratorsCanInvite?: boolean }
  - Behavior: create Registry, create Collaborator for owner with status=ACCEPTED and SubList; return registry object (minimized fields)
  - Permissions: authenticated user

- GET /api/registries
  - Returns list of registries user is part of (owner or accepted collaborator)
  - Include collaborator status per registry

- GET /api/registries/:id
  - Returns registry with sublists and items applying visibility rules for requesting user (see Visibility Filtering)
  - For each item: if viewer is sublist owner, redact claim/bought fields

- POST /api/registries/:id/invite
  - Body: { emails: [{ email, name? }] }
  - Creates collaborator(s) (status = PENDING) and invite token(s), auto-send Supabase magic link to each with redirectTo containing token
  - Return per-email results (success/error)
  - Permissions: owner or allowed collaborators depending on registry.collaboratorsCanInvite

- DELETE /api/registries/:id/collaborators/:collabId
  - Remove collaborator
  - Behavior:
    - Begin transaction
    - Clear any claims collaborator.userId holds on other items (set claimedByUserId=null, claimedAt=null, boughtAt=null, status=UNCLAIMED)
    - Delete collaborator row (cascade deletes sublist and items)
    - Expire related invite tokens
  - Permissions: registry owner always allowed; collaborators only if registry.collaboratorsCanInvite grants removal permission (implement simple policy: only owner can remove in MVP, or check boolean)

- POST /api/sublists/:sublistId/items
  - Create item (owner only)
  - Body: { label?, url? }
  - If url present, server tries to fetch and parse title async (can return parsedTitle later or inline blocking attempt with timeout)
  - Return created Item

- PATCH /api/items/:id
  - Edit item (owner only; cannot re-add claim fields)
  - Body: { label?, url? }
  - If url changed, update parsedTitle accordingly

- DELETE /api/items/:id
  - Owner soft-delete: set deletedByUserId = requester.id, deletedAt = now
  - Return updated item
  - Note: The owner will no longer see claim/bought metadata due to visibility filter

- POST /api/items/:id/claim
  - Claim item (only allowed if item is not soft-deleted and claimant is not sublist owner)
  - CONCURRENCY: perform transaction with SELECT ... FOR UPDATE on Item; see transaction pseudocode below
  - Returns updated item (with claim fields visible to non-owner viewers)

- POST /api/items/:id/release
  - Release claim (only by current claimer)
  - Transaction with SELECT ... FOR UPDATE
  - Unset claimedByUserId, claimedAt, boughtAt, status=UNCLAIMED

- POST /api/items/:id/mark-bought
  - Only current claimer may call
  - Transaction with SELECT ... FOR UPDATE
  - Set status=BOUGHT, boughtAt=now

- GET /api/invite/accept?token=TOKEN
  - Finalizes invite acceptance (requires Authorization: Bearer <token from Supabase magic-link>)
  - Validate token (exists, not used, not expired) and email matches authenticated user's email
  - Set token.used = true; collaborator.userId = user.id; collaborator.status = ACCEPTED; collaborator.acceptedAt = now
  - Return registry and sublist for user

Data handling rules & visibility (server-side)
-----------------------------------------------
- Always enforce privacy server-side.
- Visibility rule:
  - If viewer.userId === collaborator.userId for a given sublist, redact item fields: status, claimedByUserId, claimedAt, boughtAt.
  - For other viewers, return those fields and expand claimedByUserId to claimer profile (id, name, email maybe)
- Deleted items:
  - Soft-deleted items (deletedAt != null) should be visible to collaborators and show deletedByUser name and deletedAt.
  - Owners still see their item but without claim/bought metadata.
- Pending collaborator:
  - sub-list exists with collaborator.status = PENDING and userId = null; other collaborators may add items and claim.
- Removal:
  - Hard-delete collaborator: delete collaborator row, cascade sublist & items. Before delete, clear all claims collaborator held on other people’s items.

Concurrency & Transaction Patterns
---------------------------------
Use row-level locks via SELECT ... FOR UPDATE inside Prisma transactions for claim/unclaim/mark-bought flows.

Prisma pattern examples (TypeScript pseudocode)
- Acquire row lock:
  - const rows = await tx.$queryRaw`SELECT * FROM "Item" WHERE id = ${itemId} FOR UPDATE`;
  - const item = rows[0];
- Validate preconditions
- Update item with tx.item.update(...)
- Commit transaction (implicit on function return)

Claim pseudocode
----------------
async function claimItem(prisma: PrismaClient, itemId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const rows: any[] = await tx.$queryRaw`SELECT * FROM "Item" WHERE id = ${itemId} FOR UPDATE`
    const item = rows[0]
    if (!item) throw new ApiError(404, "Item not found")
    if (item.deletedAt) throw new ApiError(409, "Item deleted")
    if (item.claimedByUserId) throw new ApiError(409, "Item already claimed")
    // ensure claimant is not sublist owner
    const sublist = await tx.subList.findUnique({ where: { id: item.sublistId }, include: { collaborator: true } })
    if (!sublist) throw new ApiError(500, "Sublist missing")
    if (sublist.collaborator.userId === userId) throw new ApiError(403, "Owner cannot claim own item")
    const updated = await tx.item.update({
      where: { id: itemId },
      data: {
        claimedByUserId: userId,
        claimedAt: new Date(),
        status: 'CLAIMED'
      }
    })
    return updated
  })
}

Release pseudocode
------------------
Validate current claimer matches userId; inside FOR UPDATE transaction set claimedByUserId=null, claimedAt=null, boughtAt=null, status=UNCLAIMED.

Mark-bought pseudocode
----------------------
Validate current claimer matches userId; inside FOR UPDATE transaction set status=BOUGHT and boughtAt=now.

Error handling strategy
-----------------------
- Use structured error responses: { error: { code: string, message: string, details?: any } }
- HTTP status codes:
  - 200 OK — success
  - 201 Created — resource created
  - 400 Bad Request — validation failure
  - 401 Unauthorized — missing/invalid token
  - 403 Forbidden — insufficient permission
  - 404 Not Found — missing resource
  - 409 Conflict — concurrency conflict (e.g., item already claimed)
  - 422 Unprocessable Entity — semantic validation errors
  - 500 Internal Server Error — unexpected
- Concurrency conflict example: secondary claim attempts result in 409 with error.code = "ITEM_ALREADY_CLAIMED" and claim info in details.
- Use try/catch around transactions; map Prisma errors (unique constraint violation, foreign key violation) to appropriate HTTP statuses and messages.
- Return safe messages to clients, log full error details to Sentry.

Logging & monitoring
--------------------
- Log critical flows: invite creation, invite acceptance, claim actions, releases, mark-bought, collaborator removal.
- Send exceptions to Sentry with context (userId, registryId, itemId).
- Track metrics: invites sent, accepted, claims made, claims conflicts, daily active registries, error rates.

Security & rate limiting
------------------------
- Always use HTTPS.
- Validate incoming tokens and email equality on invite acceptance.
- Rate limit:
  - Invite creation (per user, per registry): e.g., 10 invites per minute, 100 per day.
  - Magic-link requests (Supabase) are already rate-limited by service, but apply server-side throttling.
- Prevent mass-invite abuses: verify domain reputation optionally; optionally require invitation approvals for non-owner invites.
- Tokens: random, unguessable (>=32 bytes). Optionally store hashed token.
- Sanitize user-provided URLs before parsing. URL parsing occurs server-side with timeout.
- Avoid exposing email addresses for other users when not necessary; but by design collaborators can see claimer identity on others' lists.

Email / URL parsing
-------------------
- When item.url provided, server performs a fetch (server-side) to get <title> or og:title:
  - Use a short timeout (e.g., 3–5s)
  - On fetch failure or slow responses, fallback to user-supplied label
  - Parse minimal HTML to extract title; avoid executing JS or loading remote resources
  - Cache parsed titles? Optional; not necessary for MVP
- Email invites: use Supabase built-in send (service_role key) to auto-send sign-in magic link with redirectTo including invite token.

Edge cases
----------
- Duplicate invites: Collaborator has @@unique([registryId, email]) — handle unique constraint violation by returning idempotent response indicating "invite already exists" (include collaborator id & status).
- Invite accepted on different device/browser: ensure token acceptance step checks Authorization header bearer token matches token.email. If mismatch, return 403.
- If owner deletes an item that someone has claimed or bought: item soft-deleted with deletedByUserId set. Collaborators still see claim/bought metadata; owner sees item as deleted w/o claim/bought details.
- Removing collaborator who holds claims on others' items: clear those claims (unclaim) before deleting collaborator.

Testing Plan
------------
Goals: correctness, privacy enforcement, concurrency handling, flows (invite/accept), deletion semantics.

Test levels:
1. Unit tests
   - Service-level helpers (validate permission logic)
   - Token validation, token expiry checks
   - URL parsing logic (mock fetch)
   - Error mapping functions
2. Integration tests (using test DB)
   - Registries: create, update
   - Invite flow: create invite → Supabase magic link simulated → accept-invite endpoint maps collaborator to user
   - Item CRUD: owner create/edit/delete (soft)
   - Visibility: ensure owners don't receive claim/bought fields for their own sublist
   - Removal: remove collaborator → sublist & items deleted; claims cleared on other items
3. Concurrency tests
   - Simulate 2+ concurrent requests to claim same item:
     - Expect exactly one 200 (success) and others 409
   - Simulate concurrent mark-bought + release attempts; assert correct final state and expected failures
   - Use tools that can spawn parallel HTTP clients (e.g., k6, Jest with Promise.all)
4. E2E acceptance tests
   - Full flow: create registry → invite emails auto-sent (use Supabase test user or stub) → accept invite → add items → other collaborator claims → mark bought → owner sees deletion without claim info
   - Use Playwright or Cypress for UI flows
5. Security tests
   - JWT verification tests: tampered token rejected
   - Token reuse / expired token attempts are rejected
   - Rate-limit testing for invite endpoints
6. Manual tests & QA
   - Verify emails render correctly; magic-link redirect works
   - Verify domain/redirect settings in Supabase
   - Monitor and test DB cascades and cleanup on collaborator removal

Test cases (representative)
- TC-01: Create registry; returned owner collaborator & sublist exist
- TC-02: Invite email A; invite token created; Supabase OTP triggered with redirectTo containing token
- TC-03: Accept invite with valid token & signed-in user; collaborator.updated to ACCEPTED
- TC-04: Invite acceptance when token email !== signed-in user's email => 403
- TC-05: Owner creates item with URL; parsedTitle saved or fallback used
- TC-06: Other collaborator claims item; owner cannot see claimedByUserId (response redacted)
- TC-07: Two concurrent claim attempts => only one succeeds; others 409
- TC-08: Claimer marks bought; boughtAt set; owner still does not see bought fields
- TC-09: Owner soft-deletes item previously claimed — collaborators still see claimed/bought notes; owner sees item as deleted
- TC-10: Remove collaborator who held claims on others -> their claims cleared & sublist deleted
- TC-11: Resend invite creates new token and previous expired/used

Operational considerations
--------------------------
- Migrations: apply via CI step (npx prisma migrate deploy) during deployment
- Backups: rely on Supabase Postgres backups initially
- Secrets: store SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET in Vercel environment secrets
- Monitoring: configure Sentry; track 5xx rates, claim conflict rate, invites failed
- Scaling: small groups initially — no special sharding needed. Use DB transactions for concurrency.

Prisma & DB notes
-----------------
- Use UUID primary keys for portability
- Collaborator unique constraint prevents duplicate invites to same email per registry
- Indexes: sublistId, claimedByUserId, status — support UI queries
- Referential actions: onDelete: Cascade for registries → collaborators → sublists → items
- Keep soft-delete fields in Item; implement filtering logic in server

API implementation guidance
---------------------------
- Centralized middleware:
  - Auth middleware: verify Supabase JWT, attach req.user
  - Input validation middleware: validate body shapes (zod or Joi recommended)
  - Error handler middleware: map errors to HTTP response
- Services layer:
  - registryService, collaboratorService, itemService, inviteService — encapsulate DB logic & transactions
- Controllers:
  - Minimal logic: parse request, call services, format response
- Use transactions for multi-step operations and concurrency-sensitive operations
- Use prisma.$queryRaw with SELECT ... FOR UPDATE for locking since Prisma model findUnique does not support FOR UPDATE directly
- Keep visibility filtering in a single function to avoid accidental leaks

Sample error mapping (recommended codes)
---------------------------------------
- ERR_NOT_AUTHENTICATED: 401
- ERR_FORBIDDEN: 403
- ERR_NOT_FOUND: 404
- ERR_ALREADY_CLAIMED: 409
- ERR_INVITE_INVALID: 400/410
- ERR_TOKEN_EXPIRED: 410
- ERR_DUPLICATE_INVITE: 409
- ERR_VALIDATION: 422
- ERR_INTERNAL: 500

Edge operational policies
-------------------------
- Invite resend: create new InviteToken and set previous token.used = true (or expired). Return previous token info to admins only.
- Invite cleanup: cron or background job to delete expired invite tokens older than X months (optional).
- Remove collaborator logging: log IDs and timestamp to Sentry or system audit logs (even though no audit UI is required).

Deliverables / Next steps (recommended priority)
-----------------------------------------------
1. Generate Next.js server API route stubs with TypeScript types and middleware (auth + error handling).
2. Generate Prisma migration and seed scripts for test users/registries.
3. Implement core services:
   - Registry creation
   - Invite creation + Supabase OTP trigger (using SUPABASE_SERVICE_ROLE_KEY)
   - Accept-invite endpoint
   - Item CRUD
   - Claim/release/mark-bought with transaction locking
   - Remove collaborator transaction
4. Implement frontend pages:
   - Dashboard (my registries & invitations)
   - Registry view (grid of sublists + item actions; reflect visibility)
   - Accept-invite page (reads token query param, calls backend to finalize)
5. Write automated tests (unit & integration)
6. Setup CI/CD: run migrations, tests, build, deploy
7. Configure Sentry and basic metrics dashboards

Appendix — Example TypeScript patterns
-------------------------------------
1) Auth middleware (verify Supabase JWT with jose)
- verify token via SUPABASE_JWT_SECRET and populate req.user = { id, email }

2) Transaction + FOR UPDATE pattern (Prisma)
- Use prisma.$transaction(async (tx) => { const rows = await tx.$queryRaw`SELECT * FROM "Item" WHERE id = ${id} FOR UPDATE`; ... tx.item.update(...) })

3) Invite: trigger Supabase magic link (server)
- Use SUPABASE_SERVICE_ROLE_KEY to call Supabase Admin REST or SDK method to send OTP with redirectTo set to APP_BASE_URL + `/accept-invite?token=${token}`

4) Visibility redaction
- While preparing response for GET /api/registries/:id, for each sublist:
  - if viewer.userId === sublist.collaborator.userId: strip fields status, claimedByUserId, claimedAt, boughtAt (or set to null/UNCLAIMED representation)

Deployment checklist
--------------------
- Register redirect URLs in Supabase (wedoto.day, dev, localhost)
- Set all env vars in Vercel
- Ensure SUPABASE_SERVICE_ROLE_KEY is server-only
- Run prisma migrate in CI or once during first deploy
- Verify Supabase email sending & domain config
- Create a test user and walk through invite/accept flow
- Configure Sentry DSN in env

Open questions / small decisions left (can be implemented later)
---------------------------------------------------------------
- Should tokens be stored hashed? (Optional for security)
- Do we want to expose email addresses of claimers to other collaborators? (By default yes — collaborators can see claimer identity)
- Should we add audit trail / history table? (User previously said "No audit trail needed" — can be added later)
- Fine-grained collaborator remove permissions beyond owner (initial policy: owner-only removal; can expand later using registry.collaboratorsCanInvite semantics)

Estimated effort (2 engineers)
-----------------------------
- Week 0–1: infra & schema, auth flow, Supabase config, Prisma migrations
- Week 1–3: registry + invite flows, magic-link integration, accept-invite page
- Week 3–5: item CRUD, URL parsing, soft-delete semantics, UI basics
- Week 5–7: claim/unclaim/mark-bought (transactions), concurrency tests
- Week 7–8: QA, E2E tests, polish, deploy

If you want next
----------------
Pick one:
- I can generate full Next.js API route implementations (TypeScript) for each endpoint with middleware and Prisma calls (recommended).
- Or I can produce an OpenAPI spec & Postman collection.
- Or I can produce React component examples for the registry view & accept-invite flow.

Which deliverable would you like next?