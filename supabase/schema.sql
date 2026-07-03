-- Household Knowledge Vault Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Vault Items Table
CREATE TABLE IF NOT EXISTS vault_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'banking', 'investments', 'insurance', 'loans_debts', 
    'subscriptions', 'real_estate', 'vehicles', 'important_contacts',
    'digital_assets', 'legal_documents', 'final_wishes'
  )),
  title TEXT NOT NULL,
  encrypted_data TEXT NOT NULL, -- AES-256 encrypted sensitive data
  metadata JSONB DEFAULT '{}', -- Non-sensitive metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trusted Persons Table
CREATE TABLE IF NOT EXISTS trusted_persons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  role TEXT CHECK (role IN ('executor', 'spouse', 'child', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(vault_owner_id, email)
);

-- Death Verifications Table
-- Status lifecycle: awaiting_confirmation -> confirmed (waiting period running) -> approved (unlocked)
--                                          \-> rejected (owner or the requester cancelled it)
CREATE TABLE IF NOT EXISTS death_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES trusted_persons(id) ON DELETE CASCADE,
  death_certificate_url TEXT,
  secondary_confirmation_by UUID REFERENCES trusted_persons(id),
  status TEXT NOT NULL DEFAULT 'awaiting_confirmation' CHECK (status IN ('awaiting_confirmation', 'confirmed', 'approved', 'rejected')),
  waiting_period_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  CONSTRAINT secondary_confirmation_differs_from_requester CHECK (secondary_confirmation_by IS DISTINCT FROM requested_by)
);

-- Estate Tasks Table (Auto-generated checklist)
CREATE TABLE IF NOT EXISTS estate_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_to UUID REFERENCES trusted_persons(id),
  completed_by UUID REFERENCES trusted_persons(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents Table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  category TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'essential', 'family', 'legacy')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_items_category ON vault_items(category);
CREATE INDEX IF NOT EXISTS idx_trusted_persons_owner ON trusted_persons(vault_owner_id);
CREATE INDEX IF NOT EXISTS idx_trusted_persons_email ON trusted_persons(email);
CREATE INDEX IF NOT EXISTS idx_death_verifications_owner ON death_verifications(vault_owner_id);
CREATE INDEX IF NOT EXISTS idx_estate_tasks_owner ON estate_tasks(vault_owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(vault_owner_id);

-- Helper function to get current user email from JWT (avoids querying auth.users directly)
-- Created in public schema since we can't create functions in auth schema
CREATE OR REPLACE FUNCTION public.get_user_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email')::TEXT,
    (auth.jwt() -> 'user_metadata' ->> 'email')::TEXT
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- A vault is considered unlocked only once a death verification has been
-- confirmed by a second trusted person AND the waiting period has elapsed.
-- Checked at read-time (not just when writing "approved") so access is
-- correct even if a scheduled job hasn't yet flipped the status column.
CREATE OR REPLACE FUNCTION public.is_vault_unlocked_for(owner_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM death_verifications dv
    WHERE dv.vault_owner_id = owner_id
    AND dv.status IN ('confirmed', 'approved')
    AND dv.secondary_confirmation_by IS NOT NULL
    AND dv.waiting_period_ends_at IS NOT NULL
    AND dv.waiting_period_ends_at <= NOW()
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE death_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE estate_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (allows re-running this schema)
DROP POLICY IF EXISTS "Users can view their own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can insert their own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can update their own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can delete their own vault items" ON vault_items;
DROP POLICY IF EXISTS "Trusted persons can view vault after death verification" ON vault_items;
DROP POLICY IF EXISTS "Trusted persons can update subscriptions after unlock" ON vault_items;
DROP POLICY IF EXISTS "Users can view their trusted persons" ON trusted_persons;
DROP POLICY IF EXISTS "Users can manage their trusted persons" ON trusted_persons;
DROP POLICY IF EXISTS "Trusted persons can view their own records" ON trusted_persons;
DROP POLICY IF EXISTS "Trusted persons can accept their own invitation" ON trusted_persons;
DROP POLICY IF EXISTS "Trusted persons can create death verification requests" ON death_verifications;
DROP POLICY IF EXISTS "Trusted persons can view their verification requests" ON death_verifications;
DROP POLICY IF EXISTS "Users can view their estate tasks" ON estate_tasks;
DROP POLICY IF EXISTS "Trusted persons can manage estate tasks after verification" ON estate_tasks;
DROP POLICY IF EXISTS "Users can manage their documents" ON documents;
DROP POLICY IF EXISTS "Trusted persons can view documents after verification" ON documents;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Trusted persons can view their vault owner's profile" ON user_profiles;

-- Vault Items Policies
-- Owners can manage their own vault items
CREATE POLICY "Users can view their own vault items"
  ON vault_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vault items"
  ON vault_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vault items"
  ON vault_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vault items"
  ON vault_items FOR DELETE
  USING (auth.uid() = user_id);

-- Any accepted trusted person can view vault items once the vault has been unlocked
CREATE POLICY "Trusted persons can view vault after death verification"
  ON vault_items FOR SELECT
  USING (
    public.is_vault_unlocked_for(vault_items.user_id)
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = vault_items.user_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

-- Any accepted trusted person can mark a subscription cancelled once the vault
-- is unlocked. They already have full read access to the plaintext at this
-- point, so allowing them to rewrite encrypted_data (subscriptions only) is not
-- a new exposure - see trusted_person_subscription_update_guard for the
-- column-level guard on everything else.
CREATE POLICY "Trusted persons can update subscriptions after unlock"
  ON vault_items FOR UPDATE
  USING (
    category = 'subscriptions'
    AND public.is_vault_unlocked_for(vault_items.user_id)
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = vault_items.user_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  )
  WITH CHECK (auth.uid() IS DISTINCT FROM user_id);

-- Trusted Persons Policies
CREATE POLICY "Users can view their trusted persons"
  ON trusted_persons FOR SELECT
  USING (auth.uid() = vault_owner_id);

CREATE POLICY "Users can manage their trusted persons"
  ON trusted_persons FOR ALL
  USING (auth.uid() = vault_owner_id);

-- Trusted persons can view their own records
CREATE POLICY "Trusted persons can view their own records"
  ON trusted_persons FOR SELECT
  USING (email = public.get_user_email());

-- Trusted persons can accept their own pending invitation (status only; see
-- enforce_trusted_person_self_update trigger below for the column-level guard)
CREATE POLICY "Trusted persons can accept their own invitation"
  ON trusted_persons FOR UPDATE
  USING (email = public.get_user_email() AND status = 'pending')
  WITH CHECK (email = public.get_user_email());

-- Death Verifications Policies
CREATE POLICY "Trusted persons can create death verification requests"
  ON death_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.id = requested_by
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

-- The owner and any of their accepted trusted persons can see verification requests
CREATE POLICY "Owner and trusted persons can view verification requests"
  ON death_verifications FOR SELECT
  USING (
    auth.uid() = vault_owner_id
    OR EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = death_verifications.vault_owner_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

-- A different accepted trusted person can add the second confirmation while it's awaiting one
CREATE POLICY "Trusted persons can confirm a pending verification request"
  ON death_verifications FOR UPDATE
  USING (
    status = 'awaiting_confirmation'
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = death_verifications.vault_owner_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
      AND tp.id <> death_verifications.requested_by
    )
  )
  WITH CHECK (auth.uid() IS DISTINCT FROM vault_owner_id);

-- The owner can reject/cancel a verification request on their own vault
CREATE POLICY "Owner can reject a verification request"
  ON death_verifications FOR UPDATE
  USING (auth.uid() = vault_owner_id)
  WITH CHECK (auth.uid() = vault_owner_id);

-- Estate Tasks Policies
CREATE POLICY "Users can view their estate tasks"
  ON estate_tasks FOR SELECT
  USING (auth.uid() = vault_owner_id);

-- Any accepted trusted person can view and update estate tasks once the vault is unlocked
CREATE POLICY "Trusted persons can manage estate tasks after verification"
  ON estate_tasks FOR ALL
  USING (
    public.is_vault_unlocked_for(estate_tasks.vault_owner_id)
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = estate_tasks.vault_owner_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

-- Documents Policies
CREATE POLICY "Users can manage their documents"
  ON documents FOR ALL
  USING (auth.uid() = vault_owner_id);

-- Any accepted trusted person can view documents once the vault is unlocked
CREATE POLICY "Trusted persons can view documents after verification"
  ON documents FOR SELECT
  USING (
    public.is_vault_unlocked_for(documents.vault_owner_id)
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = documents.vault_owner_id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Accepted trusted persons can see the display name of a vault owner who trusted them
CREATE POLICY "Trusted persons can view their vault owner's profile"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id = user_profiles.id
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Function to automatically create user profile when a user signs up
-- This runs with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Restrict updates made by the invited trusted person (not the vault owner) to
-- flipping status from 'pending' to 'accepted' only - no other column may change.
CREATE OR REPLACE FUNCTION public.enforce_trusted_person_self_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.vault_owner_id THEN
    IF OLD.status <> 'pending' OR NEW.status <> 'accepted' THEN
      RAISE EXCEPTION 'Trusted persons may only accept a pending invitation';
    END IF;
    IF NEW.vault_owner_id <> OLD.vault_owner_id
      OR NEW.email <> OLD.email
      OR NEW.full_name <> OLD.full_name
      OR NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Trusted persons may only update their invitation status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trusted_person_self_update_guard ON trusted_persons;
CREATE TRIGGER trusted_person_self_update_guard
  BEFORE UPDATE ON trusted_persons
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trusted_person_self_update();

-- Restrict updates made by a trusted person (not the vault owner) on a death
-- verification request to supplying the second confirmation only: they may set
-- secondary_confirmation_by (to their own trusted_persons id, distinct from the
-- requester), flip status from awaiting_confirmation to confirmed, and start the
-- waiting period. No other column, and no other transition, may be changed by them.
CREATE OR REPLACE FUNCTION public.enforce_death_verification_confirmation_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.vault_owner_id THEN
    IF OLD.status <> 'awaiting_confirmation' OR NEW.status <> 'confirmed' THEN
      RAISE EXCEPTION 'Trusted persons may only move a request from awaiting_confirmation to confirmed';
    END IF;
    IF NEW.vault_owner_id <> OLD.vault_owner_id
      OR NEW.requested_by <> OLD.requested_by
      OR NEW.death_certificate_url IS DISTINCT FROM OLD.death_certificate_url THEN
      RAISE EXCEPTION 'Trusted persons may only supply the second confirmation';
    END IF;
    IF NEW.secondary_confirmation_by IS NULL
      OR NEW.secondary_confirmation_by = NEW.requested_by
      OR NOT EXISTS (
        SELECT 1 FROM trusted_persons tp
        WHERE tp.id = NEW.secondary_confirmation_by
        AND tp.vault_owner_id = NEW.vault_owner_id
        AND tp.status = 'accepted'
        AND tp.email = public.get_user_email()
      ) THEN
      RAISE EXCEPTION 'secondary_confirmation_by must be the confirming trusted person, distinct from the requester';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS death_verification_confirmation_guard ON death_verifications;
CREATE TRIGGER death_verification_confirmation_guard
  BEFORE UPDATE ON death_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_death_verification_confirmation_update();

-- Restrict updates made by a trusted person (not the owner) on a vault item to
-- rewriting encrypted_data on subscription items only. Postgres cannot inspect
-- the ciphertext to confirm only is_cancelled changed inside it, but the
-- trusted person already has full plaintext read access post-unlock (that's
-- what granted them this UPDATE in the first place), so this is not a new
-- exposure - it's just letting them use the app's own edit flow instead of
-- lower-level table access.
CREATE OR REPLACE FUNCTION public.enforce_trusted_person_vault_item_update()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
    IF OLD.category <> 'subscriptions' OR NEW.category <> 'subscriptions' THEN
      RAISE EXCEPTION 'Trusted persons may only update subscription items';
    END IF;
    IF NEW.user_id <> OLD.user_id
      OR NEW.category <> OLD.category
      OR NEW.title <> OLD.title
      OR NEW.metadata IS DISTINCT FROM OLD.metadata THEN
      RAISE EXCEPTION 'Trusted persons may only update the encrypted_data field';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trusted_person_vault_item_update_guard ON vault_items;
CREATE TRIGGER trusted_person_vault_item_update_guard
  BEFORE UPDATE ON vault_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trusted_person_vault_item_update();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_vault_items_updated_at
  BEFORE UPDATE ON vault_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Death Certificate Storage
-- Private bucket: death certificates are only readable by the vault owner and
-- their accepted trusted persons, uploaded by a trusted person under a path
-- prefixed with the vault owner's user id, e.g. "<vault_owner_id>/<file>".
INSERT INTO storage.buckets (id, name, public)
VALUES ('death-certificates', 'death-certificates', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Trusted persons can upload death certificates" ON storage.objects;
DROP POLICY IF EXISTS "Owner and trusted persons can view death certificates" ON storage.objects;

CREATE POLICY "Trusted persons can upload death certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'death-certificates'
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id::TEXT = (storage.foldername(name))[1]
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );

CREATE POLICY "Owner and trusted persons can view death certificates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'death-certificates'
    AND (
      auth.uid()::TEXT = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM trusted_persons tp
        WHERE tp.vault_owner_id::TEXT = (storage.foldername(name))[1]
        AND tp.status = 'accepted'
        AND tp.email = public.get_user_email()
      )
    )
  );

-- Estate Documents Storage
-- Private bucket: documents are managed by the vault owner and become readable
-- by their accepted trusted persons once the vault is unlocked. Files are stored
-- under a path prefixed with the vault owner's user id, e.g. "<vault_owner_id>/<file>".
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Owner can manage their documents" ON storage.objects;
DROP POLICY IF EXISTS "Trusted persons can view documents after unlock" ON storage.objects;

CREATE POLICY "Owner can manage their documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'documents' AND auth.uid()::TEXT = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "Trusted persons can view documents after unlock"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND public.is_vault_unlocked_for(((storage.foldername(name))[1])::UUID)
    AND EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.vault_owner_id::TEXT = (storage.foldername(name))[1]
      AND tp.status = 'accepted'
      AND tp.email = public.get_user_email()
    )
  );
