import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { VAULT_CATEGORIES } from '../../constants';
import { VaultCategory } from '../../types';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { colors, borderRadius } from '../../constants/theme';
import { alert } from '../../components/AppAlert';

export default function VaultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  const isViewingOtherVault = !!params?.vaultOwnerId;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reload when screen comes into focus
      loadVaultItems();
      calculateHealthScore();
    });

    loadVaultItems();
    calculateHealthScore();

    return unsubscribe;
  }, [navigation]);

  const resolveVaultOwnerId = async () => {
    if (params?.vaultOwnerId) return params.vaultOwnerId;
    const user = await getCurrentUser();
    return user?.id || null;
  };

  const loadVaultItems = async () => {
    try {
      const vaultOwnerId = await resolveVaultOwnerId();
      if (!vaultOwnerId) return;

      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', vaultOwnerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = async () => {
    try {
      const vaultOwnerId = await resolveVaultOwnerId();
      if (!vaultOwnerId) return;

      const { data } = await supabase
        .from('vault_items')
        .select('category')
        .eq('user_id', vaultOwnerId);

      const categories = new Set(data?.map(item => item.category) || []);
      const score = Math.round((categories.size / VAULT_CATEGORIES.length) * 100);
      setHealthScore(score);
    } catch (error) {
      console.error('Error calculating health score:', error);
    }
  };

  const getCategoryCount = (category: VaultCategory) => {
    return items.filter(item => item.category === category).length;
  };

  const renderCategory = ({ item }: { item: typeof VAULT_CATEGORIES[0] }) => {
    const count = getCategoryCount(item.value);
    const hasItems = count > 0;
    const handlePress = () => {
      if (isViewingOtherVault) {
        // Read-only: only browse existing items, never add new ones to someone else's vault
        if (count > 0) {
          (navigation as any).navigate('CategoryItems', {
            category: item.value,
            vaultOwnerId: params!.vaultOwnerId,
            vaultOwnerName: params!.vaultOwnerName,
          });
        }
        return;
      }
      if (count > 0) {
        // If category has items, show the items list
        (navigation as any).navigate('CategoryItems', { category: item.value });
      } else {
        // If no items, go to add item screen
        (navigation as any).navigate('AddVaultItem', { category: item.value });
      }
    };

    return (
      <TouchableOpacity
        style={[styles.categoryCard, hasItems && styles.categoryCardFilled]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        {hasItems && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        )}
        <Text style={styles.categoryIcon}>{item.icon}</Text>
        <Text style={styles.categoryLabel}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isViewingOtherVault ? `${params!.vaultOwnerName || 'Owner'}'s Vault` : 'Your Vault'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isViewingOtherVault ? 'Read-only access' : 'Tap any category to add or view items'}
        </Text>
      </View>
      <FlatList
        data={VAULT_CATEGORIES}
        renderItem={renderCategory}
        keyExtractor={(item) => item.value}
        numColumns={3}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 28,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  list: {
    padding: 20,
    paddingBottom: 24,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: 14,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  categoryCardFilled: {
    borderColor: 'rgba(201,168,76,0.3)',
    backgroundColor: colors.white,
    // Note: Gradient backgrounds need react-native-linear-gradient or similar
    // For now using solid color with border
  },
  countBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.gold,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.navy,
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textPrimary,
    letterSpacing: 0.3,
    lineHeight: 13,
    textAlign: 'center',
  },
});
