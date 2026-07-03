import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { colors, borderRadius } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { MAX_TRUSTED_PERSONS } from '../../constants';
import { getTrustedPersonCount } from '../../services/plan';
import { alert } from '../../components/AppAlert';
import { useUserProfile } from '../../contexts/UserProfileContext';

const RELATIONSHIP_OPTIONS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'executor', label: 'Executor' },
  { value: 'other', label: 'Other' },
];

export default function TrustedPersonsScreen() {
  const route = useRoute();
  const { profile: myProfile } = useUserProfile();
  const params = route.params as { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  const isViewingOtherVault = !!params?.vaultOwnerId;

  const [trustedPersons, setTrustedPersons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('other');
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadTrustedPersons();
  }, []);

  const loadTrustedPersons = async () => {
    try {
      let ownerId = params?.vaultOwnerId;
      if (!ownerId) {
        const user = await getCurrentUser();
        if (!user) return;
        ownerId = user.id;
      }

      const { data, error } = await supabase
        .from('trusted_persons')
        .select('*')
        .eq('vault_owner_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrustedPersons(data || []);
    } catch (error) {
      console.error('Error loading trusted persons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; style: any }> = {
      accepted: { label: 'Accepted', style: styles.badgeAccepted },
      pending: { label: 'Invited', style: styles.badgeInvited }, // Show 'Invited' for pending status
      declined: { label: 'Declined', style: styles.badgePending },
    };
    return statusMap[status] || statusMap.pending;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 1);
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) {
      alert('Error', 'Please enter both email and name');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      alert('Error', 'Please enter a valid email address');
      return;
    }

    setInviting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        alert('Error', 'You must be logged in');
        return;
      }

      const trustedCount = await getTrustedPersonCount(user.id);
      if (trustedCount >= MAX_TRUSTED_PERSONS) {
        setInviting(false);
        alert(
          'Trusted Person Limit Reached',
          `You can add up to ${MAX_TRUSTED_PERSONS} trusted people.`
        );
        return;
      }

      // Check if person already exists
      const { data: existing } = await supabase
        .from('trusted_persons')
        .select('id')
        .eq('vault_owner_id', user.id)
        .eq('email', inviteEmail.toLowerCase())
        .single();

      if (existing) {
        alert('Error', 'This person has already been invited');
        return;
      }

      // Ensure role is a valid value (schema constraint: 'executor', 'spouse', 'child', 'other')
      // The role column has a CHECK constraint, so we must use one of these exact values
      const validRoles = ['executor', 'spouse', 'child', 'other'];
      let validRole = 'other'; // Default fallback
      
      // Validate and sanitize the role value
      if (inviteRelationship && typeof inviteRelationship === 'string') {
        const trimmedRole = inviteRelationship.trim().toLowerCase();
        if (validRoles.includes(trimmedRole)) {
          validRole = trimmedRole;
        }
      }
      
      console.log('Inviting trusted person:', {
        email: inviteEmail,
        name: inviteName,
        originalRole: inviteRelationship,
        validatedRole: validRole
      });

      // Insert new trusted person
      // Note: status must be one of: 'pending', 'accepted', 'declined' (per schema constraint)
      const { data: insertedData, error } = await supabase
        .from('trusted_persons')
        .insert({
          vault_owner_id: user.id,
          email: inviteEmail.toLowerCase(),
          full_name: inviteName,
          role: validRole,
          status: 'pending', // Schema constraint: must be 'pending', 'accepted', or 'declined'
        })
        .select()
        .single();

      if (error) throw error;

      const ownerName = myProfile?.fullName || user.user_metadata?.full_name || 'Vault Owner';

      // Call Edge Function to send invitation email
      try {
        // Get the session token and anon key for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        
        if (!anonKey || !supabaseUrl) {
          console.error('Missing Supabase configuration');
          return;
        }

        console.log('Calling Edge Function directly with fetch...');
        console.log('Session token exists:', !!session?.access_token);
        console.log('Token preview:', session?.access_token?.substring(0, 20) + '...');
        
        if (!session?.access_token) {
          console.error('No valid session token available - user may need to re-login');
          return;
        }
        
        // Call the function directly with fetch
        // According to Supabase docs, we need both Authorization (JWT) and apikey (anon key)
        const functionUrl = `${supabaseUrl}/functions/v1/send-invitation`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`, // User's JWT token for authentication
            'apikey': anonKey, // Anon key required by Supabase Edge Functions
          },
          body: JSON.stringify({
            email: inviteEmail.toLowerCase(),
            fullName: inviteName,
            role: validRole,
            vaultOwnerId: user.id,
            vaultOwnerName: ownerName,
          }),
        });
        
        console.log('Response status:', response.status);

        const functionData = await response.json();

        if (!response.ok) {
          console.error('Email sending failed:', {
            status: response.status,
            statusText: response.statusText,
            data: functionData,
          });
          // Don't throw - invitation is saved, email is optional
        } else {
          console.log('Invitation email sent successfully:', functionData);
        }
      } catch (emailError: any) {
        console.error('Could not send invitation email:', emailError);
        console.error('Error message:', emailError?.message);
        // Don't throw - invitation is saved, email is optional for MVP
      }

      alert('Success', 'Invitation sent successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setShowInviteModal(false);
            setInviteEmail('');
            setInviteName('');
            setInviteRelationship('other');
            loadTrustedPersons();
          },
        },
      ]);
    } catch (error: any) {
      alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isViewingOtherVault ? `${params!.vaultOwnerName || 'Vault'}'s Trusted People` : 'Trusted People'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isViewingOtherVault
            ? 'The people trusted with this vault'
            : 'These people can request access to your vault when the time comes'}
        </Text>
      </View>
      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {!isViewingOtherVault && (
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerText}>
              <Text style={styles.infoBannerStrong}>Two-key protection:</Text> Two trusted people must confirm the request before your vault unlocks. This prevents unauthorized access.
            </Text>
          </View>
        )}

        {trustedPersons.map((person) => {
          const badge = getStatusBadge(person.status || 'pending');
          return (
            <View key={person.id} style={styles.personCard}>
              <View style={styles.personAvatar}>
                <Text style={styles.personAvatarText}>
                  {getInitials(person.full_name || person.email)}
                </Text>
              </View>
              <View style={styles.personInfo}>
                <Text style={styles.personName}>{person.full_name || 'Unknown'}</Text>
                <Text style={styles.personEmail}>{person.email}</Text>
                <Text style={styles.personMeta}>
                  {RELATIONSHIP_OPTIONS.find(opt => opt.value === person.role)?.label || 'Trusted Person'} · Added {new Date(person.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={[styles.statusBadge, badge.style]}>
                <Text style={[styles.statusBadgeText, { color: badge.style.color }]}>
                  {badge.label}
                </Text>
              </View>
            </View>
          );
        })}

        {!isViewingOtherVault && (
          <>
            <TouchableOpacity
              style={styles.addPersonBtn}
              onPress={() => setShowInviteModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.addPersonIcon}>+</Text>
              <Text style={styles.addPersonText}>Invite another trusted person</Text>
            </TouchableOpacity>

            <View style={styles.upgradeBanner}>
              <Text style={styles.upgradeText}>
                ✦ {Math.max(MAX_TRUSTED_PERSONS - trustedPersons.length, 0)} more{' '}
                {MAX_TRUSTED_PERSONS - trustedPersons.length === 1 ? 'person' : 'people'} available.{' '}
                Up to {MAX_TRUSTED_PERSONS} trusted people per vault.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Trusted Person</Text>
              <Text style={styles.modalSubtitle}>
                Enter the details of the person you want to add as a trusted person
              </Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="e.g., John Doe"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="e.g., john@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Relationship</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowRelationshipPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.pickerButtonText,
                    !inviteRelationship && styles.pickerButtonPlaceholder
                  ]}>
                    {RELATIONSHIP_OPTIONS.find(opt => opt.value === inviteRelationship)?.label || 'Select relationship'}
                  </Text>
                  <Text style={styles.pickerArrow}>›</Text>
                </TouchableOpacity>
              </View>

              {/* Relationship Picker Modal */}
              <Modal
                visible={showRelationshipPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowRelationshipPicker(false)}
              >
                <TouchableOpacity
                  style={styles.pickerModalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowRelationshipPicker(false)}
                >
                  <View style={styles.pickerModalContent}>
                    <Text style={styles.pickerModalTitle}>Select Relationship</Text>
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.pickerOption,
                          inviteRelationship === option.value && styles.pickerOptionSelected
                        ]}
                        onPress={() => {
                          setInviteRelationship(option.value);
                          setShowRelationshipPicker(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.pickerOptionText,
                          inviteRelationship === option.value && styles.pickerOptionTextSelected
                        ]}>
                          {option.label}
                        </Text>
                        {inviteRelationship === option.value && (
                          <Text style={styles.pickerCheckmark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </TouchableOpacity>
              </Modal>

              <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteName('');
                  setInviteRelationship('other');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleInvite}
                disabled={inviting}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Text>
              </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 26,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 12,
  },
  infoBanner: {
    backgroundColor: colors.navy,
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
  },
  infoBannerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19.2,
  },
  infoBannerStrong: {
    color: colors.gold,
    fontWeight: '600',
  },
  personCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personAvatarText: {
    fontFamily: 'serif',
    fontSize: 20,
    color: colors.gold,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 2,
  },
  personEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  personMeta: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    padding: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeAccepted: {
    backgroundColor: 'rgba(45,125,90,0.12)',
    color: colors.success,
  },
  badgeInvited: {
    backgroundColor: 'rgba(201,168,76,0.15)',
    color: colors.warning,
  },
  badgePending: {
    backgroundColor: 'rgba(139,58,58,0.12)',
    color: colors.error,
  },
  addPersonBtn: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  addPersonIcon: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  addPersonText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  upgradeBanner: {
    backgroundColor: colors.goldPale,
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  upgradeText: {
    fontSize: 11,
    color: colors.warning,
    lineHeight: 17.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: colors.navy,
    padding: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  modalTitle: {
    fontFamily: 'serif',
    fontSize: 26,
    fontWeight: '400',
    color: colors.cream,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    lineHeight: 18,
  },
  modalBody: {
    padding: 24,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 16,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modalButtonCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  modalButtonPrimary: {
    backgroundColor: colors.navy,
  },
  modalButtonPrimaryText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Picker Styles
  pickerButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 16,
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerButtonPlaceholder: {
    color: colors.textMuted,
  },
  pickerArrow: {
    fontSize: 20,
    color: colors.textMuted,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: colors.cream,
    borderRadius: 20,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  pickerModalTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: colors.navy,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.gold,
  },
  pickerOptionText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: colors.gold,
    fontWeight: '500',
  },
  pickerCheckmark: {
    fontSize: 18,
    color: colors.gold,
    fontWeight: 'bold',
  },
});
