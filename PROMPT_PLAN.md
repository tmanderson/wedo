Prompt Plan — Multi-Party Gift Registry (MVP)
=============================================

Purpose
-------
This document is a step-by-step Prompt Plan to drive code-generation LLM agents (and manual work) to implement the Multi-Party Gift Registry MVP described in the provided devSpec. The plan is test-driven, incremental, and ensures each step is small enough for safe implementation and verification, while being large enough to make steady progress. Each step includes a standalone prompt (in a code block) that you can feed to a code-generation LLM to implement that step, plus a checklist of tasks to confirm completion. Manual steps are explicitly noted.

How to use this document
------------------------
- Execute steps in order. Each step builds on previous ones.
- For each prompt, run the generated code and tests locally (or in CI) before continuing.
- Mark off the checklist items after verification.
- If a generated artifact needs tweaks, iterate locally and run tests again.
- Manual steps: perform the indicated actions (e.g., register redirects in Supabase) before or after the code step as required.

Conventions & assumptions
------------------------
- Stack: Next.js v16 (App Router) + React + TypeScript; Prisma (v5+) connected to Supabase Postgres; Supabase magic-link auth; Vercel deployment.
- All server API endpoints in Next.js app routes (app/api/...). Server verifies Supabase JWT via SUPABASE_JWT_SECRET.
- Prisma schema is taken from devSpec; use UUIDs and default enums.
- Tests: Jest (or Vitest) + testing-library for unit/integration; use a test database (separate DATABASE_URL_TEST).
- Use simple file-based structure: /app, /src (services, lib, middleware), /prisma, /tests.
- Each prompt instructs to write tests first where practical (TDD).

Roadmap (high-level phases)
---------------------------
1. Project bootstrap & infra (repo, packages, prisma schema, migrations)
2. Auth & middleware (JWT verification, auth middleware)
3. Core data services & utilities (service layer, error types, visibility logic)
4. API endpoints (registries, invites, items, claim flows, collaborator removal)
5. Frontend minimal UI (auth wiring, dashboard, registry view, accept-invite page)
6. Tests (unit, integration, concurrency, e2e)
7. CI/CD, migrations, deployment, observability

Prompt Steps — Iterative, Test-Driven
-------------------------------------
Below are the prompts. Each prompt is a self-contained instruction for a code-generation LLM to implement a small, testable chunk. After each prompt is a checklist of todo items to validate the step.

Note: Each prompt refers to the devSpec for business rules and acceptance criteria. Include that context when invoking the code-generation LLM.

Step 0 — Repo & Tooling Bootstrap (manual + code)
-------------------------------------------------
This step initializes the repository and core tooling. It's manual and preparatory. Do this before invoking automated code generation.

Prompt (manual instructions — not for code-gen LLM):
```
Manual Step: Initialize repository and basic tooling.

1. Create a new Git repository and initialize.
2. Create .gitignore and basic README.md.
3. Initialize node project:
   - npm init -y
4. Install base dependencies:
   - next@latest, react, react-dom, typescript, @types/react, @types/node
   - prisma@latest, @prisma/client
   - jose (for JWT verification)
   - dotenv, cross-env
   - supabase-js (for server admin calls)
   - zod (input validation)
   - node-fetch or undici (for URL parsing)
   - jest or vitest, supertest, ts-node, ts-jest (for tests)
5. Initialize TypeScript:
   - npx tsc --init (or let Next generate)
6. Initialize Next.js app router skeleton.
7. Add basic folder structure:
   - /app, /src, /prisma, /tests
8. Add ENV sample file .env.example with variables from devSpec.
9. Commit initial state.

Manual verification:
- Project runs (npm run dev) with Next starting (may error until other steps done).
- TypeScript compiles basic example page.
```

Todos:
- [ ] Create repo and initial commit
- [ ] Install dependencies
- [ ] Initialize TypeScript and Next app
- [ ] Add .env.example and README
- [ ] Commit and push

Step 1 — Prisma Schema + Initial Migration + Generate Client
------------------------------------------------------------
Create the Prisma schema (based on devSpec), run migrations, and generate the client. Add a simple seed script to create a test admin user and a sample registry.

Prompt (feed to code-generation LLM):
```
Task: Add Prisma schema, migration, and client generation.

Requirements:
- Implement prisma/schema.prisma reflecting the devSpec models and enums exactly (User, Registry, Collaborator, SubList, Item, InviteToken, CollaboratorStatus, ItemStatus).
- Configure generator and datasource:
  - generator client { provider = "prisma-client-js" }
  - datasource db { provider = "postgresql", url = env("DATABASE_URL") }
- Add initial migration (name: init).
- Add npm scripts:
  - "prisma:migrate:dev": "prisma migrate dev --name init"
  - "prisma:generate": "prisma generate"
  - "prisma:seed": "ts-node prisma/seed.ts"
- Create prisma/seed.ts that:
  - Uses Prisma client.
  - Creates a test user (email test-owner@example.com) and one Registry owned by that user with a Collaborator (owner, ACCEPTED) and SubList.
  - Keep seed idempotent (use upsert).
- Add a small README section describing how to run migrations locally and seed the dev DB.

Tests:
- Add a script (e.g., /tests/prisma.test.ts) that imports Prisma client and asserts the seeded registry exists. Use test DB or skip in CI if DATABASE_URL not provided.

Deliverables (files to create or modify):
- prisma/schema.prisma
- prisma/seed.ts
- package.json scripts
- tests/prisma.test.ts

Behavior:
- Running npm run prisma:migrate:dev creates DB schema.
- Running npm run prisma:generate produces @prisma/client.
- Running npm run prisma:seed populates test data.

Notes:
- Use UUID primary keys where the devSpec requires them.
- Add indexes and relations as in devSpec.
```

Todos:
- [ ] Add prisma/schema.prisma matching devSpec
- [ ] Add prisma/seed.ts with idempotent seed
- [ ] Add npm scripts for migrate/generate/seed
- [ ] Run migration and generate client locally
- [ ] Run seed and verify test record exists

Step 2 — Auth Middleware (JWT verification) + Tests
---------------------------------------------------
Implement server-side JWT verification middleware to validate Supabase access tokens using SUPABASE_JWT_SECRET and set req.user. Create tests that validate token verification and error responses.

Prompt:
```
Task: Implement Supabase JWT verification middleware and unit tests.

Requirements:
- Create src/lib/auth.ts that:
  - Exposes a function verifySupabaseJwt(token: string): Promise<{ userId: string; email?: string; payload: any }>
  - Uses jose (jwtVerify) with secret from process.env.SUPABASE_JWT_SECRET (TextEncoder, symmetric key)
  - Validates issuer (NEXT_PUBLIC_SUPABASE_URL) and audience 'authenticated' if possible. Fallback: at least verify signature and exp.
  - Throws a structured error when invalid/expired.

- Create src/middleware/authMiddleware.ts (Next.js app route compatible) that:
  - Exposes an async handler wrapper requireAuth(handler) which:
    - Reads Authorization: Bearer <token> header
    - Calls verifySupabaseJwt
    - Attaches user object to the request context (e.g., req.user or event.locals.user depending on app-route design)
    - Returns 401 with structured error if missing/invalid

- Add tests:
  - Unit test for verifySupabaseJwt with a generated JWT signed with SUPABASE_JWT_SECRET (in test env). Test valid and expired/tampered tokens.
  - Integration-like test for requireAuth wrapper: mock a route handler and ensure unauthorized responses for missing/invalid tokens, and that a valid token calls the underlying handler with user attached.

Notes:
- Keep errors structured: { code: 'ERR_NOT_AUTHENTICATED', message: string }.
- Export types for UserSession = { id: string, email?: string }.

Deliverables:
- src/lib/auth.ts
- src/middleware/authMiddleware.ts
- tests/auth.test.ts
```

Todos:
- [ ] Implement verifySupabaseJwt using jose
- [ ] Implement requireAuth wrapper compatible with Next app routes
- [ ] Add tests for valid and invalid tokens
- [ ] Run tests and confirm pass

Step 3 — Error Handling & Input Validation Utilities
----------------------------------------------------
Implement shared error types, an API error mapper, and request validation helper using zod. Ensure server returns structured error responses.

Prompt:
```
Task: Implement centralized error handling, ApiError type, and input validation helpers.

Requirements:
- Create src/lib/errors.ts:
  - Define ApiError class extends Error with properties: status (number), code (string), details?: any
  - Helper functions: mapErrorToResponse(err): { status, body } mapping Prisma errors and ApiError to HTTP responses based on devSpec codes.

- Create src/lib/validation.ts:
  - Expose a helper validateBody(schema, body) that returns parsed result or throws ApiError with status 422 and code ERR_VALIDATION.

- Integrate with app route pattern:
  - Provide an example wrapper function withErrorHandling(handler) that catches exceptions and returns proper HTTP response with JSON body { error: { code, message, details? } }.

Tests:
- Unit tests for ApiError mapping: throw ApiError and confirm mapErrorToResponse produces expected status and JSON.
- Validation test using zod schema to confirm 422 raised on invalid body.

Deliverables:
- src/lib/errors.ts
- src/lib/validation.ts
- tests/errors.test.ts
- small example usage file demonstrating withErrorHandling usage.
```

Todos:
- [ ] Add ApiError and mapping logic
- [ ] Add validation helpers with zod
- [ ] Add tests for mapping and validation
- [ ] Integrate example with app route wrapper

Step 4 — Service Layer Scaffolding (registry, collaborator, item, invite)
-----------------------------------------------------------------------
Create service modules that encapsulate DB logic and transactions. Do not implement full logic yet — create interfaces, stubs, and tests to ensure wiring.

Prompt:
```
Task: Create service layer scaffolding with types and initial unit tests.

Requirements:
- Create service modules:
  - src/services/registryService.ts — outline functions:
    - createRegistry(userId, data)
    - listRegistriesForUser(userId)
    - getRegistryForViewer(registryId, viewerUserId)
  - src/services/collaboratorService.ts — outline:
    - createCollaborator(registryId, email, name, createdByUserId)
    - acceptCollaborator(inviteToken, userId) // signature only
    - removeCollaborator(registryId, collabId, actingUserId)
  - src/services/itemService.ts — outline:
    - createItem(sublistId, createdByUserId, { label, url })
    - updateItem(itemId, userId, data)
    - softDeleteItem(itemId, userId)
    - claimItem(itemId, userId)
    - releaseItem(itemId, userId)
    - markBought(itemId, userId)
  - src/services/inviteService.ts — outline:
    - createInviteTokens(registryId, invites[], createdByUserId)
    - validateAndConsumeInviteToken(token, authenticatedUser)

- Each module should export typed function signatures and throw ApiError('ERR_NOT_IMPLEMENTED') until implemented.

- Add unit tests that import these services and assert that calling them currently throws ERR_NOT_IMPLEMENTED.

Purpose:
- Establish package layout, types, and test harness so later steps implement these functions incrementally.

Deliverables:
- src/services/*.ts
- tests/services.stubs.test.ts
```

Todos:
- [ ] Create service files with typed signatures
- [ ] Add unit tests ensuring stubs are present and return expected error until implemented
- [ ] Run tests

Step 5 — API Route: POST /api/registries (Create Registry) + Tests
-------------------------------------------------------------------
Implement registry creation endpoint: creates Registry, owner Collaborator (ACCEPTED), SubList. TDD: write tests first.

Prompt:
```
Task: Implement POST /api/registries endpoint (create registry), service implementation, and tests.

Requirements:
- Endpoint: app/api/registries/route.ts (Next.js App Router API route) with POST handler.
- Behavior:
  - Auth required (use requireAuth).
  - Validate body via zod: { title: string, occasionDate?: string (ISO), deadline?: string (ISO), collaboratorsCanInvite?: boolean }
  - Use registryService.createRegistry(userId, data) which:
    - Creates Registry with ownerId = userId
    - Creates Collaborator row for owner with status = ACCEPTED, userId = owner, email = owner's email
    - Creates SubList tied to that Collaborator
    - Returns minimal registry object with id, title, ownerId, createdAt and initial collaborator/sublist IDs
  - Return 201 with created registry body.

- Service Implementation:
  - Implement registryService.createRegistry using Prisma client.
  - Use transaction to create registry, collaborator, sublist atomically.

- Tests:
  - Unit/integration test that:
    - Mocks authenticated user (or uses test JWT)
    - Calls POST /api/registries with valid payload
    - Asserts 201 response and DB entries created (registry, collaborator, sublist)
    - Tests invalid payload returns 422.

Deliverables:
- app/api/registries/route.ts
- src/services/registryService.ts (implement createRegistry)
- tests/registries.create.test.ts
```

Todos:
- [ ] Implement registry POST endpoint
- [ ] Implement createRegistry service with transaction
- [ ] Add tests for success and validation failure
- [ ] Run tests and verify DB entries created

Step 6 — Invite Creation: POST /api/registries/:id/invite + Tests & Supabase Admin Trigger
------------------------------------------------------------------------------------------
Implement invite creation for a registry, collaborator creation, invite token creation, and call Supabase admin to send magic-link OTP with redirect including invite token. Keep secrets server-only. TDD: tests should mock Supabase admin client.

Prompt:
```
Task: Implement invite creation endpoint and inviteService.createInviteTokens.

Requirements:
- Endpoint: app/api/registries/[id]/invite/route.ts (POST)
  - Auth required; acting user must be registry owner or allowed per registry.collaboratorsCanInvite (for MVP, enforce owner-only unless registry.collaboratorsCanInvite is true and acting user is ACCEPTED collaborator).
  - Body: { emails: [{ email: string, name?: string }] }
  - For each email:
    - Upsert Collaborator row with status=PENDING (if existing row with unique [registryId,email], return existing collaborator id & status).
    - Create InviteToken entry with token (crypto-secure >=32 bytes hex), registryId, collaboratorId, email, expiresAt = now + 30 days, createdByUserId set.
    - Call Supabase admin API (using SUPABASE_SERVICE_ROLE_KEY or supabase-js admin) to send magic link / OTP to that email with redirectTo = `${APP_BASE_URL}/accept-invite?token=${token}`.
    - If Supabase call fails, mark token as used/expired or delete created token and return error for that email.
  - Return aggregated per-email results (success or error message).

- inviteService.createInviteTokens:
  - Encapsulate logic above.
  - Use transactions where appropriate (create collaborator, token).
  - Ensure on duplicate invite (unique constraint) the endpoint returns idempotent response and not crash (return existing collaborator status and optionally create a new token depending on design — MVP should create a new token and mark previous token.used=true).

- Tests:
  - Unit tests for inviteService that mock Prisma and supabase client to simulate success and failure.
  - Integration-like test for API route that asserts expected JSON for successes and failures. Use a test double for supabase admin calls.

Security:
- Do not log the plaintext token to public logs. For tests OK to assert token present in DB.

Deliverables:
- app/api/registries/[id]/invite/route.ts
- src/services/inviteService.ts (createInviteTokens implementation)
- src/lib/supabaseAdmin.ts (wrapper to call Supabase admin endpoints using SUPABASE_SERVICE_ROLE_KEY)
- tests/invite.create.test.ts
```

Todos:
- [ ] Implement invite creation endpoint
- [ ] Implement inviteService with safe token generation & DB writes
- [ ] Implement supabaseAdmin wrapper to call admin OTP send (mockable)
- [ ] Add tests mocking Supabase admin
- [ ] Verify tokens and collaborator rows in DB after successful invite

Step 7 — Accept Invite Endpoint: GET /api/invite/accept?token=TOKEN + Tests
----------------------------------------------------------------------------
Implement invite acceptance flow that binds authenticated user to collaborator and marks token used.

Prompt:
```
Task: Implement invite acceptance endpoint and service.

Requirements:
- Endpoint: app/api/invite/accept/route.ts (GET)
  - Requires Authorization: Bearer <access_token> (user signed-in by Supabase via magic-link).
  - Query param: token
  - Behavior:
    - Validate token exists, not used, not expired.
    - Verify token.email === authenticated user's email. If mismatch -> 403 ERR_FORBIDDEN (token email mismatch).
    - In transaction:
      - Set token.used = true
      - Update Collaborator: userId = authenticated user id, status = ACCEPTED, acceptedAt = now
    - Return registry and created/existing sublist for the collaborator (minimized view).

- inviteService.validateAndConsumeInviteToken(token, authenticatedUser)
  - Implement the transaction logic with Prisma.
  - Return helpful error codes for expired/used/invalid token.

- Tests:
  - Unit tests for service logic: valid token -> associate collaborator; invalid/expired/token-email-mismatch -> expected error codes.
  - Integration test for API route: simulate authenticated user via a signed JWT and call route. Assert DB changed accordingly.

Deliverables:
- app/api/invite/accept/route.ts
- src/services/inviteService.ts (add validateAndConsumeInviteToken)
- tests/invite.accept.test.ts
```

Todos:
- [ ] Implement accept-invite API route with auth
- [ ] Implement transactional consume token service
- [ ] Add tests for success and error cases
- [ ] Verify collaborator row updated and token used

Step 8 — GET Registry Endpoint with Visibility Filtering + Tests
----------------------------------------------------------------
Implement GET /api/registries/:id that returns registry data including sublists and items, applying visibility filtering rules (owner redacts claim fields). TDD.

Prompt:
```
Task: Implement GET /api/registries/[id] endpoint with visibility filtering.

Requirements:
- Endpoint: app/api/registries/[id]/route.ts (GET)
  - Auth required.
  - Returns registry object with:
    - id, title, ownerId (no sensitive fields)
    - collaborators with status (but avoid exposing emails beyond what devSpec allows)
    - sublists and their items
  - Visibility rules:
    - For each sublist:
      - If viewer.userId === sublist.collaborator.userId: redact item fields: status, claimedByUserId, claimedAt, boughtAt.
      - Otherwise include claim metadata and expand claimedByUserId to claimer { id, name, email } (or minimal profile).
    - Soft-deleted items (deletedAt not null) should still be included and show deletedByUser minimally.

- Implementation:
  - Implement registryService.getRegistryForViewer(registryId, viewerUserId).
  - Use efficient Prisma queries (include sublists -> items -> claimedByUser).
  - After fetching, run a mapping function to apply visibility redaction.

- Tests:
  - Create DB test data: owner, collaborator A (owner sublist), collaborator B (other sublist), item claimed by B on A's list.
  - Test GET as owner: confirm for owner’s sublist item, claim fields are redacted.
  - Test GET as other collaborator: see claim fields and claimer expanded.

Deliverables:
- app/api/registries/[id]/route.ts (GET)
- src/services/registryService.ts (implement getRegistryForViewer)
- src/lib/visibility.ts (mapping function)
- tests/registries.get.visibility.test.ts
```

Todos:
- [ ] Implement GET registry endpoint
- [ ] Implement getRegistryForViewer with visibility mapping
- [ ] Add tests to assert redaction and exposure rules
- [ ] Run tests and verify behaviors

Step 9 — SubList Item CRUD (POST /api/sublists/:id/items, PATCH, DELETE) + URL Parsing
-------------------------------------------------------------------------------------
Add item creation/edit/delete endpoints and server-side URL parsing for parsedTitle. Soft-delete behavior for owner delete.

Prompt:
```
Task: Implement item CRUD endpoints and URL parsing logic.

Requirements:
- Endpoints:
  - POST app/api/sublists/[sublistId]/items/route.ts
    - Auth required.
    - Only the sublist owner (collaborator.userId === requester.id) may create/edit/delete items on their sublist. However, in devSpec, collaborators add/edit/delete items only on their own sub-list.
    - Body: { label?: string, url?: string }
    - If url present, attempt to fetch title (server-side) with timeout (3s). Extract <title> or og:title. On failure, fallback to label.
    - Create Item with createdByUserId set.
    - Return 201 with item.
  - PATCH app/api/items/[id]/route.ts (PATCH)
    - Auth required.
    - Only sublist owner may edit their items.
    - If url changed, re-parse title.
    - Return updated item.
  - DELETE app/api/items/[id]/route.ts (DELETE)
    - Auth required.
    - Only sublist owner may soft-delete item: set deletedByUserId=requester.id and deletedAt=now.
    - Return updated item.

- Implement itemService.createItem, updateItem, softDeleteItem using Prisma.
- Implement src/lib/urlParser.ts which:
  - Given a URL, fetches with a short timeout, returns parsedTitle or null.
  - Use a safe HTML parsing (regex or lightweight parser) to extract <title> or og:title.
  - Handle errors silently and return null.

- Tests:
  - Unit tests for urlParser: mock fetch to return pages with title, og:title, and timeout.
  - Integration tests for item endpoints:
    - Owner can create/edit/delete items on their sublist.
    - Non-owner creating/editing/deleting on another sublist returns 403.
    - After delete, item.deletedAt and deletedByUserId set; collaborators still see it in GET registry.

Deliverables:
- app/api/sublists/[sublistId]/items/route.ts (POST)
- app/api/items/[id]/route.ts (PATCH/DELETE handlers)
- src/services/itemService.ts (implement create/update/delete)
- src/lib/urlParser.ts
- tests/urlParser.test.ts
- tests/items.crud.test.ts
```

Todos:
- [ ] Implement URL parsing utility with timeout
- [ ] Implement create/update/delete item endpoints with owner checks
- [ ] Add tests for URL parsing and item permissions
- [ ] Verify soft-delete behavior in GET registry

Step 10 — Claim / Release / Mark-Bought Flows (Transactional, concurrency-safe)
--------------------------------------------------------------------------------
Implement concurrent-safe claim/release/mark-bought endpoints using Prisma transactions and SELECT ... FOR UPDATE pattern. Add concurrency tests that simulate concurrent claims.

Prompt:
```
Task: Implement claim/release/mark-bought endpoints transactionally and add concurrency tests.

Requirements:
- Endpoints:
  - POST app/api/items/[id]/claim/route.ts
    - Auth required.
    - Only allowed if:
      - Item exists and not soft-deleted (deletedAt null)
      - Requester is not the owner of the sublist (owner cannot claim own item)
      - Item.status is UNCLAIMED
    - Implementation must use prisma.$transaction with SELECT ... FOR UPDATE to lock the item row before checks and update.
    - On conflict (already claimed by someone else) return 409 with code ERR_ALREADY_CLAIMED and details about current claim.

  - POST app/api/items/[id]/release/route.ts
    - Auth required.
    - Only current claimer may release.
    - Transactional with FOR UPDATE; set claimedByUserId=null, claimedAt=null, boughtAt=null, status=UNCLAIMED.

  - POST app/api/items/[id]/mark-bought/route.ts
    - Auth required.
    - Only current claimer may mark bought.
    - Transactional with FOR UPDATE; set status=BOUGHT and boughtAt=now.

- Implement itemService.claimItem, releaseItem, markBought using prisma.$transaction and SELECT ... FOR UPDATE via tx.$queryRaw as per devSpec pseudocode.

- Concurrency tests:
  - Write tests that simulate N concurrent claim attempts on same item (use Promise.all and separate HTTP clients or simulate service-level parallel transactions).
  - Assert exactly one succeeds (200) and the rest fail with 409 and ERR_ALREADY_CLAIMED.
  - Test releasing concurrently with claim attempts to verify consistent behavior.

Deliverables:
- app/api/items/[id]/claim/route.ts
- app/api/items/[id]/release/route.ts
- app/api/items/[id]/mark-bought/route.ts
- src/services/itemService.ts (implement transactional functions)
- tests/items.claim.concurrent.test.ts

Notes:
- Use consistent error responses and Sentry logging hooks where appropriate (Sentry integration optional at this step).
```

Todos:
- [ ] Implement transactional claim/release/mark-bought services
- [ ] Implement API routes for claim actions
- [ ] Add concurrency tests that assert one winner and others 409
- [ ] Run tests and verify results

Step 11 — Removing a Collaborator (cascade deletes & claim clearing)
--------------------------------------------------------------------
Implement collaborator removal logic: clear claims they hold on others' items, hard delete collaborator (cascade deletes sublist & items), expire invite tokens. TDD.

Prompt:
```
Task: Implement DELETE /api/registries/:id/collaborators/:collabId endpoint and collaboratorService.removeCollaborator.

Requirements:
- Endpoint: app/api/registries/[id]/collaborators/[collabId]/route.ts (DELETE)
  - Auth required.
  - Enforce permission: only registry owner may remove collaborators (MVP).
  - Behavior in a single transaction:
    - Find collaborator (ensure belongs to registry).
    - Clear all claims where claimedByUserId == collaborator.userId:
      - Set claimedByUserId = null, claimedAt = null, boughtAt = null, status = UNCLAIMED
    - Delete collaborator row (cascade deletes sublist and items per DB model)
    - Mark invite tokens for that collaborator as used/expired (set used = true)
  - Return 200 with summary (itemsDeletedCount, claimsClearedCount).

- Service Implementation:
  - collaboratorService.removeCollaborator(registryId, collabId, actingUserId)

- Tests:
  - Prepare DB: collaborator B has claims on items of others; has sublist and items.
  - Call DELETE as owner; assert:
    - Collaborator row removed.
    - Their sublist & items deleted from DB.
    - Any claims they held on other items cleared (those items are now UNCLAIMED).
    - Invite tokens for them marked used.

Deliverables:
- app/api/registries/[id]/collaborators/[collabId]/route.ts
- src/services/collaboratorService.ts (implement removeCollaborator)
- tests/collaborator.remove.test.ts
```

Todos:
- [ ] Implement collaborator removal endpoint
- [ ] Implement transactional removal service
- [ ] Add tests verifying cascade deletes and claim clearing
- [ ] Run tests

Step 12 — Frontend: Supabase Auth Wiring & Accept-invite Page (minimal)
-----------------------------------------------------------------------
Implement frontend Supabase sign-in flow (magic link) and the accept-invite page that reads token from query and calls /api/invite/accept with the authenticated Supabase token. Keep UI minimal and test manually.

Prompt:
```
Task: Implement frontend auth wiring using supabase-js and the Accept Invite page.

Requirements:
- Add Supabase client helper in src/lib/supabaseClient.ts (using NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY).
- Implement basic auth context/provider to get current user and access token. Use Supabase's onAuthStateChange to keep session.
- Add a page at app/accept-invite/page.tsx that:
  - Reads ?token=TOKEN from search params.
  - If user not signed in: show a CTA 'Sign in via email' with a pre-filled email input? (MVP: show instructions to sign in via magic link and that they should click invite email to sign-in; or provide a way to trigger Supabase signInWithOtp with redirectTo including the same token).
  - If user is signed in (has access_token), call GET /api/invite/accept?token=TOKEN with Authorization: Bearer <access_token>.
  - Show success/failure messages and link to the registry view on success.
- Implement a minimal sign-in capability: a page where users can enter email and click 'Send magic link' using supabase.auth.signInWithOtp({ email, options: { redirectTo: `${APP_BASE_URL}/accept-invite?token=${token}` }}) — but in invite flow the server side already sent magic link. Provide fallback "Resend invite" button that calls the backend invite creation route as necessary (this may be owner-only so keep it simple: show instruction 'Use the email you received').

Manual steps:
- Ensure redirect URLs are registered in Supabase auth settings: APP_BASE_URL and local dev URL.

Tests:
- Manual verification: simulate client clicking invite magic link email (or create token via API and navigate to /accept-invite?token=TOKEN), sign in via the magic link and confirm the backend accept endpoint binds collaborator to user.

Deliverables:
- src/lib/supabaseClient.ts
- app/accept-invite/page.tsx
- minimal auth provider hook (src/hooks/useAuth.ts)
- README note on manual steps for testing invite acceptance locally

Notes:
- This step includes manual verification; automated tests for UI are optional at this stage.
```

Todos:
- [ ] Add supabase client helper and auth provider
- [ ] Implement accept-invite page calling backend accept endpoint
- [ ] Register redirect URIs in Supabase manually
- [ ] Manually test invite acceptance flow

Step 13 — Frontend: Dashboard & Registry View (minimal interaction)
-------------------------------------------------------------------
Implement minimal UI to show the list of registries and a registry view with sublists and items and actions for adding/claiming. Start with simple components and call server APIs implemented earlier. Manual testing plus integration tests.

Prompt:
```
Task: Build minimal frontend pages: Dashboard and Registry view.

Requirements:
- Dashboard: app/dashboard/page.tsx
  - Shows list of registries for current user (GET /api/registries)
  - Links to registry view pages

- Registry page: app/registries/[id]/page.tsx
  - Calls GET /api/registries/:id with Authorization header (use supabase access token)
  - Renders sublists and items
  - For each sublist:
    - If current user owns it: show UI to add/edit/delete items (call item endpoints)
    - For items not owned by the current user: show claim/release/mark-bought buttons based on item.status (call claim endpoints)
    - Respect visibility: owner view should not show claim metadata for their own sublist items (this will come from server; the client just renders what's provided)
  - Keep styling minimal (HTML + minimal CSS). Focus on functionality.

- Implement small client-side fetch wrapper that attaches Authorization: Bearer <token> to calls.

Tests:
- Manual verification: create registries and items using backend APIs or seed data; use UI to create an item, claim from other account (may require multiple browser profiles), mark bought, and verify visibility rules.

Deliverables:
- app/dashboard/page.tsx
- app/registries/[id]/page.tsx
- src/lib/fetcher.ts (authenticated fetch wrapper)
- Basic components: SubListView, ItemCard

Notes:
- E2E automated tests can come later (Step 15). For now focus on manual verification.
```

Todos:
- [ ] Implement dashboard and registry pages
- [ ] Add authenticated fetch wrapper
- [ ] Manually test add/claim/mark-bought flows in UI

Step 14 — Tests: Unit, Integration, Concurrency, and E2E
--------------------------------------------------------
Add comprehensive tests. Focus on the critical flows: invite accept, create registry, create items, claim concurrency, collaborator removal. Add an e2e test that simulates full flow using Playwright or Cypress.

Prompt:
```
Task: Implement tests across unit, integration, concurrency, and an E2E scenario.

Requirements:
- Unit tests:
  - Functions in urlParser, visibility logic, auth verification, error mapping.
- Integration tests (using test DB or test transactions):
  - Invite flow: create invite -> simulate Supabase sign-in -> call /api/invite/accept and assert collaborator accepted.
  - Item CRUD: owner creates item; non-owner claims it; owner soft-deletes; visibility assertions.
- Concurrency tests:
  - Reuse earlier concurrency test to assert single successful claim in N concurrent attempts.
- E2E test:
  - Use Playwright:
    - Create owner account via direct DB seed.
    - Create registry via API as owner.
    - Invite collaborator (use invite token returned).
    - Simulate collaborator accepting invite by creating a Supabase session or mocking authentication in the browser context.
    - Add item by collaborator, claim by other collaborator, mark bought, owner sees the deleted state appropriately.
- CI:
  - Add GitHub Actions workflow .github/workflows/ci.yml that:
    - Installs dependencies
    - Runs prisma migrate deploy or uses a test DB for migrations
    - Runs tests
    - Runs linters (optional)
- Tests should be runnable locally via npm test and in CI.

Deliverables:
- tests/* expanded with integration & concurrency tests
- e2e/playwright config and test script
- .github/workflows/ci.yml

Notes:
- If running E2E with real Supabase auth is complex in CI, stub/mimic authentication or run headless browser with injected tokens.
```

Todos:
- [ ] Add tests for unit, integration, concurrency
- [ ] Add Playwright E2E test (or plan for manual E2E)
- [ ] Add CI workflow to run tests and migrations
- [ ] Ensure tests pass locally and in CI

Step 15 — Observability & Error Reporting (Sentry) Integration
--------------------------------------------------------------
Add Sentry server-side integration and capture errors in critical flows. Add instructions to set SENTRY_DSN env var.

Prompt:
```
Task: Add Sentry integration and instrument key API routes.

Requirements:
- Add @sentry/node (or Sentry SDK suitable for Next.js App Router).
- Create src/lib/sentry.ts to initialize Sentry when SENTRY_DSN provided; configure to attach request context (userId, registryId, itemId when available).
- Wrap top-level API error handling to call Sentry.captureException for unexpected errors.
- Add small unit test that ensures sentry.init is called when SENTRY_DSN set (can mock).

Deliverables:
- src/lib/sentry.ts
- Integration in src/lib/errors.ts or top-level withErrorHandling wrapper to call Sentry on 5xx
- README note about configuring SENTRY_DSN

Notes:
- Do not commit SENTRY_DSN; it's an env var for deploy.
```

Todos:
- [ ] Add Sentry initialization module
- [ ] Instrument withErrorHandling to report unexpected errors
- [ ] Add README notes about Sentry env
- [ ] Verify local development tolerates missing SENTRY_DSN

Step 16 — CI/CD & Deployment Preparation
----------------------------------------
Finalize CI/CD setup: migrations on deploy, environment variable checklist, Vercel deployment steps.

Prompt:
```
Task: Add deployment and CI/CD notes, finalize scripts for migration during deploy.

Requirements:
- Add a deployment README checklist covering:
  - Required env vars as in devSpec
  - Register redirect URLs in Supabase
  - How to run prisma migrate deploy (CI step) and generate client
  - Vercel configuration for environment variables
- Add npm scripts:
  - "build": next build
  - "start": next start
  - "prisma:migrate:deploy": "prisma migrate deploy"
  - "prisma:generate"
- Add GitHub Actions workflow for deploy (optional stub) or instructions for deploying via Vercel (recommended).
- Ensure .vercelignore or vercel.json (if needed) configured.

Deliverables:
- README deployment checklist
- package.json scripts
- .github/workflows/deploy.yml (optional skeleton)
```

Todos:
- [ ] Add README checklist & deploy instructions
- [ ] Add migration deploy script
- [ ] Add optional deploy workflow or Vercel notes

Step 17 — Final Integration & QA Runbook
----------------------------------------
Run a final verification checklist, document manual QA steps, and finish.

Prompt:
```
Task: Run final integration tests and produce QA runbook.

Requirements:
- Run full test suite, fix issues.
- Manual QA checklist document:
  - Create registry as owner.
  - Invite collaborator and confirm email sent (manual check or captured supabase admin logs).
  - Accept invite via magic link and confirm collaborator accepted.
  - Owner creates item then soft-deletes it; collaborator still sees it with "deleted by owner".
  - Collaborator claims item on another's sublist, marks bought, other viewers see appropriate info.
  - Remove collaborator that holds claims and verify claims cleared and their sublist/items removed.
- Document any deviations or TODOs found.

Deliverables:
- QA.md with step-by-step manual verification actions and expected outcomes.
- Fixes for any failing tests or discovered edge cases.

Manual verification:
- Complete the QA checklist in staging or dev environment.

Notes:
- If any behavior violates devSpec, document and fix before production deploy.
```

Todos:
- [ ] Run full tests and fix issues
- [ ] Execute manual QA checklist
- [ ] Produce QA.md and resolve all open items

Appendix — Prompt Usage Notes
-----------------------------
- Each code-generation LLM prompt block above should be fed with context: include the devSpec and the current repository state (or a description of files present).
- For tests, prefer to instruct the LLM to create tests first (TDD). The test runner should be configured and runnable via npm test.
- For database-sensitive tests, instruct the LLM or test harness to use a dedicated test DB (DATABASE_URL_TEST) and to reset DB state between tests (e.g., via prisma migrate reset or transaction rollbacks).
- For Supabase admin calls, ensure the LLM's generated code uses a wrapper (src/lib/supabaseAdmin.ts) that can be mocked in tests.

Deliverable Checklist (project-level)
-------------------------------------
- [x] Prisma schema, migration, and seed
- [x] JWT verification & auth middleware
- [x] Centralized error mapping & validation
- [x] Service layer implemented and tested
- [x] API endpoints: registries create/list/get, invites create/accept, item CRUD, claim/release/mark-bought, collaborator removal
- [x] Visibility rules enforced server-side and tested
- [x] URL parsing for item titles with timeout
- [x] Frontend minimal pages: accept-invite, dashboard, registry view + auth wiring
- [x] Concurrency tests demonstrating transactional safety (service layer uses SELECT FOR UPDATE)
- [ ] (Deferred) E2E test of core flow - requires Playwright setup and running Supabase
- [x] CI workflow & deployment docs
- [ ] (Deferred) Observability integration (Sentry) - optional, can be added post-MVP
- [x] QA runbook

Final notes
-----------
- Follow devSpec closely for authority/visibility rules and error codes.
- Aim for clear, small PRs per step — merge earlier steps that pass tests before tackling next step.
- If you want, I can now generate the first code-generation prompt (Step 1 or Step 2) as a copy-paste-ready prompt that includes repository context and the exact files to create. Tell me which step to generate first in code-ready format.