import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, borderRadius } from '../../constants/theme';
import { PLAN_PRICING } from '../../constants';
import { getCurrentUser } from '../../services/auth';
import { setUserPlan, PLAN_LABELS, SubscriptionPlan } from '../../services/plan';

export default function PaywallScreen() {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<'essential' | 'family' | 'legacy'>('family');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) return;

      await setUserPlan(user.id, selectedPlan as SubscriptionPlan);
      Alert.alert(
        'Plan Updated',
        `You're now on the ${PLAN_LABELS[selectedPlan as SubscriptionPlan]} plan.\n\nNote: this app doesn't have real payment processing connected yet, so no charge was made.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not update plan');
    } finally {
      setLoading(false);
    }
  };

  const selected = PLAN_PRICING.find((p) => p.plan === selectedPlan)!;

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <Text style={styles.icon}>🏛️</Text>
        <Text style={styles.title}>Upgrade Your Legacy</Text>
        <Text style={styles.subtitle}>
          Choose a plan that protects your family completely.
        </Text>

        <View style={styles.planCards}>
          {PLAN_PRICING.map((p) => {
            const isSelected = p.plan === selectedPlan;
            return (
              <TouchableOpacity
                key={p.plan}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => setSelectedPlan(p.plan)}
                activeOpacity={0.8}
              >
                {p.featured && (
                  <View style={styles.featuredBadge}>
                    <Text style={styles.featuredBadgeText}>Most Popular</Text>
                  </View>
                )}
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>{PLAN_LABELS[p.plan]}</Text>
                  <Text style={styles.planTagline}>{p.tagline}</Text>
                </View>
                <View>
                  <Text style={styles.planPrice}>${p.priceUsdPerYear}</Text>
                  <Text style={styles.planPeriod}>/year</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.navy} />
          ) : (
            <Text style={styles.continueButtonText}>
              Continue with {PLAN_LABELS[selected.plan]} · ${selected.priceUsdPerYear}/yr
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelLink}>
          <Text style={styles.cancelLinkText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
  },
  body: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
  },
  icon: {
    fontSize: 44,
    textAlign: 'center',
    marginBottom: 14,
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 28,
  },
  planCards: {
    gap: 10,
    marginBottom: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  featuredBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: colors.gold,
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.cream,
    marginBottom: 2,
  },
  planTagline: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
  },
  planPrice: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '500',
    color: colors.gold,
    textAlign: 'right',
  },
  planPeriod: {
    fontSize: 10,
    color: 'rgba(201,168,76,0.5)',
    textAlign: 'right',
  },
  continueButton: {
    backgroundColor: colors.gold,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  cancelLinkText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
});
