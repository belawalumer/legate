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

export const PLAN_FEATURES = {
  free: {
    maxItems: 10,
    maxTrustedPersons: 1,
    documentUpload: false,
  },
  essential: {
    maxItems: -1, // unlimited
    maxTrustedPersons: 3,
    documentUpload: true,
  },
  family: {
    maxItems: -1,
    maxTrustedPersons: 5,
    documentUpload: true,
    checklist: true,
    priorityUnlock: true,
  },
  legacy: {
    maxItems: -1,
    maxTrustedPersons: -1, // unlimited
    documentUpload: true,
    checklist: true,
    priorityUnlock: true,
    estateWorkspace: true,
    aiTagging: true,
    dedicatedSupport: true,
  },
};

export const PLAN_PRICING: { plan: 'essential' | 'family' | 'legacy'; priceUsdPerYear: number; tagline: string; featured?: boolean }[] = [
  { plan: 'essential', priceUsdPerYear: 29, tagline: 'Unlimited items · 3 trusted people' },
  { plan: 'family', priceUsdPerYear: 79, tagline: '5 trusted people · priority unlock', featured: true },
  { plan: 'legacy', priceUsdPerYear: 149, tagline: 'Everything · AI tagging · support' },
];

export const DEATH_VERIFICATION_WAITING_PERIOD_HOURS = 72;
