import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Background radial gradient circle effect - using multiple circles for radial effect */}
      <View style={styles.gradientCircle1} />
      <View style={styles.gradientCircle2} />
      <View style={styles.gradientCircle3} />
      
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.logo}>Legate</Text>
        <View style={styles.ornament}>
          <LinearGradient
            colors={['transparent', colors.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ornamentGradient}
          />
        </View>
        <Text style={styles.tagline}>YOUR LEGACY, PROTECTED</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  gradientCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: '50%',
    left: '50%',
    marginTop: -150,
    marginLeft: -150,
    backgroundColor: 'rgba(201,168,76,0.15)',
    opacity: 0.6,
  },
  gradientCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    top: '50%',
    left: '50%',
    marginTop: -100,
    marginLeft: -100,
    backgroundColor: 'rgba(201,168,76,0.1)',
    opacity: 0.4,
  },
  gradientCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
    backgroundColor: 'rgba(201,168,76,0.05)',
    opacity: 0.2,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 52,
    fontWeight: '300',
    color: colors.gold,
    letterSpacing: 4,
    marginBottom: 8,
  },
  ornament: {
    width: 60,
    height: 1,
    marginVertical: 20,
    overflow: 'hidden',
  },
  ornamentGradient: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(201,168,76,0.6)',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});
