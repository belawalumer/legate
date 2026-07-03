import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { colors, borderRadius, spacing } from '../../constants/theme';
import { VAULT_CATEGORIES } from '../../constants';
import { Svg, Circle } from 'react-native-svg';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('User');
  const [healthScore, setHealthScore] = useState(62);
  const [stats, setStats] = useState({ items: 0, trusted: 0, categories: 0 });
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile && profile.full_name) {
        setUserName(profile.full_name);
      } else if (user.user_metadata?.full_name) {
        // Fallback to user metadata
        setUserName(user.user_metadata.full_name);
      } else if (user.email) {
        // Fallback to email username
        const emailName = user.email.split('@')[0];
        setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
      } else {
        setUserName('User');
      }

      // Get vault items
      const { data: vaultItems } = await supabase
        .from('vault_items')
        .select('category')
        .eq('user_id', user.id);

      setItems(vaultItems || []);

      // Calculate stats
      const categories = new Set(vaultItems?.map(item => item.category) || []);
      const score = Math.round((categories.size / VAULT_CATEGORIES.length) * 100);
      setHealthScore(score);

      // Get trusted persons count
      const { data: trusted } = await supabase
        .from('trusted_persons')
        .select('id')
        .eq('vault_owner_id', user.id);

      setStats({
        items: vaultItems?.length || 0,
        trusted: trusted?.length || 0,
        categories: categories.size,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getHealthStatus = () => {
    if (healthScore >= 80) return 'Excellent';
    if (healthScore >= 60) return 'Good';
    if (healthScore >= 40) return 'Fair';
    return 'Needs Attention';
  };

  const getHealthHint = () => {
    if (healthScore >= 80) return 'Your vault is well organized';
    if (healthScore >= 60) return 'Add insurance & legal documents to reach Excellent';
    return 'Add more categories to improve your score';
  };

  const circumference = 2 * Math.PI * 30; // radius = 30
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name}>{userName || 'User'}</Text>
        
        {/* Health Ring Container */}
        <View style={styles.healthRingContainer}>
          <View style={styles.healthRing}>
            <Svg width={72} height={72} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={36}
                cy={36}
                r={30}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={6}
                fill="none"
              />
              <Circle
                cx={36}
                cy={36}
                r={30}
                stroke={colors.gold}
                strokeWidth={6}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.healthRingLabel}>
              <Text style={styles.healthScoreNum}>{healthScore}</Text>
              <Text style={styles.healthScorePct}>%</Text>
            </View>
          </View>
          <View style={styles.healthInfo}>
            <Text style={styles.healthInfoTitle}>Vault Health: {getHealthStatus()}</Text>
            <Text style={styles.healthInfoText}>{getHealthHint()}</Text>
          </View>
        </View>
      </View>

      {/* Body */}
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.items}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.trusted}</Text>
            <Text style={styles.statLabel}>Trusted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{stats.categories}</Text>
            <Text style={styles.statLabel}>Categories</Text>
          </View>
        </View>

        {/* Suggestions */}
        <Text style={styles.sectionTitle}>Complete Your Vault</Text>
        <TouchableOpacity
          style={styles.suggestionCard}
          onPress={() => (navigation as any).navigate('Vault')}
        >
          <Text style={styles.suggestionIcon}>📋</Text>
          <View style={styles.suggestionText}>
            <Text style={styles.suggestionTitle}>Add Legal Documents</Text>
            <Text style={styles.suggestionSubtitle}>Will, power of attorney location</Text>
          </View>
          <Text style={styles.suggestionArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.suggestionCard}
          onPress={() => (navigation as any).navigate('Vault')}
        >
          <Text style={styles.suggestionIcon}>🛡️</Text>
          <View style={styles.suggestionText}>
            <Text style={styles.suggestionTitle}>Add Insurance Policies</Text>
            <Text style={styles.suggestionSubtitle}>Life, health & home coverage</Text>
          </View>
          <Text style={styles.suggestionArrow}>›</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(201,168,76,0.7)',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontFamily: 'serif',
    fontSize: 30,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 20,
    minHeight: 36,
  },
  healthRingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
  },
  healthRing: {
    width: 72,
    height: 72,
    position: 'relative',
  },
  healthRingLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  healthScoreNum: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '500',
    color: colors.gold,
  },
  healthScorePct: {
    fontSize: 10,
    color: 'rgba(201,168,76,0.6)',
  },
  healthInfo: {
    flex: 1,
  },
  healthInfoTitle: {
    fontSize: 14,
    color: colors.cream,
    fontWeight: '500',
    marginBottom: 4,
  },
  healthInfoText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 16.8,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingTop: 20,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNum: {
    fontFamily: 'serif',
    fontSize: 24,
    fontWeight: '500',
    color: colors.navy,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  suggestionCard: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.15)',
  },
  suggestionIcon: {
    fontSize: 22,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    color: colors.cream,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  suggestionArrow: {
    color: colors.gold,
    fontSize: 16,
  },
});
