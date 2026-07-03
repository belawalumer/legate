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
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  const hasAnyActiveRequest =
    memberships.some((m) =>
      (requestsByVault[m.vaultOwnerId] || []).some(
        (r) => r.status === 'awaiting_confirmation' || r.status === 'confirmed'
      )
    ) || ownVaultRequests.length > 0;

  const hasPendingRequest =
    memberships.some((m) =>
      (requestsByVault[m.vaultOwnerId] || []).some(
        (r) =>
          (r.status === 'awaiting_confirmation' || r.status === 'confirmed') && !isRequestUnlocked(r)
      )
    ) ||
    ownVaultRequests.some(
      (r) => r.status !== 'rejected' && !isRequestUnlocked(r)
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerGlow} pointerEvents="none" />

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        {/* Vaults I'm trusted on */}
        
        {memberships.length === 0 && (
          <Text style={styles.emptyText}>You aren't currently a trusted person on any vault.</Text>
        )}
        {memberships.map((m) => {
          const requests = requestsByVault[m.vaultOwnerId] || [];
          const activeRequest = requests.find((r) => r.status === 'awaiting_confirmation' || r.status === 'confirmed');
          if (activeRequest) {
            return (
              <View key={m.vaultOwnerId} style={styles.statusCardWrapper}>
                <RequestStatusCard
                  subtitle={`${m.vaultOwnerName}'s Vault`}
                  request={activeRequest}
                  canConfirm={
                    activeRequest.status === 'awaiting_confirmation' &&
                    activeRequest.requested_by !== m.myTrustedPersonId
                  }
                  onConfirm={() => handleConfirm(m, activeRequest)}
                  busy={busyId === activeRequest.id}
                />

                {isRequestUnlocked(activeRequest) && (
                  <TouchableOpacity
                    style={styles.statusPrimaryButton}
                    onPress={() => navigation.navigate('HeirWorkspace', { vaultOwnerId: m.vaultOwnerId })}
                  >
                    <Text style={styles.statusPrimaryButtonText}>Enter Family Workspace</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          return (
            <View key={m.vaultOwnerId} style={styles.card}>
              <Text style={styles.cardTitle}>{m.vaultOwnerName}'s Vault</Text>
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
                <View key={r.id} style={styles.statusCardWrapper}>
                  <RequestStatusCard
                    subtitle={`Requested by ${requester?.full_name || 'a trusted person'}`}
                    request={r}
                    canConfirm={false}
                    onConfirm={() => {}}
                    busy={false}
                  />
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

        {hasPendingRequest && (
          <>
            <View style={styles.spacer} />
            <View style={styles.notifyBox}>
              <Text style={styles.notifyBoxText}>
                You will receive a notification when the vault opens for the family.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function RequestStatusCard({
  subtitle,
  request,
  canConfirm,
  onConfirm,
  busy,
}: {
  subtitle: string;
  request: DeathVerificationRequest;
  canConfirm: boolean;
  onConfirm: () => void;
  busy: boolean;
}) {
  const unlocked = isRequestUnlocked(request);

  return (
    <View style={styles.statusCard}>
      <Text style={styles.statusCardTitle}>Request Status</Text>
      <Text style={styles.statusCardSubtitle}>{subtitle}</Text>

      <View style={styles.timeline}>
        <StatusStep
          done
          label="Request Submitted"
          detail={new Date(request.created_at).toLocaleString()}
          note="Death certificate uploaded"
        />
        <StatusStep
          done={!!request.secondary_confirmation_by}
          active={request.status === 'awaiting_confirmation'}
          label="Second Confirmation"
          detail={
            request.status === 'awaiting_confirmation'
              ? 'Waiting for a second trusted person'
              : 'Confirmed'
          }
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
        <StatusStep
          done={unlocked}
          label="Vault Unlocked"
          detail={unlocked ? 'Access granted' : 'Family workspace opens'}
          last
        />
      </View>

      {request.status === 'rejected' && (
        <Text style={styles.rejectedText}>This request was rejected.</Text>
      )}

      {canConfirm && (
        <TouchableOpacity style={styles.statusPrimaryButton} onPress={onConfirm} disabled={busy}>
          <Text style={styles.statusPrimaryButtonText}>
            {busy ? 'Confirming...' : 'Confirm This Request'}
          </Text>
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
  note,
  last,
}: {
  done: boolean;
  active?: boolean;
  label: string;
  detail: string;
  note?: string;
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
          <Text style={done ? styles.stepMarkerTextDone : styles.stepMarkerTextPending}>
            {done ? '✓' : active ? '⏳' : ''}
          </Text>
        </View>
        {!last && (
          <View
            style={[
              styles.stepLine,
              done ? styles.stepLineDone : active ? styles.stepLineActive : styles.stepLinePending,
            ]}
          />
        )}
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>{label}</Text>
        <Text style={styles.stepDetail}>{detail}</Text>
        {note && <Text style={styles.stepNote}>{note}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.navy,
  },
  headerGlow: {
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(45,125,90,0.08)',
  },
  header: {
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  backBtn: {
    color: colors.gold,
    fontSize: 15,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  body: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 12,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 10,
  },
  cardTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '400',
    color: colors.cream,
  },
  cardBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 19,
  },
  primaryButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  rejectButton: {
    borderRadius: borderRadius.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,122,122,0.3)',
  },
  rejectButtonText: {
    color: '#E07A7A',
    fontSize: 13,
    fontWeight: '500',
  },
  rejectedText: {
    color: '#E07A7A',
    fontSize: 12,
    fontWeight: '500',
  },
  statusCardWrapper: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  statusCard: {
    backgroundColor: colors.navy,
    borderRadius: 20,
    padding: 20,
    gap: 4,
    overflow: 'hidden',
  },
  statusCardTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: colors.cream,
  },
  statusCardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 12,
  },
  timeline: {
    gap: 0,
  },
  statusPrimaryButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  statusPrimaryButtonText: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  notifyBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  notifyBoxText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    lineHeight: 17,
  },
  step: {
    flexDirection: 'row',
    gap: 16,
  },
  stepMarkerColumn: {
    alignItems: 'center',
  },
  stepMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerDone: {
    backgroundColor: colors.success,
  },
  stepMarkerActive: {
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderWidth: 2,
    borderColor: colors.gold,
    borderStyle: 'dashed',
  },
  stepMarkerPending: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    borderStyle: 'dashed',
  },
  stepMarkerTextDone: {
    fontSize: 14,
    color: colors.white,
  },
  stepMarkerTextPending: {
    fontSize: 14,
    color: colors.gold,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginTop: 4,
  },
  stepLineDone: {
    backgroundColor: 'rgba(45,125,90,0.4)',
  },
  stepLineActive: {
    backgroundColor: 'rgba(201,168,76,0.3)',
  },
  stepLinePending: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  stepContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 24,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.3)',
  },
  stepLabelActive: {
    color: colors.cream,
  },
  stepDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  stepNote: {
    fontSize: 11,
    color: 'rgba(45,125,90,0.8)',
    marginTop: 4,
  },
});
