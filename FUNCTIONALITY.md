# Legate — Functionality Overview

Legate is a digital estate/legacy vault app (Expo/React Native, bundle id `com.legate.app`). It lets a **vault owner** securely record financial accounts, legal documents, digital assets, and final wishes, and designate **trusted persons** who can eventually request access after the owner's death.

This document reflects the actual state of the code as of 2026-07-03, not the intended end-state — sections below are explicit about what's live vs. stubbed.

## Tech Stack

- **Client**: Expo / React Native, TypeScript, React Navigation (stack + bottom tabs)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Edge Functions)
- **Email**: Resend, via a Supabase Edge Function
- **Design system**: navy (`#1B2A4A`) / gold (`#C9A84C`) / cream (`#F9F7F4`), serif headings — defined in `src/constants/theme.ts`

## Navigation Flow

`App.tsx` → `AppNavigator` (`src/navigation/AppNavigator.tsx`), which switches on auth state (`useAuth`) and an AsyncStorage `hasSeenOnboarding` flag:

- Splash (min. 2s) while auth/onboarding state resolves
- Unauthenticated, no onboarding seen → Onboarding → Auth (Login/SignUp)
- Unauthenticated, onboarding seen → Auth directly
- Authenticated → Main bottom tabs (**Home, Vault, Trusted, Documents, Settings**) + modal/stack screens (`VaultItemDetail`, `AddVaultItem`, `CategoryItems`, `DeathVerification`, `TrustedPersons`)

## What Works Today

### Auth
- Email/password sign up and sign in (Supabase Auth)
- Magic link sign-in (OTP email)
- Sign out
- A `user_profiles` row is auto-created on signup via a Postgres trigger (`handle_new_user`)

### Vault (core feature)
- 11 categories: banking, investments, insurance, loans_debts, subscriptions, real_estate, vehicles, important_contacts, digital_assets, legal_documents, final_wishes
- Add / edit / delete vault items, each with category-specific fields
- Sensitive fields (account numbers, routing numbers, wallet addresses, etc.) are masked in list/detail views
- Item data is obfuscated client-side before storage (see **Encryption caveat** below)
- Vault health score: `% of the 11 categories that have at least one item`, shown on Home and computed (but not surfaced) on the Vault screen

### Trusted Persons
- Invite by name/email/relationship (spouse, child, executor, other)
- Duplicate-invite check per vault owner
- Invitation triggers the `send-invitation` Edge Function (Resend email), degrading gracefully (invite still saved) if email fails or `RESEND_API_KEY` isn't configured
- Status badges: Invited / Accepted / Declined

### Home Dashboard
- Personalized greeting, vault health ring, item/trusted/category stat cards

### Settings
- Profile display, sign out, "Reset Onboarding" (dev utility)

## What's Stubbed or Non-Functional

These exist as screens/routes/schema but have no real logic behind them yet:

| Area | State |
|---|---|
| **Documents tab** | Title + subtitle only. No upload, despite `expo-document-picker` being installed and a `documents` table existing. |
| **Death Verification** | Title + subtitle only. No certificate submission, no approval workflow. Not linked from any screen (only reachable by direct navigation). |
| **Estate Checklist** | Title + subtitle only. Not even registered in the navigator — currently unreachable in the app. |
| **"Two-key" dual approval** | Trusted Persons screen claims *"Two trusted people must confirm the request before your vault unlocks,"* but the schema only has one optional `secondary_confirmation_by` column and no enforcement logic anywhere. |
| **Biometric lock** | Settings toggle is local UI state only. `isBiometricAvailable`/`authenticateWithBiometrics` are implemented in `services/auth.ts` but never called — no app-lock gate exists. |
| **Subscription plan limits** | `PLAN_FEATURES` (free/essential/family/legacy caps) is fully defined in constants but never checked before adding items or inviting people. UI hardcodes "Essential Plan" regardless of actual plan. |
| **Settings rows** | Auto-lock, Notifications, Upgrade Plan, Privacy Policy, Terms of Service all render but have no `onPress` handlers. |
| **Sign-up owner/trusted toggle** | Selecting "I was invited as a trusted person" has no effect — not passed to signup, and accepting an invite doesn't link the new account to the inviter's vault. |

## ⚠️ Encryption Caveat (important)

`src/services/encryption.ts` does **not** implement real encryption. It computes a SHA-256 integrity hash and stores `hash:base64(plaintext)`. This is trivially reversible by anyone with the stored string — it is obfuscation, not confidentiality. Data protection currently relies entirely on Supabase Row Level Security (server-side), not on this client-side layer. The code comments already flag this as a placeholder for real AES-256 encryption. **This should be prioritized before handling real user data.**

## Data Model (Supabase `schema.sql`)

- `user_profiles` — extends `auth.users`, `full_name`, `subscription_plan`
- `vault_items` — `user_id`, `category`, `title`, `encrypted_data`, `metadata`
- `trusted_persons` — `vault_owner_id`, `email`, `full_name`, `status`, `role`
- `death_verifications` — `vault_owner_id`, `requested_by`, `secondary_confirmation_by`, `status`, `waiting_period_ends_at` (unused by app code)
- `estate_tasks` — auto-checklist model (unused by app code)
- `documents` — file uploads model (unused by app code)

All tables have RLS: owners get full CRUD on their own data; trusted persons get read access only after an *approved* `death_verifications` row exists.

## Backend

- **`services/supabase.ts`** — Supabase client, session persisted in AsyncStorage
- **`services/auth.ts`** — auth wrapper + unused biometric helpers
- **`services/encryption.ts`** — see caveat above
- **Edge Function `send-invitation`** — validates caller owns the vault, sends a branded HTML invite email via Resend, no-ops gracefully without a configured API key

## Known Cleanup Items

- Magic-link redirect scheme is still `householdvault://auth/callback` — a leftover from an earlier project name, inconsistent with `com.legate.app` / slug `legate`
- `SUBSCRIPTION_PLATFORMS` constant is defined but unused (subscriptions use free text instead)
- `ChecklistScreen` is orphaned (not in the navigator)

## Suggested Next Development Priorities

1. **Real encryption** — replace the SHA-256/base64 scheme with actual AES-256 (or rely solely on RLS + Supabase-managed encryption at rest, if client-side encryption is dropped as a goal).
2. **Death verification flow** — certificate upload, notification to trusted persons, approval/waiting-period logic, and actually wiring the "two-key" claim to real dual-confirmation logic (or removing the claim from copy).
3. **Documents tab** — wire up `expo-document-picker` + Supabase Storage upload, tied to the existing `documents` table.
4. **Estate checklist** — decide whether to keep or remove; if keeping, register the screen and implement task generation from vault contents.
5. **Plan enforcement** — check `PLAN_FEATURES` limits before add-item/invite actions; show the user's real plan instead of hardcoded "Essential."
6. **Settings functionality** — wire up biometric app-lock, auto-lock timer, and notification preferences.
7. **Fix sign-up owner/trusted linkage** — when someone signs up after being invited, connect their new account to the inviting vault owner's `trusted_persons` row.
