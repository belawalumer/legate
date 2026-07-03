import { supabase } from './supabase';
import { decryptData } from './encryption';
import { EstateTask, VaultCategory } from '../types';

interface TaskTemplate {
  title: string;
  priority: 'high' | 'medium' | 'low';
}

// Only categories that imply a concrete real-world action get auto-generated tasks.
function buildTaskTemplate(category: VaultCategory, data: Record<string, any>): TaskTemplate | null {
  switch (category) {
    case 'banking':
      return { title: `Notify ${data.bank_name || 'the bank'} of account holder's death`, priority: 'high' };
    case 'insurance':
      return { title: `File claim with ${data.provider || 'insurance provider'}`, priority: 'high' };
    case 'loans_debts':
      return { title: `Notify ${data.lender || 'lender'} about outstanding balance`, priority: 'high' };
    case 'subscriptions':
      return { title: `Cancel ${data.name || 'subscription'}`, priority: 'medium' };
    case 'legal_documents':
      return { title: `Review ${data.type ? data.type.replace(/_/g, ' ') : 'legal document'} with an attorney`, priority: 'high' };
    default:
      return null;
  }
}

/**
 * Generate estate_tasks from the owner's vault_items. Safe to call more than
 * once - it skips categories/items that already have a generated task by
 * matching on category in the task's description marker.
 */
export async function generateEstateTasks(vaultOwnerId: string): Promise<void> {
  const { data: items, error } = await supabase
    .from('vault_items')
    .select('id, category, encrypted_data')
    .eq('user_id', vaultOwnerId);

  if (error) throw error;
  if (!items || items.length === 0) return;

  const { data: existingTasks } = await supabase
    .from('estate_tasks')
    .select('description')
    .eq('vault_owner_id', vaultOwnerId);

  const alreadyGenerated = new Set((existingTasks || []).map((t) => t.description).filter(Boolean));

  const newTasks: Array<{
    vault_owner_id: string;
    title: string;
    description: string;
    category: string;
    priority: 'high' | 'medium' | 'low';
    status: 'pending';
  }> = [];

  for (const item of items) {
    const marker = `vault_item:${item.id}`;
    if (alreadyGenerated.has(marker)) continue;

    let data: Record<string, any> = {};
    try {
      data = JSON.parse(await decryptData(item.encrypted_data));
    } catch {
      continue;
    }

    const template = buildTaskTemplate(item.category as VaultCategory, data);
    if (!template) continue;

    newTasks.push({
      vault_owner_id: vaultOwnerId,
      title: template.title,
      description: marker,
      category: item.category,
      priority: template.priority,
      status: 'pending',
    });
  }

  if (newTasks.length === 0) return;

  const { error: insertError } = await supabase.from('estate_tasks').insert(newTasks);
  if (insertError) throw insertError;
}

export async function listEstateTasks(vaultOwnerId: string): Promise<EstateTask[]> {
  const { data, error } = await supabase
    .from('estate_tasks')
    .select('*')
    .eq('vault_owner_id', vaultOwnerId)
    .order('priority', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function setTaskStatus(
  taskId: string,
  status: 'pending' | 'in_progress' | 'completed',
  completedByTrustedPersonId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('estate_tasks')
    .update({
      status,
      completed_by: status === 'completed' ? completedByTrustedPersonId : null,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    })
    .eq('id', taskId);

  if (error) throw error;
}
