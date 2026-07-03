import { supabase } from './supabase';
import { PLAN_FEATURES } from '../constants';

export type SubscriptionPlan = keyof typeof PLAN_FEATURES;

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free',
  essential: 'Essential',
  family: 'Family',
  legacy: 'Legacy',
};

export async function getUserPlan(userId: string): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('subscription_plan')
    .eq('id', userId)
    .single();

  if (error || !data?.subscription_plan) return 'free';
  return (data.subscription_plan as SubscriptionPlan) in PLAN_FEATURES
    ? (data.subscription_plan as SubscriptionPlan)
    : 'free';
}

export async function setUserPlan(userId: string, plan: SubscriptionPlan): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ subscription_plan: plan })
    .eq('id', userId);

  if (error) throw error;
}

export async function getVaultItemCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('vault_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function getTrustedPersonCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('trusted_persons')
    .select('id', { count: 'exact', head: true })
    .eq('vault_owner_id', userId);

  if (error) throw error;
  return count || 0;
}

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

export function hasReachedLimit(currentCount: number, limit: number): boolean {
  if (isUnlimited(limit)) return false;
  return currentCount >= limit;
}
