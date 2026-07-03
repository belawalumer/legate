import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, borderRadius } from '../../constants/theme';
import { getCurrentUser } from '../../services/auth';
import {
  SubscriptionSummary,
  getSubscriptions,
  calculateMonthlySavings,
  setSubscriptionCancelled,
} from '../../services/subscriptions';
import { alert } from '../../components/AppAlert';

export default function SubscriptionTrackerScreen() {
  const route = useRoute();
  const params = route.params as { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;

  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const load = async () => {
    try {
      let vaultOwnerId = params?.vaultOwnerId;
      if (!vaultOwnerId) {
        const user = await getCurrentUser();
        if (!user) return;
        vaultOwnerId = user.id;
      }
      const subs = await getSubscriptions(vaultOwnerId);
      setSubscriptions(subs);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCancelled = async (sub: SubscriptionSummary) => {
    try {
      setBusyId(sub.id);
      await setSubscriptionCancelled(sub.id, !sub.isCancelled);
      await load();
    } catch (error: any) {
      alert('Error', error.message || 'Could not update subscription');
    } finally {
      setBusyId(null);
    }
  };

  const savings = calculateMonthlySavings(subscriptions);
  const cancelledCount = subscriptions.filter((s) => s.isCancelled).length;

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
        <Text style={styles.headerTitle}>Subscriptions</Text>
        <View style={styles.savingsBanner}>
          <View>
            <Text style={styles.savingsLabel}>Monthly savings so far</Text>
            <Text style={styles.savingsAmount}>${savings.toFixed(2)}</Text>
          </View>
          <View style={styles.savingsRight}>
            <Text style={styles.savingsFraction}>{cancelledCount} of {subscriptions.length}</Text>
            <Text style={styles.savingsNote}>cancelled</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyTitle}>No subscriptions yet</Text>
            <Text style={styles.emptyText}>Subscriptions added to the vault will show up here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.subCard, item.isCancelled && styles.subCardCancelled]}>
            <Text style={styles.subIcon}>📺</Text>
            <View style={styles.subInfo}>
              <Text style={styles.subName}>{item.name}</Text>
              <Text style={styles.subMeta}>{item.provider || 'Subscription'}</Text>
            </View>
            <View style={styles.subCost}>
              <Text style={styles.subAmount}>${item.monthlyCost.toFixed(2)}</Text>
              <Text style={styles.subPeriod}>/mo</Text>
            </View>
            <TouchableOpacity
              style={item.isCancelled ? styles.cancelledBadge : styles.cancelButton}
              onPress={() => handleToggleCancelled(item)}
              disabled={busyId === item.id}
            >
              <Text style={item.isCancelled ? styles.cancelledBadgeText : styles.cancelButtonText}>
                {busyId === item.id ? '...' : item.isCancelled ? '✓ Done' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
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
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 16,
  },
  savingsBanner: {
    backgroundColor: 'rgba(45,125,90,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(45,125,90,0.4)',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
  },
  savingsAmount: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '500',
    color: '#4CAF87',
  },
  savingsRight: {
    alignItems: 'flex-end',
  },
  savingsFraction: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  savingsNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  subCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  subCardCancelled: {
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  subIcon: {
    fontSize: 20,
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 2,
  },
  subMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  subCost: {
    alignItems: 'flex-end',
  },
  subAmount: {
    fontFamily: 'serif',
    fontSize: 16,
    fontWeight: '500',
    color: colors.navy,
  },
  subPeriod: {
    fontSize: 10,
    color: colors.textMuted,
  },
  cancelButton: {
    backgroundColor: 'rgba(139,58,58,0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.error,
  },
  cancelledBadge: {
    backgroundColor: 'rgba(45,125,90,0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelledBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.success,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    color: colors.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
