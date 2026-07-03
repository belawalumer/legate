import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, borderRadius } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    icon: '🏛️',
    title: "Your family shouldn't have to search.",
    body: "When the time comes, the last thing your loved ones should face is financial chaos. Legate gives them everything they need, organized and ready.",
  },
  // Add more slides as needed
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleContinue = async () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Mark onboarding as seen
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      // Navigate to Auth stack, then to SignUp
      (navigation as any).navigate('Auth', { screen: 'SignUp' });
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as seen
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    // Navigate to Auth stack, then to SignUp
    (navigation as any).navigate('Auth', { screen: 'SignUp' });
  };

  const slide = ONBOARDING_SLIDES[currentSlide];

  return (
    <View style={styles.container}>
      {/* Visual Section - Top Half */}
      <View style={styles.visual}>
        <Text style={styles.icon}>{slide.icon}</Text>
      </View>

      {/* Content Section - Bottom Half */}
      <View style={styles.content}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>

        {/* Dots Indicator */}
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  visual: {
    height: SCREEN_HEIGHT * 0.5, // Exactly 50% of screen
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 100,
    opacity: 0.95,
  },
  content: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 28,
    fontWeight: '400',
    color: colors.navy,
    lineHeight: 34,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    color: colors.navy,
    lineHeight: 24,
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
  button: {
    backgroundColor: colors.navy,
    borderRadius: borderRadius.lg,
    padding: 18,
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    color: colors.gold,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
