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
CREATE TABLE IF NOT EXISTS death_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vault_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES trusted_persons(id) ON DELETE CASCADE,
  death_certificate_url TEXT,
  secondary_confirmation_by UUID REFERENCES trusted_persons(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  waiting_period_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id)
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
DROP POLICY IF EXISTS "Users can view their trusted persons" ON trusted_persons;
DROP POLICY IF EXISTS "Users can manage their trusted persons" ON trusted_persons;
DROP POLICY IF EXISTS "Trusted persons can view their own records" ON trusted_persons;
DROP POLICY IF EXISTS "Trusted persons can create death verification requests" ON death_verifications;
DROP POLICY IF EXISTS "Trusted persons can view their verification requests" ON death_verifications;
DROP POLICY IF EXISTS "Users can view their estate tasks" ON estate_tasks;
DROP POLICY IF EXISTS "Trusted persons can manage estate tasks after verification" ON estate_tasks;
DROP POLICY IF EXISTS "Users can manage their documents" ON documents;
DROP POLICY IF EXISTS "Trusted persons can view documents after verification" ON documents;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

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

-- Trusted persons can view vault items after death verification is approved
CREATE POLICY "Trusted persons can view vault after death verification"
  ON vault_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM death_verifications dv
      JOIN trusted_persons tp ON tp.id = dv.requested_by
      WHERE dv.vault_owner_id = vault_items.user_id
      AND dv.status = 'approved'
      AND tp.email = public.get_user_email()
    )
  );

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

-- Death Verifications Policies
CREATE POLICY "Trusted persons can create death verification requests"
  ON death_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trusted_persons tp
      WHERE tp.id = requested_by
      AND tp.email = public.get_user_email()
    )
  );

CREATE POLICY "Trusted persons can view their verification requests"
  ON death_verifications FOR SELECT
  USING (
    requested_by IN (
      SELECT id FROM trusted_persons
      WHERE email = public.get_user_email()
    )
  );

-- Estate Tasks Policies
CREATE POLICY "Users can view their estate tasks"
  ON estate_tasks FOR SELECT
  USING (auth.uid() = vault_owner_id);

-- Trusted persons can view and update estate tasks after death verification
CREATE POLICY "Trusted persons can manage estate tasks after verification"
  ON estate_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM death_verifications dv
      JOIN trusted_persons tp ON tp.id = dv.requested_by
      WHERE dv.vault_owner_id = estate_tasks.vault_owner_id
      AND dv.status = 'approved'
      AND tp.email = public.get_user_email()
    )
  );

-- Documents Policies
CREATE POLICY "Users can manage their documents"
  ON documents FOR ALL
  USING (auth.uid() = vault_owner_id);

-- Trusted persons can view documents after death verification
CREATE POLICY "Trusted persons can view documents after verification"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM death_verifications dv
      JOIN trusted_persons tp ON tp.id = dv.requested_by
      WHERE dv.vault_owner_id = documents.vault_owner_id
      AND dv.status = 'approved'
      AND tp.email = public.get_user_email()
    )
  );

-- User Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

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
