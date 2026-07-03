import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { VaultCategory } from '../types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const VAULT_CATEGORIES: { value: VaultCategory; label: string; icon: IoniconName }[] = [
  { value: 'banking', label: 'Banking', icon: 'business-outline' },
  { value: 'investments', label: 'Investments', icon: 'trending-up-outline' },
  { value: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline' },
  { value: 'loans_debts', label: 'Loans & Debts', icon: 'card-outline' },
  { value: 'subscriptions', label: 'Subscriptions', icon: 'repeat-outline' },
  { value: 'real_estate', label: 'Real Estate', icon: 'home-outline' },
  { value: 'vehicles', label: 'Vehicles', icon: 'car-outline' },
  { value: 'important_contacts', label: 'Important Contacts', icon: 'call-outline' },
  { value: 'digital_assets', label: 'Digital Assets', icon: 'laptop-outline' },
  { value: 'legal_documents', label: 'Legal Documents', icon: 'document-text-outline' },
  { value: 'final_wishes', label: 'Final Wishes', icon: 'heart-outline' },
];

export const SUBSCRIPTION_PLATFORMS = [
  'Netflix',
  'Amazon Prime',
  'Disney+',
  'Spotify',
  'Apple Music',
  'Gym Membership',
  'Software Subscriptions',
  'Utilities',
  'Other',
];

// Trusted-person cap applies globally, regardless of plan.
export const MAX_TRUSTED_PERSONS = 3;

export const PLAN_PRICING: { plan: 'monthly' | 'yearly'; price: number; period: string; tagline: string; featured?: boolean }[] = [
  { plan: 'monthly', price: 3.99, period: '/month', tagline: 'Unlimited items · 3 trusted people' },
  { plan: 'yearly', price: 34.99, period: '/year', tagline: 'Unlimited items · 3 trusted people', featured: true },
];

export const DEATH_VERIFICATION_WAITING_PERIOD_HOURS = 72;
