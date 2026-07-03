import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, borderRadius } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { supabase } from '../../services/supabase';
import { getVaultTrustedPersons, getVaultUnlockRequests, isRequestUnlocked } from '../../services/deathVerification';
import { listEstateTasks } from '../../services/checklist';
import { getSubscriptions, calculateMonthlySavings } from '../../services/subscriptions';
import { EstateTask, TrustedPerson } from '../../types';
import { alert } from '../../components/AppAlert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function getInitials(name: string): string {
  return (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 1);
}

export default function HeirWorkspaceScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { vaultOwnerId } = route.params as { vaultOwnerId: string };

  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [ownerName, setOwnerName] = useState('Vault Owner');
  const [members, setMembers] = useState<TrustedPerson[]>([]);
  const [tasks, setTasks] = useState<EstateTask[]>([]);
  const [monthlySavings, setMonthlySavings] = useState(0);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [vaultOwnerId])
  );

  const load = async () => {
    try {
      const requests = await getVaultUnlockRequests(vaultOwnerId);
      const isUnlocked = requests.some(isRequestUnlocked);
      setUnlocked(isUnlocked);
      if (!isUnlocked) return;

      const [profileRes, trustedPersons, taskList, subscriptions] = await Promise.all([
        supabase.from('user_profiles').select('full_name').eq('id', vaultOwnerId).single(),
        getVaultTrustedPersons(vaultOwnerId),
        listEstateTasks(vaultOwnerId),
        getSubscriptions(vaultOwnerId),
      ]);

      if (profileRes.data?.full_name) setOwnerName(profileRes.data.full_name);
      setMembers((trustedPersons || []).filter((tp: TrustedPerson) => tp.status === 'accepted'));
      setTasks(taskList);
      setMonthlySavings(calculateMonthlySavings(subscriptions));
    } catch (error) {
      console.error('Error loading workspace:', error);
    } finally {
      setLoading(false);
    }
  };

  const vaultOwnerName = ownerName;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const urgentTasks = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed');

  const comingSoon = (feature: string) =>
    alert('Coming Soon', `${feature} will be available in a future update.`);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notUnlockedText}>This vault hasn't been unlocked yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Family Workspace</Text>
        <Text style={styles.title}>{vaultOwnerName}'s{'\n'}Estate</Text>
        <View style={styles.memberChip}>
          <View style={styles.memberAvatars}>
            {members.slice(0, 4).map((m, i) => (
              <View key={m.id} style={[styles.miniAvatar, i > 0 && styles.miniAvatarOverlap]}>
                <Text style={styles.miniAvatarText}>{getInitials(m.full_name)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.memberChipText}>
            {members.length} family member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statNum}>{completedCount}/{tasks.length}</Text>
            <Text style={styles.statLabel}>Tasks Complete</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statNum}>${monthlySavings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Monthly Saved</Text>
          </View>
        </View>

        <View style={styles.quickActions}>
          <QuickAction
            icon="🔐"
            label="View Vault"
            onPress={() => navigation.navigate('WorkspaceVault', { vaultOwnerId, vaultOwnerName })}
          />
          <QuickAction
            icon="✅"
            label="Checklist"
            onPress={() => navigation.navigate('Checklist', { vaultOwnerId, vaultOwnerName })}
          />
          <QuickAction
            icon="📞"
            label="Contacts"
            onPress={() => navigation.navigate('TrustedPersons', { vaultOwnerId, vaultOwnerName })}
          />
          <QuickAction
            icon="📺"
            label="Subscriptions"
            onPress={() => navigation.navigate('Subscriptions', { vaultOwnerId, vaultOwnerName })}
          />
          <QuickAction
            icon="📁"
            label="Documents"
            onPress={() => navigation.navigate('WorkspaceDocuments', { vaultOwnerId, vaultOwnerName })}
          />
          <QuickAction icon="📊" label="Activity" onPress={() => comingSoon('The activity log')} />
        </View>

        {urgentTasks.length > 0 && (
          <View style={styles.urgentCard}>
            <Text style={styles.sectionTitle}>Urgent Tasks</Text>
            {urgentTasks.map((t) => (
              <View key={t.id} style={styles.urgentRow}>
                <View style={styles.priorityDot} />
                <Text style={styles.urgentTaskTitle} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.urgentTaskCategory}>{t.category}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.qaBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.qaIcon}>{icon}</Text>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
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
    padding: 24,
  },
  notUnlockedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
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
    marginBottom: 16,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
    alignSelf: 'flex-start',
  },
  memberAvatars: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.navyLight,
    borderWidth: 2,
    borderColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarOverlap: {
    marginLeft: -6,
  },
  miniAvatarText: {
    fontFamily: 'serif',
    fontSize: 12,
    color: colors.gold,
  },
  memberChipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  body: {
    padding: 20,
    gap: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    fontSize: 20,
    marginBottom: 8,
  },
  statNum: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qaBtn: {
    width: '31%',
    backgroundColor: colors.navy,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
  },
  qaIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  qaLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  urgentCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  urgentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.error,
  },
  urgentTaskTitle: {
    flex: 1,
    fontSize: 13,
    color: colors.navy,
  },
  urgentTaskCategory: {
    fontSize: 10,
    color: colors.textMuted,
  },
});
