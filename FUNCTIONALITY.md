# Legate — Functionality Overview

Legate is a digital estate/legacy vault app (Expo/React Native, bundle id `com.legate.app`). It lets a **vault owner** securely record financial accounts, legal documents, digital assets, and final wishes, and designate **trusted persons** who can request access after the owner's death — and once unlocked, gives those trusted persons a shared workspace to wind down the estate together.

This document reflects the actual state of the code, not the intended end-state — sections below are explicit about what's live vs. still missing.

## Tech Stack

- **Client**: Expo / React Native, TypeScript, React Navigation (stack + bottom tabs)
- **Backend**: Supabase (Postgres + Auth + Row Level Security + Storage + Edge Functions)
- **Email**: Resend, via a Supabase Edge Function
- **Design system**: navy (`#1B2A4A`) / gold (`#C9A84C`) / cream (`#F9F7F4`), serif headings — defined in `src/constants/theme.ts`

See [README.md](./README.md) for how to stand up a Supabase project from scratch to run this app.

## Navigation Flow

`App.tsx` → `AppNavigator` (`src/navigation/AppNavigator.tsx`), which switches on auth state (`useAuth`), an AsyncStorage `hasSeenOnboarding` flag, and a biometric app-lock gate:

- Splash (min. 2s) while auth/onboarding state resolves
- Unauthenticated, no onboarding seen → Onboarding → Auth (Login/SignUp)
- Unauthenticated, onboarding seen → Auth directly
- Authenticated, biometric lock enabled → `AppLockScreen` (must pass Face ID/Touch ID) before anything else renders, on both cold launch and returning from background
- Authenticated → Main bottom tabs (**Home, Vault, Trusted, Documents, Settings**) + a large set of stack screens (vault item CRUD, death verification, checklist, trusted persons, documents, subscriptions, the Heir Workspace, and the paywall)

## What Works Today

### Auth
- Email/password, magic-link (OTP), and **Google OAuth** sign-in/sign-up (via `expo-auth-session` + Supabase's Google provider)
- Sign out
- A `user_profiles` row is auto-created on signup via a Postgres trigger (`handle_new_user`)
- Biometric app-lock: if enabled, Face ID/Touch ID is required on cold launch and whenever the app returns from the background (`src/screens/auth/AppLockScreen.tsx`)
- When someone signs up choosing "I was invited as a trusted person," any pending `trusted_persons` invite matching their email is automatically accepted and linked (`acceptPendingTrustedPersonInvites` in `services/auth.ts`, called from `useAuth` on every session start)

### Vault (core feature)
- 11 categories: banking, investments, insurance, loans_debts, subscriptions, real_estate, vehicles, important_contacts, digital_assets, legal_documents, final_wishes
- Add / edit / delete vault items, each with category-specific fields
- Sensitive fields (account numbers, routing numbers, wallet addresses, etc.) are masked in list/detail views
- **Real AES-256-CBC encryption** of item data (`services/encryption.ts`) — a random IV per encryption, device-bound key stored in the platform keychain/keystore (`expo-secure-store`). Backward-compatible: still decrypts data written under the old placeholder scheme.
- Vault health score: `% of the 11 categories that have at least one item`, shown on Home and on the Vault screen
- New items are blocked past the current plan's item limit, with an upgrade prompt

### Trusted Persons
- Invite by name/email/relationship (spouse, child, executor, other)
- Duplicate-invite check per vault owner
- Invitation triggers the `send-invitation` Edge Function (Resend email), degrading gracefully (invite still saved) if email fails or `RESEND_API_KEY` isn't configured
- Status badges: Invited / Accepted / Declined — status flips to Accepted automatically when the invitee signs up or logs in with the matching email
- New invites are blocked past the current plan's trusted-person limit, with an upgrade prompt
- Read-only view of another vault owner's trusted-person list once that vault is unlocked (no invite/manage controls in that context)

### Death Verification (two-key unlock)
- A trusted person can request a vault unlock by uploading a death certificate (stored in a private Supabase Storage bucket)
- A **second, different** trusted person must confirm the request before anything else happens — enforced server-side (a trusted person can never confirm their own request)
- Once confirmed, a 72-hour waiting period starts (`DEATH_VERIFICATION_WAITING_PERIOD_HOURS`); the vault only actually unlocks once that period has elapsed — checked both client-side and in Postgres RLS (`is_vault_unlocked_for`), not just by a status flag
- A live status timeline shows each step: request submitted → second confirmation → waiting period → unlocked
- The vault owner can reject/cancel a request on their own vault (e.g. a false alarm)
- Reachable from Settings → "Vault Unlock Requests" (`src/screens/estate/DeathVerificationScreen.tsx`)

### Documents
- Upload estate documents (wills, deeds, etc.) to a private Supabase Storage bucket, tied to the `documents` table
- List, open (via a short-lived signed URL), and delete, for the vault owner
- Blocked entirely on plans without document-upload access
- Read-only for trusted persons once the vault is unlocked

### Estate Checklist
- Auto-generated from vault contents the moment a vault unlocks (`generateEstateTasks` in `services/checklist.ts`) — e.g. a banking item generates "Notify {bank}," an insurance item generates "File claim with {provider}," idempotent so it's safe to regenerate
- Filterable list (All / Pending / Done / Mine) with a progress bar, tap to toggle complete
- Reachable from Settings (owner's own vault) or via the Heir Workspace (another unlocked vault)

### Family / Heir Workspace
- Once a vault is unlocked, an "Enter Family Workspace" button appears on the death-verification status card
- Shows the vault owner's name, a stacked-avatar chip of accepted trusted persons, a task-completion stat, a monthly-subscription-savings stat, and a list of urgent (high-priority, incomplete) tasks
- Quick-action grid links into the real Vault, Checklist, Trusted Persons ("Contacts"), Documents, and Subscriptions screens — all in read-only-except-where-allowed mode for the trusted person
- Activity Log quick action is present but shows a "Coming Soon" message — no audit-trail feature exists yet (see Known Gaps)

### Subscription Tracker
- Lists subscription-category vault items with monthly cost and a cancel/done toggle
- Computes total monthly savings from cancelled subscriptions
- A trusted person can toggle a subscription cancelled on an unlocked vault (narrowly scoped: they can only rewrite that one vault item's data, only for subscription-category items, only post-unlock — enforced by an RLS policy + trigger, not just the UI)
- Reachable from Settings (owner) or the Heir Workspace (trusted person)

### Plan Limits & Paywall
- `user_profiles.subscription_plan` (free/essential/family/legacy) is the source of truth, shown correctly in Settings and used to gate item count, trusted-person count, and document upload
- A Paywall screen (Settings → "Upgrade Plan") shows the three paid tiers with real pricing from the design; selecting one writes `subscription_plan` directly
- **No real payment processing is connected** — "upgrading" is a direct database write with an explicit note in the confirmation dialog that no charge was made. This is intentionally scoped as enforcement + UI only, pending a real payment provider decision.

### Home Dashboard
- Personalized greeting, vault health ring, item/trusted/category stat cards

### Settings
- Profile display with real plan badge, sign out, "Reset Onboarding" (dev utility)
- Biometric Lock and Notifications are real, persisted toggles (SecureStore and AsyncStorage respectively)
- Notifications is a stored preference only — see Known Gaps, there's no push notification infrastructure behind it

## Known Gaps / Not Yet Built

| Area | State |
|---|---|
| **Activity Log** | No audit trail exists. The Heir Workspace's "Activity" quick action shows a placeholder "Coming Soon" alert. Building this for real needs a new table and every write path (vault items, checklist, trusted persons, documents) to start logging events — deliberately deferred as its own follow-up task. |
| **Real payments** | The Paywall updates `subscription_plan` directly with no payment processor (Stripe, RevenueCat, App Store/Play Store IAP) integrated. Needed before this could charge real users. |
| **Auto-lock timer** | Only "lock on background/launch" is implemented. A separate idle-timeout auto-lock (e.g. "lock after 5 minutes of inactivity while foregrounded") does not exist; the old fake "5 min" UI row was removed rather than left misleading. |
| **Push notifications** | The Notifications toggle only stores a local preference — no Expo push tokens, APNs/FCM, or server-side triggering exists yet. |
| **Privacy Policy / Terms of Service rows** | Still render with no `onPress` handler (no content to link to yet). |
| **`SUBSCRIPTION_PLATFORMS`** constant | Still defined but unused (the subscription form uses free text instead of a picker). |

## ⚠️ Security Notes

- **Encryption**: real AES-256-CBC now, replacing the earlier SHA-256/base64 placeholder. The key lives only in the device's secure storage (Keychain/Keystore) — if the app is uninstalled or the device resets without that entry surviving, previously-encrypted vault items become unrecoverable. This is treated as an accepted tradeoff (see project decision log / conversation history), not an oversight.
- **Trusted-person write access is intentionally narrow.** Post-unlock, a trusted person can toggle `is_cancelled` on subscription items (which requires letting them rewrite that item's whole `encrypted_data` blob, since Postgres can't inspect ciphertext — but they already have full plaintext read access at that point, so this isn't a new exposure) and accept their own pending invite. Every other write (vault items in general, other trusted persons' rows, death-verification fields beyond their own confirmation) is blocked by RLS policies paired with `BEFORE UPDATE` trigger guards, not just client-side checks.

## Data Model (Supabase `schema.sql`)

- `user_profiles` — extends `auth.users`: `full_name`, `subscription_plan`
- `vault_items` — `user_id`, `category`, `title`, `encrypted_data`, `metadata`
- `trusted_persons` — `vault_owner_id`, `email`, `full_name`, `status`, `role`
- `death_verifications` — `vault_owner_id`, `requested_by`, `secondary_confirmation_by`, `status` (`awaiting_confirmation` → `confirmed` → `approved`, or `rejected`), `waiting_period_ends_at`
- `estate_tasks` — auto-generated checklist, `assigned_to`/`completed_by` reference `trusted_persons`
- `documents` — file metadata; actual files live in the `documents` Storage bucket

Plus two private Storage buckets (`death-certificates`, `documents`) created and policy-protected by the same schema script.

All tables have RLS. Owners get full CRUD on their own data. Trusted persons get scoped access:
- Read-only on `vault_items`/`documents`/`estate_tasks` once `is_vault_unlocked_for(owner_id)` is true (confirmed + waiting period elapsed, checked at query time)
- Write access to `estate_tasks` (to check off tasks) once unlocked
- Write access to `vault_items.encrypted_data` only for subscription-category items, only once unlocked
- Can accept their own pending `trusted_persons` invite (status `pending` → `accepted` only, nothing else)
- Can supply the second confirmation on a `death_verifications` request that isn't their own, while it's `awaiting_confirmation`

## Backend

- **`services/supabase.ts`** — Supabase client, session persisted in AsyncStorage
- **`services/auth.ts`** — email/password, magic-link, and Google OAuth sign-in; biometric helpers; auto-accepts pending trusted-person invites
- **`services/encryption.ts`** — AES-256-CBC, see Security Notes above
- **`services/deathVerification.ts`** — request/confirm/reject a vault unlock, certificate upload, unlock-status check
- **`services/checklist.ts`** — auto-generates and manages `estate_tasks`
- **`services/documents.ts`** — upload/list/open/delete estate documents
- **`services/subscriptions.ts`** — subscription list, cancellation toggle, savings calculation
- **`services/plan.ts`** — reads/writes the user's plan, counts against `PLAN_FEATURES` limits
- **`services/appSettings.ts`** — persists the biometric-lock and notifications toggles
- **Edge Function `send-invitation`** — validates caller owns the vault, sends a branded HTML invite email via Resend, no-ops gracefully without a configured API key
