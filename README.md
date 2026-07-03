# Legate

A digital estate/legacy vault app. Lets a **vault owner** securely record financial accounts, legal documents, digital assets, and final wishes, and designate **trusted persons** who can request access after the owner's death.

See [FUNCTIONALITY.md](./FUNCTIONALITY.md) for a full breakdown of what's implemented vs. stubbed.

## Tech Stack

- **Client**: Expo / React Native, TypeScript, React Navigation (stack + bottom tabs)
- **Backend**: Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Email**: Resend, via a Supabase Edge Function
- **UI**: React Native Paper, custom navy/gold theme (`src/constants/theme.ts`)

## Modules

- `src/screens/auth` — login, sign up
- `src/screens/onboarding` — first-run welcome flow
- `src/screens/home` — dashboard with vault health score
- `src/screens/vault` — vault categories, item CRUD, item detail
- `src/screens/settings` — profile, trusted persons management
- `src/screens/estate` — estate checklist, document uploads, death verification (currently stubbed)
- `src/services` — Supabase client, auth, client-side data obfuscation
- `src/navigation` — app-wide navigation and auth-gated routing
- `supabase/` — database schema and edge functions

## Features

- Email/password and magic-link authentication
- Vault with 11 categories (banking, investments, insurance, loans/debts, subscriptions, real estate, vehicles, contacts, digital assets, legal documents, final wishes)
- Sensitive field masking in vault item views
- Vault health score based on category coverage
- Trusted person invitations with email notifications
- Row Level Security-backed data access on the backend

## Dev Setup

### Prerequisites

- Node.js and npm
- Expo CLI (`npm install -g expo-cli`, or use `npx expo`)
- A Supabase project

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set up the database

Apply `supabase/schema.sql` to your Supabase project (via the SQL editor or `supabase db push`).

### 4. Run the app

```bash
npm start        # Expo dev server
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web
```

### 5. (Optional) Deploy the invitation email function

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy send-invitation
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

Without `RESEND_API_KEY` configured, trusted person invitations are still saved to the database, but no email is sent.
