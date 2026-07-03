import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors, borderRadius } from '../../constants/theme';
import { DEATH_VERIFICATION_WAITING_PERIOD_HOURS } from '../../constants';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import {
  DeathVerificationRequest,
  getVaultTrustedPersons,
  getVaultUnlockRequests,
  confirmVaultUnlock,
  rejectVaultUnlockRequest,
  requestVaultUnlock,
  uploadDeathCertificate,
  isRequestUnlocked,
} from '../../services/deathVerification';
import { generateEstateTasks } from '../../services/checklist';
import { alert } from '../../components/AppAlert';

interface VaultMembership {
  vaultOwnerId: string;
  vaultOwnerName: string;
  myTrustedPersonId: string;
}

export default function DeathVerificationScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState<VaultMembership[]>([]);
  const [requestsByVault, setRequestsByVault] = useState<Record<string, DeathVerificationRequest[]>>({});
  const [ownVaultRequests, setOwnVaultRequests] = useState<DeathVerificationRequest[]>([]);
  const [ownVaultTrustedPersons, setOwnVaultTrustedPersons] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const loadAll = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Vaults I'm trusted on
      const { data: myInvites } = await supabase
        .from('trusted_persons')
        .select('id, vault_owner_id, status')
        .eq('email', user.email)
        .eq('status', 'accepted');

      const ownerIds = (myInvites || []).map((i) => i.vault_owner_id);
      let ownerNames: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', ownerIds);
        ownerNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name || 'Vault Owner']));
      }

      const memberships: VaultMembership[] = (myInvites || []).map((i) => ({
        vaultOwnerId: i.vault_owner_id,
        vaultOwnerName: ownerNames[i.vault_owner_id] || 'Vault Owner',
        myTrustedPersonId: i.id,
      }));
      setMemberships(memberships);

      const requestsEntries = await Promise.all(
        memberships.map(async (m) => [m.vaultOwnerId, await getVaultUnlockRequests(m.vaultOwnerId)] as const)
      );
      setRequestsByVault(Object.fromEntries(requestsEntries));

      // Once a vault is unlocked, generate the estate checklist from its contents.
      // generateEstateTasks() is idempotent, so it's safe to call on every load.
      for (const [vaultOwnerId, requests] of requestsEntries) {
        if (requests.some(isRequestUnlocked)) {
          generateEstateTasks(vaultOwnerId).catch((e) =>
            console.error('Error generating estate tasks:', e)
          );
        }
      }

      // My own vault (as owner)
      const [ownRequests, ownTrusted] = await Promise.all([
        getVaultUnlockRequests(user.id),
        getVaultTrustedPersons(user.id),
      ]);
      setOwnVaultRequests(ownRequests);
      setOwnVaultTrustedPersons(ownTrusted);
    } catch (error) {
      console.error('Error loading death verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUnlock = async (membership: VaultMembership) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/png', 'image/jpeg'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setBusyId(membership.vaultOwnerId);
      const path = await uploadDeathCertificate(membership.vaultOwnerId, file.uri, file.name);
      await requestVaultUnlock(membership.vaultOwnerId, membership.myTrustedPersonId, path);
      alert('Request Submitted', 'A second trusted person must confirm before the waiting period begins.');
      await loadAll();
    } catch (error: any) {
      alert('Error', error.message || 'Failed to submit request');
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async (membership: VaultMembership, request: DeathVerificationRequest) => {
    try {
      setBusyId(request.id);
      await confirmVaultUnlock(request.id, membership.myTrustedPersonId);
      alert(
        'Confirmed',
        `A ${DEATH_VERIFICATION_WAITING_PERIOD_HOURS}-hour waiting period has started. The vault will unlock once it ends.`
      );
      await loadAll();
    } catch (error: any) {
      alert('Error', error.message || 'Failed to confirm request');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (request: DeathVerificationRequest) => {
    alert('Reject Request', 'Are you sure this request should be rejected?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(request.id);
            await rejectVaultUnlockRequest(request.id);
            await loadAll();
          } catch (error: any) {
            alert('Error', error.message || 'Failed to reject request');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Vaults I'm trusted on */}
      <Text style={styles.sectionTitle}>Your Responsibilities</Text>
      {memberships.length === 0 && (
        <Text style={styles.emptyText}>You aren't currently a trusted person on any vault.</Text>
      )}
      {memberships.map((m) => {
        const requests = requestsByVault[m.vaultOwnerId] || [];
        const activeRequest = requests.find((r) => r.status === 'awaiting_confirmation' || r.status === 'confirmed');
        return (
          <View key={m.vaultOwnerId} style={styles.card}>
            <Text style={styles.cardTitle}>{m.vaultOwnerName}'s Vault</Text>

            {!activeRequest && (
              <>
                <Text style={styles.cardBody}>
                  If this person has passed away, you can request access. A second trusted person must confirm, then a {DEATH_VERIFICATION_WAITING_PERIOD_HOURS}-hour waiting period applies before the vault unlocks.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => handleRequestUnlock(m)}
                  disabled={busyId === m.vaultOwnerId}
                >
                  <Text style={styles.primaryButtonText}>
                    {busyId === m.vaultOwnerId ? 'Uploading...' : 'Request Vault Unlock'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {activeRequest && (
              <RequestStatusCard
                request={activeRequest}
                canConfirm={
                  activeRequest.status === 'awaiting_confirmation' &&
                  activeRequest.requested_by !== m.myTrustedPersonId
                }
                onConfirm={() => handleConfirm(m, activeRequest)}
                busy={busyId === activeRequest.id}
              />
            )}

            {activeRequest && isRequestUnlocked(activeRequest) && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate('HeirWorkspace', { vaultOwnerId: m.vaultOwnerId })}
              >
                <Text style={styles.primaryButtonText}>Enter Family Workspace</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* My own vault, as owner */}
      {ownVaultRequests.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Requests On Your Vault</Text>
          {ownVaultRequests.map((r) => {
            const requester = ownVaultTrustedPersons.find((tp) => tp.id === r.requested_by);
            return (
              <View key={r.id} style={styles.card}>
                <Text style={styles.cardTitle}>Requested by {requester?.full_name || 'a trusted person'}</Text>
                <RequestStatusCard request={r} canConfirm={false} onConfirm={() => {}} busy={false} />
                {r.status !== 'rejected' && !isRequestUnlocked(r) && (
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(r)}
                    disabled={busyId === r.id}
                  >
                    <Text style={styles.rejectButtonText}>This is a mistake - reject</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

function RequestStatusCard({
  request,
  canConfirm,
  onConfirm,
  busy,
}: {
  request: DeathVerificationRequest;
  canConfirm: boolean;
  onConfirm: () => void;
  busy: boolean;
}) {
  const unlocked = isRequestUnlocked(request);

  return (
    <View style={styles.statusBox}>
      <StatusStep done label="Request Submitted" detail={new Date(request.created_at).toLocaleString()} />
      <StatusStep
        done={!!request.secondary_confirmation_by}
        active={request.status === 'awaiting_confirmation'}
        label="Second Confirmation"
        detail={request.status === 'awaiting_confirmation' ? 'Waiting for a second trusted person' : 'Confirmed'}
      />
      <StatusStep
        done={unlocked}
        active={request.status === 'confirmed' && !unlocked}
        label="Waiting Period"
        detail={
          request.status === 'confirmed' && request.waiting_period_ends_at
            ? unlocked
              ? 'Elapsed'
              : `Ends ${new Date(request.waiting_period_ends_at).toLocaleString()}`
            : 'Not started'
        }
      />
      <StatusStep done={unlocked} label="Vault Unlocked" detail={unlocked ? 'Access granted' : 'Pending'} last />

      {request.status === 'rejected' && (
        <Text style={styles.rejectedText}>This request was rejected.</Text>
      )}

      {canConfirm && (
        <TouchableOpacity style={styles.primaryButton} onPress={onConfirm} disabled={busy}>
          <Text style={styles.primaryButtonText}>{busy ? 'Confirming...' : 'Confirm This Request'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function StatusStep({
  done,
  active,
  label,
  detail,
  last,
}: {
  done: boolean;
  active?: boolean;
  label: string;
  detail: string;
  last?: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepMarkerColumn}>
        <View
          style={[
            styles.stepMarker,
            done ? styles.stepMarkerDone : active ? styles.stepMarkerActive : styles.stepMarkerPending,
          ]}
        >
          <Text style={styles.stepMarkerText}>{done ? '✓' : active ? '⏳' : ''}</Text>
        </View>
        {!last && <View style={styles.stepLine} />}
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{label}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cream,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: colors.navy,
  },
  cardBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: colors.navy,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  rejectButton: {
    borderRadius: borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139,58,58,0.3)',
  },
  rejectButtonText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  rejectedText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '500',
  },
  statusBox: {
    gap: 0,
  },
  step: {
    flexDirection: 'row',
    gap: 12,
  },
  stepMarkerColumn: {
    alignItems: 'center',
  },
  stepMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerDone: {
    backgroundColor: colors.success,
  },
  stepMarkerActive: {
    backgroundColor: colors.goldPale,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  stepMarkerPending: {
    borderWidth: 2,
    borderColor: colors.border,
  },
  stepMarkerText: {
    fontSize: 12,
    color: colors.white,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 20,
    backgroundColor: colors.border,
  },
  stepContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  stepLabelDone: {
    color: colors.navy,
  },
  stepDetail: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
