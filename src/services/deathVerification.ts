import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { DEATH_VERIFICATION_WAITING_PERIOD_HOURS } from '../constants';

export interface DeathVerificationRequest {
  id: string;
  vault_owner_id: string;
  requested_by: string;
  death_certificate_url: string | null;
  secondary_confirmation_by: string | null;
  status: 'awaiting_confirmation' | 'confirmed' | 'approved' | 'rejected';
  waiting_period_ends_at: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

/**
 * Trusted persons for a vault owner, as visible to the current caller under RLS.
 */
export async function getVaultTrustedPersons(vaultOwnerId: string) {
  const { data, error } = await supabase
    .from('trusted_persons')
    .select('*')
    .eq('vault_owner_id', vaultOwnerId);

  if (error) throw error;
  return data;
}

/**
 * Find the trusted_persons row (if any) that represents the current user on a given vault.
 */
export async function getMyTrustedPersonRecord(vaultOwnerId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from('trusted_persons')
    .select('*')
    .eq('vault_owner_id', vaultOwnerId)
    .eq('email', user.email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Upload a death certificate file to private storage, under the vault owner's folder.
 */
export async function uploadDeathCertificate(
  vaultOwnerId: string,
  fileUri: string,
  fileName: string
): Promise<string> {
  const file = new File(fileUri);
  const bytes = await file.arrayBuffer();
  const path = `${vaultOwnerId}/${Date.now()}-${fileName}`;

  const { error } = await supabase.storage
    .from('death-certificates')
    .upload(path, bytes, {
      contentType: guessContentType(fileName),
    });

  if (error) throw error;
  return path;
}

function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

/**
 * Submit a new vault unlock request as a trusted person, with the death certificate already uploaded.
 */
export async function requestVaultUnlock(
  vaultOwnerId: string,
  myTrustedPersonId: string,
  certificatePath: string
): Promise<DeathVerificationRequest> {
  const { data, error } = await supabase
    .from('death_verifications')
    .insert({
      vault_owner_id: vaultOwnerId,
      requested_by: myTrustedPersonId,
      death_certificate_url: certificatePath,
      status: 'awaiting_confirmation',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Confirm an existing request as the second trusted person, starting the waiting period.
 */
export async function confirmVaultUnlock(
  requestId: string,
  myTrustedPersonId: string
): Promise<DeathVerificationRequest> {
  const waitingPeriodEndsAt = new Date(
    Date.now() + DEATH_VERIFICATION_WAITING_PERIOD_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('death_verifications')
    .update({
      status: 'confirmed',
      secondary_confirmation_by: myTrustedPersonId,
      waiting_period_ends_at: waitingPeriodEndsAt,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Owner rejects/cancels a request on their own vault (e.g. a false alarm).
 */
export async function rejectVaultUnlockRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from('death_verifications')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId);

  if (error) throw error;
}

/**
 * All death verification requests visible to the current user for a given vault,
 * most recent first.
 */
export async function getVaultUnlockRequests(vaultOwnerId: string): Promise<DeathVerificationRequest[]> {
  const { data, error } = await supabase
    .from('death_verifications')
    .select('*')
    .eq('vault_owner_id', vaultOwnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * True once a request has been confirmed by a second trusted person and the
 * waiting period has elapsed - mirrors the public.is_vault_unlocked_for() RLS check.
 */
export function isRequestUnlocked(request: DeathVerificationRequest): boolean {
  if (request.status !== 'confirmed' && request.status !== 'approved') return false;
  if (!request.secondary_confirmation_by || !request.waiting_period_ends_at) return false;
  return new Date(request.waiting_period_ends_at).getTime() <= Date.now();
}
