import { VaultCategory } from '../types';

export const VAULT_CATEGORIES: { value: VaultCategory; label: string; icon: string }[] = [
  { value: 'banking', label: 'Banking', icon: '🏦' },
  { value: 'investments', label: 'Investments', icon: '📈' },
  { value: 'insurance', label: 'Insurance', icon: '🛡️' },
  { value: 'loans_debts', label: 'Loans & Debts', icon: '💳' },
  { value: 'subscriptions', label: 'Subscriptions', icon: '📱' },
  { value: 'real_estate', label: 'Real Estate', icon: '🏠' },
  { value: 'vehicles', label: 'Vehicles', icon: '🚗' },
  { value: 'important_contacts', label: 'Important Contacts', icon: '📞' },
  { value: 'digital_assets', label: 'Digital Assets', icon: '💻' },
  { value: 'legal_documents', label: 'Legal Documents', icon: '📄' },
  { value: 'final_wishes', label: 'Final Wishes', icon: '💝' },
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
