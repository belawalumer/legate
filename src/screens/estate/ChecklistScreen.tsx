import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { colors, borderRadius } from '../../constants/theme';
import { getCurrentUser } from '../../services/auth';
import { getMyTrustedPersonRecord } from '../../services/deathVerification';
import { listEstateTasks, setTaskStatus } from '../../services/checklist';
import { EstateTask } from '../../types';
import { alert } from '../../components/AppAlert';

type Filter = 'all' | 'pending' | 'done' | 'mine';

export default function ChecklistScreen() {
  const route = useRoute();
  const params = route.params as { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;

  const [tasks, setTasks] = useState<EstateTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [myTrustedPersonId, setMyTrustedPersonId] = useState<string | null>(null);
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

      const [taskList, myRecord] = await Promise.all([
        listEstateTasks(vaultOwnerId),
        getMyTrustedPersonRecord(vaultOwnerId),
      ]);
      setTasks(taskList);
      setMyTrustedPersonId(myRecord?.id || null);
    } catch (error) {
      console.error('Error loading checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: EstateTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      setBusyId(task.id);
      await setTaskStatus(task.id, nextStatus, myTrustedPersonId);
      await load();
    } catch (error: any) {
      alert('Error', error.message || 'Could not update task');
    } finally {
      setBusyId(null);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? completedCount / tasks.length : 0;

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status !== 'completed';
    if (filter === 'done') return t.status === 'completed';
    if (filter === 'mine') return t.assigned_to === myTrustedPersonId || t.completed_by === myTrustedPersonId;
    return true;
  });

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
        <Text style={styles.headerTitle}>Estate Checklist</Text>
        {tasks.length > 0 ? (
          <>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {completedCount} of {tasks.length} tasks completed · {Math.round(progress * 100)}%
            </Text>
          </>
        ) : (
          <Text style={styles.headerSubtitle}>Auto-generated tasks based on your vault contents</Text>
        )}
      </View>

      <View style={styles.filterTabs}>
        {(['all', 'pending', 'done', 'mine'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : f === 'done' ? 'Done' : 'Mine'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>
              {tasks.length === 0 ? 'No tasks yet' : 'Nothing here'}
            </Text>
            <Text style={styles.emptyText}>
              {tasks.length === 0
                ? 'Tasks are generated automatically once a vault unlocks.'
                : 'No tasks match this filter.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isDone = item.status === 'completed';
          return (
            <TouchableOpacity
              style={[styles.taskCard, isDone && styles.taskCardCompleted]}
              onPress={() => toggleTask(item)}
              disabled={busyId === item.id}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                {isDone && <Text style={styles.checkboxMark}>✓</Text>}
              </View>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{item.title}</Text>
                <View style={styles.taskMeta}>
                  <View style={[styles.priorityDot, priorityStyle(item.priority)]} />
                  <Text style={styles.taskCategory}>{item.category}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function priorityStyle(priority: string) {
  if (priority === 'high') return { backgroundColor: colors.error };
  if (priority === 'medium') return { backgroundColor: colors.warning };
  return { backgroundColor: colors.success };
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
    paddingBottom: 20,
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
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
  progressBarContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    height: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: colors.gold,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    gap: 8,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  taskCardCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 4,
    lineHeight: 18,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  taskCategory: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
