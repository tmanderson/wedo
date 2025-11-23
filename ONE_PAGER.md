# Multi-Party Gift Registry — One Pager

## Executive summary
A web-first multi-party gift registry that enables groups (e.g., families) to collaboratively manage gift lists. The registry creator auto-creates a sub-list for each invitee and the creator. Collaborators can add items to their own sub-list, see other collaborators’ lists, claim items, and mark items bought. Crucially, list owners cannot see who claimed or bought items on their own sub-list — other collaborators can. MVP focuses on simple label/link items (auto-parsed title from link), invite-only access via email magic links, and no payment processing.

---

## Problem being solved
Coordinating group gift-giving is messy: duplicate purchases, poor visibility into who’s taking responsibility, and difficulty managing gifts across multiple family members. This product centralizes lists, enables collaborative claiming with controlled visibility, and preserves surprise privacy for list owners regarding who bought their gifts.

Primary benefit: clear coordination of group gifting while preserving recipients’ surprise and preventing duplicate purchases.

---

## Target audience / personas
Primary persona:
- Family organizer (any age) coordinating holiday or occasion gifts
- Comfortable with email and basic web interaction
- Typical scenarios: holiday gift planning, birthdays, parent/child/extended family coordination

Secondary personas:
- Contributors/claimers (family members, friends): add claims, mark items bought
- Recipients/list owners: manage their own sub-list (add/edit/delete labels) without seeing which contributors have claimed/bought their items

All ages supported; emphasis on simple UX and email-based auth (no password friction).

---

## MVP scope (must-haves)
- Web-first application (Next.js v16 + TypeScript + React)
- Persistent user accounts via magic-link email authentication
- Registry with title, occasion date/deadline, invite-only privacy
- Auto-created sub-lists — one per collaborator + creator
- Item model: title/label OR link (if link, auto-parse page title)
- Collaborators can:
  - Add/edit/delete items only on their own sub-list
  - See all sub-lists
  - Claim/unclaim items on other people’s sub-lists
  - Mark bought/completed only if they are the claimer
- Visibility rule: sub-list owner cannot see claims/bought status on their own items; all other collaborators can see claim/bought status and claimer identity
- Invite flow via email with magic link (SES + nodemailer)
- Registry-level setting: creator-only vs collaborators-can-invite (configurable at creation)
- Removing collaborator deletes their sub-list and its items
- Deleted items by sub-list owner remain visible to collaborators with a callout “deleted by owner”
- No payment features, no email notifications for claim/buy events or invites (except magic link acceptance emails)
- Basic audit/history for actions (who claimed, marked bought, deleted) visible to collaborators (not to the sub-list owner for their own list)

---

## Platforms & tech stack
- Frontend / App: Next.js v16 (app router), React, TypeScript
- Backend: Next.js app routes for API (Node), TypeScript
- Database: PostgreSQL (recommended) or other relational DB
- Email: AWS SES + nodemailer for magic link invites and authentication
- Hosting / infra: Vercel (Next.js) or AWS (Lambda/EC2), RDS for Postgres
- Optional: Prisma or TypeORM for ORM / schema management
- Auth: Magic-link (email token stored & short-lived)
- Logging / monitoring: Sentry, Datadog or similar
- Image parsing / scraping: server-side fetch + simple HTML title/meta parsing

---

## Data model (high-level)
- User
  - id, email, name, accepted_at, last_auth_at, created_at
- Registry
  - id, title, occasion_date, deadline, owner_user_id, privacy (invite-only), collaborators_can_invite (bool), created_at, updated_at
- Collaborator (membership)
  - id, registry_id, user_id (nullable for pending invites), email, name (nullable until accepted), status: pending|accepted|removed, auto_created_sublist_id
- SubList
  - id, registry_id, collaborator_id, owner_user_id (nullable until accept), visible: true/false (deleted? handled via soft state)
- Item
  - id, sublist_id, label, url (nullable), parsed_title (nullable), created_by_user_id, created_at, deleted_by_user_id (nullable), deleted_at (nullable)
- Claim
  - id, item_id, claimer_user_id, claimed_at, status: claimed|bought|released, bought_at (nullable), released_at (nullable)
- InviteToken
  - id, token, registry_id, email, expires_at, created_at

Notes:
- Deleted items: keep row but set deleted_by_user_id & deleted_at so collaborators still see it with “deleted by owner” callout.
- When removing collaborator: cascade delete collaborator, sublist, items, claims for that sublist (per requirement).

---

## Permissions & visibility rules (detailed)
- Registry creator (owner)
  - Always can add/remove collaborators
  - Can set collaborators_can_invite option
  - Sees all sub-lists and full visibility (except owner rule applies to their own sub-list)
- Collaborators (accepted)
  - Add/edit/delete items on their own sub-list only
  - See all sub-lists and items
  - Claim/unclaim items on other collaborators’ sub-lists (one claim per item enforced)
  - Mark an item as bought only if they are the current claimer
  - If creators opted in, can invite others (if collaborators_can_invite true)
- Sub-list owner
  - Cannot see claim or bought status on their own sub-list’s items
  - Can delete items; deletion does NOT remove visibility for collaborators—deleted items remain visible to collaborators with a special flag
- Pending (not-yet-accepted) collaborators
  - Their sub-list is auto-created and visible to others
  - Other collaborators can add items and claim items on pending user's sub-list prior to acceptance
  - Invite acceptance binds the user account to that sub-list
- Removing a collaborator:
  - Creator (and optionally allowed collaborators) can remove
  - Removal deletes collaborator and all their data within registry (sub-list, items, claims) — no retention
- Claim uniqueness:
  - Only one active claim per item
  - Claimers can unclaim (release) prior to marking bought
  - If a claimer unclaims, another collaborator can claim
- Mark-as-bought behavior:
  - Only current claimer can mark item bought
  - If claimer unclaims, bought status (if any) is removed
- Deleted items:
  - Owner-deleted items: item row remains, deleted_by_user_id and deleted_at set; collaborators still see the item and its claims/bought status. Owner does not see claim/bought info and will see it as deleted.
  - If a collaborator deletes their own item (they own a different sub-list), behavior is same: deletion hides editing ability but remains visible to others

---

## Core user flows (step-by-step)

1. Create registry (creator)
   - UX: enter title, occasion date/deadline, privacy (invite-only), choose collaborator-invite policy (creator-only or collaborators-can-invite)
   - System: create Registry record; create Collaborator entry for owner (accepted=true); create SubList for owner

2. Invite collaborators
   - UX: enter emails and optional names
   - System:
     - For each email, create Collaborator record status=pending, create SubList auto (linked to collaborator), create InviteToken
     - Send magic-link invite email via SES + nodemailer. Email contains token link which authenticates and takes user to registry.
   - Visibility: pending collaborator’s sub-list is visible to other accepted collaborators; others may add items/claims on it.

3. Accept invite / authentication
   - UX: recipient clicks magic link -> email auth -> account persisted/linked
   - System:
     - If user exists, mark collaborator.user_id and status=accepted
     - If new, create User and link
     - Persist accepted_at; user can now re-authenticate via magic links in future and see list in their dashboard
   - Post-accept: user sees their sub-list and can manage items on it

4. Viewing registry
   - UX: grid/list of sub-lists (one per collaborator), each with items
   - For each item:
     - If viewing your own sub-list: you see labels and ability to add/edit/delete items; you do NOT see claim/bought badges/claimer identity
     - If viewing someone else’s sub-list: you see item, claims (claimer name), bought status and who bought

5. Add / edit / delete item (sub-list owner)
   - Add: item = label or URL; if URL provided, server fetches and parses title for display
   - Edit: change label / URL
   - Delete: mark deleted_by_user_id & deleted_at; item stays visible to collaborators with “deleted by owner” flag; owner loses view/edit of claim/bought details

6. Claim item (other collaborators)
   - Preconditions: item not currently claimed
   - UX: “Claim” button visible on others’ items; upon claiming, record Claim row with claimer_user_id and status=claimed
   - Visibility: other collaborators (including other non-owner collaborators) see who claimed; owner does not

7. Unclaim (release) item
   - UX: “Release” button available to current claimer
   - System: update Claim.status=released, released_at; item becomes claimable again
   - If the claimer had marked bought earlier (edge case), unclaiming removes bought status as specified

8. Mark as bought
   - UX: “Mark as bought” button only for current claimer
   - System: set Claim.status=bought, bought_at; visible to collaborators (but not to sub-list owner)

9. Remove collaborator
   - Per policy:
     - Creator can always remove; collaborators can remove others only if registry setting collaborators_can_invite includes removal permission (configurable)
   - System: delete collaborator record, cascade delete sublist, items, claims belonging to that collaborator (per requirement), and expire invites
   - Clients: collaborators’ UI updates to remove the sub-list from registry

10. Edge cases & rules
    - Pending collaborator: other collaborators can add/claim items before acceptance
    - Claimer unclaims then owner deletes item: If owner deletes an actively claimed item, deletion remains flagged; the claim remains visible to collaborators; owner cannot see it.
    - If a collaborator is removed while they hold claims, those claims are deleted with the collaborator data (available items become unclaimed again or removed depending on deletion cascade).
    - If two invites with same email are created, coalesce or deduplicate at invite creation (prevent duplicates).
    - If owner deletes an item that someone bought: item remains visible to collaborators with a deletion callout; the owner does not know it was bought.

---

## API & auth (recommendation)
- Auth: magic link flow
  - POST /api/invite — create invite tokens, send emails (SES + nodemailer)
  - GET /api/auth/verify?token=xxx — validate token, sign-in user, set session cookie/JWT
  - POST /api/auth/magic-request — request link
- Registry endpoints:
  - GET /api/registries — list registries user is part of
  - POST /api/registries — create registry
  - GET /api/registries/:id — full registry with sublists filtered per viewer rules
  - PATCH /api/registries/:id — update settings (owner-only)
  - POST /api/registries/:id/invite — invite collaborator
  - DELETE /api/registries/:id/collaborators/:collabId — remove collaborator
- Items & claims:
  - POST /api/sublists/:id/items — create item (owner-only for that sublist)
  - PATCH /api/items/:id — edit item (owner-only)
  - DELETE /api/items/:id — delete (owner-only; soft delete flag)
  - POST /api/items/:id/claim — create claim (only if not claimed)
  - POST /api/items/:id/release — release claim (only by claimer)
  - POST /api/items/:id/mark-bought — mark bought (only by claimer)
  - GET /api/items/:id — return item and claims with visibility applied (hide claim info if viewer is sub-list owner)

Session management: HTTP-only secure cookie or short-lived JWT tied to email.

---

## UI/UX considerations
- Clear distinction between “your sub-list” and “others’ sub-lists”
- Items:

  - For owner’s view: show item label/URL, add/edit/delete controls, no claim/bought badges
  - For other collaborators: show badge with claimer name and bought status; disable claim button if already claimed

- Invite flow: single-click magic link to accept and authenticate; show pending state until accepted
- Notifications: MVP omits automatic emails for claims/buys; only send magic link invites and confirmations
- Dashboard: “My registries” and “Invitations” sections; list of registries user created or accepted
- Accessibility: clear CTAs and simple flows for non-technical users

---

## Non-functional requirements
- Data retention: removed collaborator data must be fully deleted for registry (per requirement)
- Security:
  - Use signed, expiring invite tokens
  - Use TLS for all traffic
  - Rate-limit invite & magic link requests
- Privacy:
  - Owner’s list privacy: don’t expose claim/bought metadata to the sub-list owner
  - Invite-only registry: no public share link in MVP
- Scale: anticipate small groups; optimize for concurrency on claim operations with DB-level uniqueness constraints for claims
- Monitoring: error tracking (Sentry) & basic usage metrics

---

## Implementation risks & mitigations
- Race conditions on claiming:
  - Use DB unique constraint on active claim per item (e.g., unique(item_id) where status in (claimed,bought))
  - Wrap claim creation in transaction and return clear conflict errors
- Email deliverability:
  - Use SES with proper DKIM/SPF configuration; provide resend flows for invites
- Parsing external URLs:
  - Server-side fetch may fail or be slow — do async fetch and fall back to user-entered label
- Privacy enforcement:
  - Ensure server applies visibility filters — never trust client-side hiding to enforce owner privacy

---

## Acceptance criteria for MVP
- Users can create registries, invite collaborators by email, and create auto sub-lists
- Invited users receive a magic link email and can accept to become collaborators
- Collaborators can add/edit/delete items on their own sub-lists
- Collaborators can claim/unclaim items on others’ sub-lists; only claimers can mark bought
- Sub-list owners cannot see who claimed or bought items on their own sub-list
- When a collaborator is removed, their sub-list and all associated items/claims are deleted
- Deleted items by owners remain visible to other collaborators with a “deleted by owner” callout
- Persistent accounts are available via email magic links; users see all registries they belong to
- Tech stack: Next.js v16 (app router), TypeScript, React, AWS SES + nodemailer integration for email invites

---

## Next steps / recommended roadmap (short term)
1. Product spec sign-off (this one-pager)
2. Engineering kickoff: define schema migrations and API contracts
3. Build auth + invite flow (magic link, SES) + user persistence
4. Registry creation + auto sublist creation + invite UI
5. Item CRUD + URL parsing with fallback
6. Claim/unclaim/mark-bought flows with DB constraints and visibility logic
7. Dashboard & basic UX polish
8. QA: unit tests, integration tests for claim race conditions, e2e invite acceptance
9. Beta testing with a small family group

---

## Suggested milestones & rough estimate (team of 2–3 engineers)
- Week 0–1: Design & API schema, auth & invite flows
- Week 1–3: Registry creation, sublists, invites (SES), magic-link auth
- Week 3–5: Item CRUD + URL parsing, soft-delete behavior
- Week 5–7: Claim/unclaim/mark-bought logic + DB constraints
- Week 7–8: UI polish, dashboards, acceptance tests, deployment
(Estimate: ~2 months to MVP depending on team bandwidth)

---

If you want, I can:
- Produce a prioritized Jira-style backlog with specific user stories and acceptance criteria
- Sketch initial API contract & DB migration SQL (or Prisma schema)
- Draft UI mockups for the core pages (registry view, invite modal, item actions)

Which deliverable would you like next?