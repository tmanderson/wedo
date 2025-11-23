# Multi-Party Gift Registry

A collaborative gift registry web application that enables groups (families, friends) to manage gift lists together. Each collaborator gets their own sub-list, can add items, and other collaborators can claim and mark items as bought while keeping the list owner unaware of who purchased their gifts.

## Features

- **Collaborative Registries**: Create registries and invite collaborators via email
- **Personal Sub-lists**: Each collaborator automatically gets their own sub-list
- **Privacy-Protected**: List owners cannot see who claimed or bought items on their list
- **Magic Link Authentication**: Passwordless sign-in via Supabase
- **Item Management**: Add items with labels or URLs (auto-parses page titles)
- **Claim System**: Claim items, mark as bought, with race-condition protection
- **Soft Delete**: Deleted items remain visible to collaborators with "deleted by owner" badge

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 5
- **Auth**: Supabase Magic Link (Email OTP)
- **Hosting**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or Supabase project)
- Supabase project for authentication

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-jwt-secret"

# Application
APP_BASE_URL="http://localhost:3000"
```

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma client**:
   ```bash
   npm run prisma:generate
   ```

3. **Run database migrations**:
   ```bash
   npm run prisma:migrate:dev
   ```

4. **Seed the database** (optional):
   ```bash
   npm run prisma:seed
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

### Supabase Configuration

1. Create a new Supabase project
2. Enable Email (Magic Link) authentication in Authentication > Providers
3. Add redirect URLs in Authentication > URL Configuration:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
   - `https://your-domain.com/accept-invite` (for invite flows)
4. Copy the project URL, anon key, service role key, and JWT secret to your environment variables

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm test` | Run tests |
| `npm run lint` | Run linter |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate:dev` | Run migrations (dev) |
| `npm run prisma:migrate:deploy` | Run migrations (production) |
| `npm run prisma:seed` | Seed the database |
| `npm run prisma:studio` | Open Prisma Studio |

## API Endpoints

### Registries
- `POST /api/registries` - Create a registry
- `GET /api/registries` - List user's registries
- `GET /api/registries/:id` - Get registry with visibility rules applied

### Invites
- `POST /api/registries/:id/invite` - Invite collaborators
- `GET /api/invite/accept?token=TOKEN` - Accept an invite
- `POST /api/invite/accept` - Get invite info (public)

### Items
- `POST /api/sublists/:sublistId/items` - Create item
- `GET /api/items/:id` - Get item
- `PATCH /api/items/:id` - Update item
- `DELETE /api/items/:id` - Soft-delete item

### Claims
- `POST /api/items/:id/claim` - Claim item
- `POST /api/items/:id/release` - Release claim
- `POST /api/items/:id/mark-bought` - Mark as bought

### Collaborators
- `DELETE /api/registries/:id/collaborators/:collabId` - Remove collaborator

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Add environment variables in Vercel project settings
3. Deploy

### Manual

1. Build the application:
   ```bash
   npm run build
   ```

2. Run database migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```

3. Start the server:
   ```bash
   npm run start
   ```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## License

ISC
