import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { supabase } from '../../services/supabase';
import { getVaultTrustedPersons, getVaultUnlockRequests } from '../../services/deathVerification';
import { listEstateTasks } from '../../services/checklist';
import { listDocuments } from '../../services/documents';
import { TrustedPerson } from '../../types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ActivityEvent {
  id: string;
  icon: IconName;
  iconColor: string;
  title: string;
  detail?: string;
  timestamp: string;
}

export default function WorkspaceActivityScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { vaultOwnerId, vaultOwnerName } = route.params as {
    vaultOwnerId: string;
    vaultOwnerName?: string;
  };

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [vaultOwnerId])
  );

  const load = async () => {
    try {
      const [requests, tasks, documents, trustedPersons, ownerProfile] = await Promise.all([
        getVaultUnlockRequests(vaultOwnerId),
        listEstateTasks(vaultOwnerId),
        listDocuments(vaultOwnerId),
        getVaultTrustedPersons(vaultOwnerId),
        supabase.from('user_profiles').select('full_name').eq('id', vaultOwnerId).single(),
      ]);

      const trustedById = new Map((trustedPersons || []).map((tp: TrustedPerson) => [tp.id, tp.full_name]));
      const ownerName = ownerProfile.data?.full_name || 'the vault owner';
      const nameFor = (trustedPersonId: string | null) =>
        (trustedPersonId && trustedById.get(trustedPersonId)) || 'a trusted person';

      const built: ActivityEvent[] = [];

      for (const r of requests) {
        built.push({
          id: `dv-request-${r.id}`,
          icon: 'document-text-outline',
          iconColor: colors.navy,
          title: `${nameFor(r.requested_by)} requested vault access`,
          detail: 'Death certificate submitted',
          timestamp: r.created_at,
        });

        if (r.secondary_confirmation_by) {
          built.push({
            id: `dv-confirm-${r.id}`,
            icon: 'checkmark-circle-outline',
            iconColor: colors.success,
            title: `${nameFor(r.secondary_confirmation_by)} confirmed the request`,
            detail: 'Waiting period started',
            timestamp: r.reviewed_at || r.created_at,
          });
        }

        if (r.status === 'rejected' && r.reviewed_at) {
          built.push({
            id: `dv-reject-${r.id}`,
            icon: 'close-circle-outline',
            iconColor: colors.error,
            title: 'Request rejected',
            detail: `${ownerName} marked this request as a mistake`,
            timestamp: r.reviewed_at,
          });
        }
      }

      for (const t of tasks) {
        if (t.status === 'completed' && t.completed_at) {
          built.push({
            id: `task-${t.id}`,
            icon: 'checkmark-done-outline',
            iconColor: colors.success,
            title: t.title,
            detail: `Completed by ${nameFor(t.completed_by || null)}`,
            timestamp: t.completed_at,
          });
        }
      }

      for (const d of documents) {
        built.push({
          id: `doc-${d.id}`,
          icon: 'folder-open-outline',
          iconColor: colors.gold,
          title: `${d.name} added`,
          detail: 'Document uploaded to the vault',
          timestamp: d.created_at,
        });
      }

      built.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(built);
    } catch (error) {
      console.error('Error loading activity log:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>Activity Log</Text>
        <Text style={styles.title}>{vaultOwnerName || 'Estate'}{'\n'}Timeline</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>
              Vault unlock progress, completed tasks, and document uploads will show up here.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={[styles.eventIcon, { backgroundColor: `${event.iconColor}1A` }]}>
                <Ionicons name={event.icon} size={18} color={event.iconColor} />
              </View>
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {event.detail && <Text style={styles.eventDetail}>{event.detail}</Text>}
                <Text style={styles.eventTimestamp}>{new Date(event.timestamp).toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  header: {
    backgroundColor: colors.navy,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    color: colors.gold,
    fontSize: 15,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    color: 'rgba(201,168,76,0.7)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    color: colors.cream,
    lineHeight: 32,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 10,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 2,
  },
  eventDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  eventTimestamp: {
    fontSize: 11,
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    color: colors.navy,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 30,
  },
});
