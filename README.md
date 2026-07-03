# Legate

A digital estate/legacy vault app. Lets a **vault owner** securely record financial accounts, legal documents, digital assets, and final wishes, and designate **trusted persons** who can request access after the owner's death.

See [FUNCTIONALITY.md](./FUNCTIONALITY.md) for a full breakdown of what's implemented vs. what's still missing.

## Tech Stack

- **Client**: Expo / React Native, TypeScript, React Navigation (stack + bottom tabs)
- **Backend**: Supabase (Postgres, Auth, Row Level Security, Edge Functions)
- **Email**: Gmail SMTP — used both as Supabase's Auth email sender and by a Supabase Edge Function for trusted-person invitations
- **UI**: React Native Paper, custom navy/gold theme (`src/constants/theme.ts`)

## Modules

- `src/screens/auth` — login, sign up (email/password, magic link, Google), app-lock screen
- `src/screens/onboarding` — first-run welcome flow
- `src/screens/home` — dashboard with vault health score
- `src/screens/vault` — vault categories, item CRUD, item detail
- `src/screens/settings` — profile, trusted persons management, paywall/upgrade
- `src/screens/estate` — estate checklist, document uploads, death verification
- `src/screens/workspace` — post-unlock Family/Heir Workspace, subscription tracker
- `src/services` — Supabase client, auth, encryption, plan limits, and per-feature data access (documents, checklist, death verification, subscriptions, app settings)
- `src/navigation` — app-wide navigation, auth-gated routing, biometric lock gate
- `supabase/` — database schema (tables, RLS, storage buckets) and edge functions

## Features

- Email/password, magic-link, and Google (OAuth) authentication
- Vault with 11 categories (banking, investments, insurance, loans/debts, subscriptions, real estate, vehicles, contacts, digital assets, legal documents, final wishes)
- Real AES-256-CBC client-side encryption of sensitive vault fields, with a device-bound key in the platform keychain/keystore
- Sensitive field masking in vault item views
- Vault health score based on category coverage
- Trusted person invitations with email notifications, and automatic invite acceptance/linkage on signup
- Death verification: certificate upload, two-person ("two-key") confirmation, a 72-hour waiting period, and a live status timeline
- Estate document upload/storage, private per vault
- Auto-generated estate checklist from vault contents once a vault unlocks
- Family/Heir Workspace: once unlocked, trusted persons can browse the vault, documents, checklist, and trusted-person list (read-only except where explicitly allowed)
- Subscription cancellation tracking with a monthly-savings calculation
- Subscription plan limits (items / trusted people / document upload) enforced against a Paywall/upgrade screen
- Biometric app-lock (Face ID / Touch ID) on launch and when returning from the background
- Row Level Security-backed data access on the backend, including narrowly-scoped policies for what a trusted person may read/write before and after a vault unlocks

## Dev Setup

### Prerequisites

- Node.js and npm
- Expo CLI (`npm install -g expo-cli`, or use `npx expo`)
- A Supabase account ([supabase.com](https://supabase.com))
- (Optional) A [Google Cloud](https://console.cloud.google.com) account for Google sign-in
- (Optional) A Gmail account with an [App Password](https://myaccount.google.com/apppasswords) for sending emails

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**.
2. Pick an organization, name, database password (save it), and region.
3. Wait for provisioning to finish (a couple of minutes).
4. Go to **Project Settings → API** and note down the **Project URL** and the **anon/public key** — you'll need these in step 5.

> Free-tier Supabase projects auto-pause after a week of inactivity. If yours gets paused and won't reactivate, the fastest fix is usually to create a fresh project and repeat this setup — projects are free and setup only takes a few minutes end-to-end.

### 3. Set up the database schema

1. In the Supabase dashboard, open **SQL Editor**.
2. Open `supabase/schema.sql` from this repo, copy its entire contents, paste into the SQL Editor, and click **Run**.

This single script creates everything the app needs:
- Tables: `vault_items`, `trusted_persons`, `death_verifications`, `estate_tasks`, `documents`, `user_profiles`
- Row Level Security policies and trigger-based guards on every table
- Two private Storage buckets: `death-certificates` and `documents`, with their own access policies
- Helper functions/triggers (`get_user_email`, `is_vault_unlocked_for`, the `handle_new_user` signup trigger, etc.)

It's idempotent (`DROP POLICY IF EXISTS` / `CREATE OR REPLACE` / `ON CONFLICT DO NOTHING` throughout), so it's safe to re-run any time the schema changes — just re-paste and re-run the whole file.

### 4. Enable Google sign-in

Google login uses Supabase's OAuth provider, so it needs to be configured in both Google Cloud and Supabase:

1. In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
   - If prompted to configure an OAuth consent screen first, do so (External user type is fine for testing; add your own email as a test user if the app is in "Testing" mode).
2. In the Supabase dashboard, go to **Authentication → Sign In / Providers → Google**, toggle it on, and paste in the **Client ID** and **Client Secret** from step 1.
3. Copy the **Callback URL (for OAuth)** shown on that same Supabase provider page (it looks like `https://<your-project-ref>.supabase.co/auth/v1/callback`) and add it under **Authorized redirect URIs** on the Google OAuth client.
4. In Supabase, go to **Authentication → URL Configuration** and add `legate://auth/callback` to **Redirect URLs** (this is the app's own deep link, defined by `"scheme": "legate"` in `app.json`).

Without this, the "Continue with Google" buttons in the app will fail with an error from Supabase instead of opening the Google login prompt. Email/password sign-in works without any of this.

### 5. Set up Gmail SMTP (for account confirmation emails)

By default, Supabase sends confirmation/reset emails through its own built-in mailer, which is rate-limited and unreliable — fine for a quick test, not for real use. To send through Gmail instead:

1. Turn on 2-Step Verification on the Google account you want to send from (required for App Passwords): [myaccount.google.com/security](https://myaccount.google.com/security).
2. Generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) — pick "Mail" as the app, name it anything (e.g. "Legate"), and copy the 16-character password shown.
3. In the Supabase dashboard, go to **Project Settings → Authentication → SMTP Settings**, enable custom SMTP, and fill in:
   - **Host**: `smtp.gmail.com`
   - **Port**: `465`
   - **Username**: your full Gmail address
   - **Password**: the App Password from step 2 (not your normal Gmail password)
   - **Sender email**: your Gmail address
   - **Sender name**: `Legate`
4. Save. New signups, password resets, etc. will now be sent through Gmail.

### 7. Configure environment variables

Create a `.env` file in the project root using the Project URL and anon key from step 2:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 8. Run the app

```bash
npm start        # Expo dev server
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web
```

### 9. (Optional) Deploy the invitation email function

The `send-invitation` Edge Function emails a trusted person when they're invited to a vault, sent via the same Gmail account configured in step 5. Without it, invitations are still saved to the database — the person just won't get an email about it.

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy send-invitation
```

Then set your Gmail address and App Password (the same one from step 5) as Edge Function secrets:

```bash
supabase secrets set GMAIL_ADDRESS=your_gmail_address@gmail.com
supabase secrets set GMAIL_APP_PASSWORD=your_16_character_app_password
```

Without these set, the function still runs and the invitation is still saved, but no email is sent (it degrades gracefully rather than failing).

### Notes on Storage bucket access

The two Storage buckets created in step 3 (`death-certificates`, `documents`) are private. Files are uploaded under a path prefixed with the vault owner's user ID (e.g. `<vault_owner_id>/<filename>`), and the app reads them back via short-lived signed URLs — there's no public bucket access and nothing else to configure here.
