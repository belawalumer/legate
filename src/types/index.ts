// User Types
export type UserRole = 'owner' | 'trusted_person' | 'heir';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

// Vault Types
export interface VaultItem {
  id: string;
  category: VaultCategory;
  title: string;
  encrypted_data: string; // Encrypted sensitive data
  metadata: Record<string, any>; // Non-sensitive metadata
  created_at: string;
  updated_at: string;
}

export type VaultCategory =
  | 'banking'
  | 'investments'
  | 'insurance'
  | 'loans_debts'
  | 'subscriptions'
  | 'real_estate'
  | 'vehicles'
  | 'important_contacts'
  | 'digital_assets'
  | 'legal_documents'
  | 'final_wishes';

// Banking
export interface BankingItem {
  bank_name: string;
  account_type: string;
  account_number: string; // Encrypted
  branch: string;
  approximate_balance?: number;
}

// Investments
export interface InvestmentItem {
  type: 'stocks' | 'mutual_funds' | 'crypto' | 'retirement' | 'other';
  name: string;
  account_number?: string; // Encrypted
  provider: string;
  approximate_value?: number;
}

// Insurance
export interface InsuranceItem {
  type: 'life' | 'health' | 'home' | 'auto' | 'other';
  provider: string;
  policy_number: string; // Encrypted
  agent_name?: string;
  agent_contact?: string;
}

// Loans & Debts
export interface LoanDebtItem {
  type: 'mortgage' | 'car_loan' | 'credit_card' | 'personal_loan' | 'other';
  lender: string;
  account_number?: string; // Encrypted
  monthly_payment?: number;
  balance?: number;
}

// Subscriptions
export interface SubscriptionItem {
  name: string;
  provider: string;
  monthly_cost: number;
  billing_date?: string;
  is_cancelled?: boolean;
}

// Real Estate
export interface RealEstateItem {
  property_type: string;
  address: string;
  mortgage_status: 'owned' | 'mortgaged' | 'rented';
  deed_location?: string;
}

// Vehicles
export interface VehicleItem {
  make: string;
  model: string;
  year: number;
  title_location?: string;
  loan_status?: 'owned' | 'financed';
  insurance_provider?: string;
}

// Important Contacts
export interface ContactItem {
  name: string;
  role: 'lawyer' | 'accountant' | 'financial_advisor' | 'doctor' | 'other';
  phone?: string;
  email?: string;
  address?: string;
}

// Digital Assets
export interface DigitalAssetItem {
  type: 'email' | 'social_media' | 'crypto_wallet' | 'other';
  platform: string;
  username?: string;
  wallet_address?: string; // Encrypted
  recovery_info?: string; // Encrypted
}

// Legal Documents
export interface LegalDocumentItem {
  type: 'will' | 'power_of_attorney' | 'trust' | 'other';
  location: string;
  attorney_name?: string;
  attorney_contact?: string;
}

// Final Wishes
export interface FinalWishItem {
  category: 'funeral' | 'organ_donation' | 'message';
  content: string;
}

// Trusted Person
export interface TrustedPerson {
  id: string;
  vault_owner_id: string;
  email: string;
  full_name: string;
  status: 'pending' | 'accepted' | 'declined';
  role: 'executor' | 'spouse' | 'child' | 'other';
  created_at: string;
}

// Death Verification
export interface DeathVerification {
  id: string;
  vault_owner_id: string;
  requested_by: string; // trusted_person_id
  death_certificate_url?: string;
  secondary_confirmation_by?: string;
  status: 'pending' | 'approved' | 'rejected';
  waiting_period_ends_at?: string;
  created_at: string;
}

// Estate Checklist
export interface EstateTask {
  id: string;
  vault_owner_id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to?: string;
  completed_by?: string;
  completed_at?: string;
  created_at: string;
}

// Document
export interface Document {
  id: string;
  vault_owner_id: string;
  name: string;
  file_url: string;
  category?: string;
  uploaded_by: string;
  created_at: string;
}

// Vault Health Score
export interface VaultHealth {
  total_score: number; // 0-100
  category_scores: Record<VaultCategory, number>;
  missing_categories: VaultCategory[];
  recommendations: string[];
}
