import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, borderRadius } from '../constants/theme';

export interface AppAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  title: string;
  message?: string;
  buttons: AppAlertButton[];
}

let showAlertImpl: ((state: AlertState) => void) | null = null;

/**
 * Drop-in themed replacement for React Native's Alert.alert. Same signature,
 * so existing call sites only need an import swap - no logic changes.
 */
export function alert(title: string, message?: string, buttons?: AppAlertButton[]): void {
  const resolvedButtons = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  if (showAlertImpl) {
    showAlertImpl({ title, message, buttons: resolvedButtons });
  } else {
    console.warn('AppAlert.alert called before AlertProvider mounted:', title, message);
  }
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<AlertState | null>(null);

  showAlertImpl = (next: AlertState) => {
    setState(next);
    setVisible(true);
  };

  const handlePress = (button: AppAlertButton) => {
    setVisible(false);
    // Let the close animation start before running the callback, matching
    // native Alert's behavior of dismissing before the handler fires.
    setTimeout(() => button.onPress?.(), Platform.OS === 'ios' ? 200 : 0);
  };

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            {state && (
              <>
                <Text style={styles.title}>{state.title}</Text>
                {!!state.message && <Text style={styles.message}>{state.message}</Text>}
                <View style={state.buttons.length > 2 ? styles.buttonsStacked : styles.buttonsRow}>
                  {state.buttons.map((button, index) => (
                    <TouchableOpacity
                      key={`${button.text}-${index}`}
                      style={[
                        styles.button,
                        button.style === 'cancel' && styles.buttonCancel,
                        button.style === 'destructive' && styles.buttonDestructive,
                        button.style !== 'cancel' && button.style !== 'destructive' && styles.buttonPrimary,
                      ]}
                      onPress={() => handlePress(button)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          button.style === 'cancel' && styles.buttonTextCancel,
                          button.style === 'destructive' && styles.buttonTextDestructive,
                          button.style !== 'cancel' && button.style !== 'destructive' && styles.buttonTextPrimary,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,42,74,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.cream,
    borderRadius: borderRadius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  title: {
    fontFamily: 'serif',
    fontSize: 20,
    fontWeight: '400',
    color: colors.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonsStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.navy,
  },
  buttonCancel: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  buttonDestructive: {
    backgroundColor: colors.error,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonTextPrimary: {
    color: colors.gold,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
  buttonTextDestructive: {
    color: colors.white,
  },
});
