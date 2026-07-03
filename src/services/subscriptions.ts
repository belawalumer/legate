import { supabase } from './supabase';
import { decryptData, encryptData } from './encryption';

export interface SubscriptionSummary {
  id: string;
  title: string;
  name: string;
  provider: string;
  monthlyCost: number;
  isCancelled: boolean;
}

function parseMonthlyCost(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : 0;
}

export async function getSubscriptions(vaultOwnerId: string): Promise<SubscriptionSummary[]> {
  const { data, error } = await supabase
    .from('vault_items')
    .select('id, title, encrypted_data')
    .eq('user_id', vaultOwnerId)
    .eq('category', 'subscriptions')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const summaries = await Promise.all(
    data.map(async (item): Promise<SubscriptionSummary | null> => {
      try {
        const parsed = JSON.parse(await decryptData(item.encrypted_data));
        return {
          id: item.id,
          title: item.title,
          name: parsed.name || item.title,
          provider: parsed.provider || '',
          monthlyCost: parseMonthlyCost(parsed.monthly_cost),
          isCancelled: !!parsed.is_cancelled,
        };
      } catch {
        return null;
      }
    })
  );

  return summaries.filter((s): s is SubscriptionSummary => s !== null);
}

export function calculateMonthlySavings(subscriptions: SubscriptionSummary[]): number {
  return subscriptions
    .filter((s) => s.isCancelled)
    .reduce((sum, s) => sum + s.monthlyCost, 0);
}

export async function setSubscriptionCancelled(itemId: string, isCancelled: boolean): Promise<void> {
  const { data: item, error: fetchError } = await supabase
    .from('vault_items')
    .select('encrypted_data')
    .eq('id', itemId)
    .single();

  if (fetchError) throw fetchError;

  const parsed = JSON.parse(await decryptData(item.encrypted_data));
  parsed.is_cancelled = isCancelled;
  const reEncrypted = await encryptData(JSON.stringify(parsed));

  const { error } = await supabase
    .from('vault_items')
    .update({ encrypted_data: reEncrypted })
    .eq('id', itemId);

  if (error) throw error;
}
