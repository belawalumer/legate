import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { encryptData, decryptData } from '../../services/encryption';
import { VaultCategory } from '../../types';
import { colors, borderRadius } from '../../constants/theme';
import { PLAN_FEATURES } from '../../constants';
import { getUserPlan, getVaultItemCount, hasReachedLimit, PLAN_LABELS } from '../../services/plan';

export default function AddVaultItemScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const category = (route.params as any)?.category as VaultCategory | undefined;
  const itemId = (route.params as any)?.itemId as string | undefined;
  const isEditMode = !!itemId;
  
  const [title, setTitle] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && itemId) {
      loadItemForEdit();
    }
  }, [itemId, isEditMode]);

  const loadItemForEdit = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data: itemData, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!itemData) {
        Alert.alert('Error', 'Item not found');
        navigation.goBack();
        return;
      }

      setTitle(itemData.title);
      
      // Decrypt the data
      try {
        const decrypted = await decryptData(itemData.encrypted_data);
        const parsedData = JSON.parse(decrypted);
        setData(parsedData);
      } catch (err) {
        console.error('Error decrypting item:', err);
        Alert.alert('Error', 'Failed to load item data');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      navigation.goBack();
    } finally {
      setLoadingItem(false);
    }
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      // Encrypt sensitive data
      const encryptedData = await encryptData(JSON.stringify(data));

      if (isEditMode && itemId) {
        // Update existing item
        const { error } = await supabase
          .from('vault_items')
          .update({
            title,
            encrypted_data: encryptedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', itemId)
          .eq('user_id', user.id);

        if (error) throw error;

        Alert.alert(
          'Success',
          'Item updated successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to CategoryItems screen
                if (category) {
                  (navigation as any).navigate('CategoryItems', { category });
                } else {
                  navigation.goBack();
                }
              },
            },
          ]
        );
      } else {
        const plan = await getUserPlan(user.id);
        const itemCount = await getVaultItemCount(user.id);
        if (hasReachedLimit(itemCount, PLAN_FEATURES[plan].maxItems)) {
          setLoading(false);
          Alert.alert(
            'Vault Item Limit Reached',
            `Your ${PLAN_LABELS[plan]} plan allows up to ${PLAN_FEATURES[plan].maxItems} vault items. Upgrade to add more.`,
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Upgrade', onPress: () => (navigation as any).navigate('Paywall') },
            ]
          );
          return;
        }

        // Insert new item
        const { error } = await supabase
          .from('vault_items')
          .insert({
            user_id: user.id,
            category: category || 'other',
            title,
            encrypted_data: encryptedData,
            metadata: {},
          });

        if (error) throw error;

        Alert.alert(
          'Success',
          'Item added to vault',
          [
            {
              text: 'Add Another',
              onPress: () => {
                // Clear form to add another item
                setTitle('');
                setData({});
              },
            },
            {
              text: 'Done',
              onPress: () => {
                // Navigate to CategoryItems screen
                if (category) {
                  (navigation as any).navigate('CategoryItems', { category });
                } else {
                  navigation.goBack();
                }
              },
              style: 'cancel',
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryInfo = category ? require('../../constants').VAULT_CATEGORIES.find((c: any) => c.value === category) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {categoryInfo?.icon} {categoryInfo?.label || category || 'Add Item'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isEditMode 
              ? 'Edit item details'
              : category === 'banking' ? 'Add new account' : 
                category === 'subscriptions' ? 'Add new subscription' :
                category === 'important_contacts' ? 'Add new contact' :
                category === 'legal_documents' ? 'Add new document' :
                category === 'final_wishes' ? 'Add new wish' :
                'Add new item'}
          </Text>
        </View>
      </View>
      {loadingItem ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading item...</Text>
        </View>
      ) : (
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter item title"
      />

      <Text style={styles.categoryLabel}>
        Category: {category || 'Other'}
      </Text>

      {/* Category-specific form fields */}
      {category === 'banking' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.input}
              value={data.bank_name || ''}
              onChangeText={(value) => setData({ ...data, bank_name: value })}
              placeholder="e.g., First National Bank"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Type</Text>
            <TextInput
              style={styles.input}
              value={data.account_type || ''}
              onChangeText={(value) => setData({ ...data, account_type: value })}
              placeholder="e.g., Checking Account"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={data.account_number || ''}
              onChangeText={(value) => setData({ ...data, account_number: value })}
              placeholder="Enter account number"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Routing Number</Text>
            <TextInput
              style={styles.input}
              value={data.routing_number || ''}
              onChangeText={(value) => setData({ ...data, routing_number: value })}
              placeholder="Enter routing number"
              secureTextEntry
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Approx. Balance</Text>
            <TextInput
              style={styles.input}
              value={data.approx_balance || ''}
              onChangeText={(value) => setData({ ...data, approx_balance: value })}
              placeholder="e.g., $24,500"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Online Banking URL</Text>
            <TextInput
              style={styles.input}
              value={data.online_banking || ''}
              onChangeText={(value) => setData({ ...data, online_banking: value })}
              placeholder="e.g., fnb.com/online"
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
        </>
      )}

      {/* Investments */}
      {category === 'investments' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Investment Type</Text>
            <TextInput
              style={styles.input}
              value={data.type || ''}
              onChangeText={(value) => setData({ ...data, type: value })}
              placeholder="e.g., Stocks, Mutual Funds, Crypto, Retirement"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name/Account Name</Text>
            <TextInput
              style={styles.input}
              value={data.name || ''}
              onChangeText={(value) => setData({ ...data, name: value })}
              placeholder="e.g., 401(k) Account"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Provider/Platform</Text>
            <TextInput
              style={styles.input}
              value={data.provider || ''}
              onChangeText={(value) => setData({ ...data, provider: value })}
              placeholder="e.g., Fidelity, Vanguard"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={data.account_number || ''}
              onChangeText={(value) => setData({ ...data, account_number: value })}
              placeholder="Enter account number"
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Approx. Value</Text>
            <TextInput
              style={styles.input}
              value={data.approx_value || ''}
              onChangeText={(value) => setData({ ...data, approx_value: value })}
              placeholder="e.g., $50,000"
              keyboardType="numeric"
            />
          </View>
        </>
      )}

      {/* Insurance */}
      {category === 'insurance' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Insurance Type</Text>
            <TextInput
              style={styles.input}
              value={data.type || ''}
              onChangeText={(value) => setData({ ...data, type: value })}
              placeholder="e.g., Life, Health, Home, Auto"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Provider</Text>
            <TextInput
              style={styles.input}
              value={data.provider || ''}
              onChangeText={(value) => setData({ ...data, provider: value })}
              placeholder="e.g., State Farm, Blue Cross"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Policy Number</Text>
            <TextInput
              style={styles.input}
              value={data.policy_number || ''}
              onChangeText={(value) => setData({ ...data, policy_number: value })}
              placeholder="Enter policy number"
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Agent Name</Text>
            <TextInput
              style={styles.input}
              value={data.agent_name || ''}
              onChangeText={(value) => setData({ ...data, agent_name: value })}
              placeholder="Agent's name"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Agent Contact</Text>
            <TextInput
              style={styles.input}
              value={data.agent_contact || ''}
              onChangeText={(value) => setData({ ...data, agent_contact: value })}
              placeholder="Phone or email"
              keyboardType="phone-pad"
            />
          </View>
        </>
      )}

      {/* Loans & Debts */}
      {category === 'loans_debts' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Loan Type</Text>
            <TextInput
              style={styles.input}
              value={data.type || ''}
              onChangeText={(value) => setData({ ...data, type: value })}
              placeholder="e.g., Mortgage, Car Loan, Credit Card"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Lender</Text>
            <TextInput
              style={styles.input}
              value={data.lender || ''}
              onChangeText={(value) => setData({ ...data, lender: value })}
              placeholder="e.g., Bank of America"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.input}
              value={data.account_number || ''}
              onChangeText={(value) => setData({ ...data, account_number: value })}
              placeholder="Enter account number"
              secureTextEntry
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Monthly Payment</Text>
            <TextInput
              style={styles.input}
              value={data.monthly_payment || ''}
              onChangeText={(value) => setData({ ...data, monthly_payment: value })}
              placeholder="e.g., $1,200"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Current Balance</Text>
            <TextInput
              style={styles.input}
              value={data.balance || ''}
              onChangeText={(value) => setData({ ...data, balance: value })}
              placeholder="e.g., $150,000"
              keyboardType="numeric"
            />
          </View>
        </>
      )}

      {/* Subscriptions */}
      {category === 'subscriptions' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Subscription Name</Text>
            <TextInput
              style={styles.input}
              value={data.name || ''}
              onChangeText={(value) => setData({ ...data, name: value })}
              placeholder="e.g., Netflix, Spotify"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Provider</Text>
            <TextInput
              style={styles.input}
              value={data.provider || ''}
              onChangeText={(value) => setData({ ...data, provider: value })}
              placeholder="Service provider"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Monthly Cost</Text>
            <TextInput
              style={styles.input}
              value={data.monthly_cost || ''}
              onChangeText={(value) => setData({ ...data, monthly_cost: value })}
              placeholder="e.g., $15.99"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Billing Date</Text>
            <TextInput
              style={styles.input}
              value={data.billing_date || ''}
              onChangeText={(value) => setData({ ...data, billing_date: value })}
              placeholder="e.g., 15th of each month"
            />
          </View>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setData({ ...data, is_cancelled: data.is_cancelled === 'true' ? '' : 'true' })}
          >
            <View style={[styles.checkbox, data.is_cancelled === 'true' && styles.checkboxChecked]}>
              {data.is_cancelled === 'true' && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>This subscription has been cancelled</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Real Estate */}
      {category === 'real_estate' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Property Type</Text>
            <TextInput
              style={styles.input}
              value={data.property_type || ''}
              onChangeText={(value) => setData({ ...data, property_type: value })}
              placeholder="e.g., House, Condo, Land"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={data.address || ''}
              onChangeText={(value) => setData({ ...data, address: value })}
              placeholder="Full property address"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mortgage Status</Text>
            <TextInput
              style={styles.input}
              value={data.mortgage_status || ''}
              onChangeText={(value) => setData({ ...data, mortgage_status: value })}
              placeholder="e.g., Owned, Mortgaged, Rented"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Deed Location</Text>
            <TextInput
              style={styles.input}
              value={data.deed_location || ''}
              onChangeText={(value) => setData({ ...data, deed_location: value })}
              placeholder="Where the deed is stored"
            />
          </View>
        </>
      )}

      {/* Vehicles */}
      {category === 'vehicles' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Make</Text>
            <TextInput
              style={styles.input}
              value={data.make || ''}
              onChangeText={(value) => setData({ ...data, make: value })}
              placeholder="e.g., Toyota, Ford"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.input}
              value={data.model || ''}
              onChangeText={(value) => setData({ ...data, model: value })}
              placeholder="e.g., Camry, F-150"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              value={data.year || ''}
              onChangeText={(value) => setData({ ...data, year: value })}
              placeholder="e.g., 2020"
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Title Location</Text>
            <TextInput
              style={styles.input}
              value={data.title_location || ''}
              onChangeText={(value) => setData({ ...data, title_location: value })}
              placeholder="Where the title is stored"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Loan Status</Text>
            <TextInput
              style={styles.input}
              value={data.loan_status || ''}
              onChangeText={(value) => setData({ ...data, loan_status: value })}
              placeholder="e.g., Owned, Financed"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Insurance Provider</Text>
            <TextInput
              style={styles.input}
              value={data.insurance_provider || ''}
              onChangeText={(value) => setData({ ...data, insurance_provider: value })}
              placeholder="Auto insurance company"
            />
          </View>
        </>
      )}

      {/* Important Contacts */}
      {category === 'important_contacts' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={data.name || ''}
              onChangeText={(value) => setData({ ...data, name: value })}
              placeholder="Contact's full name"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Role</Text>
            <TextInput
              style={styles.input}
              value={data.role || ''}
              onChangeText={(value) => setData({ ...data, role: value })}
              placeholder="e.g., Lawyer, Accountant, Doctor"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={data.phone || ''}
              onChangeText={(value) => setData({ ...data, phone: value })}
              placeholder="Phone number"
              keyboardType="phone-pad"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={data.email || ''}
              onChangeText={(value) => setData({ ...data, email: value })}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={data.address || ''}
              onChangeText={(value) => setData({ ...data, address: value })}
              placeholder="Office or mailing address"
            />
          </View>
        </>
      )}

      {/* Digital Assets */}
      {category === 'digital_assets' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Asset Type</Text>
            <TextInput
              style={styles.input}
              value={data.type || ''}
              onChangeText={(value) => setData({ ...data, type: value })}
              placeholder="e.g., Email, Social Media, Crypto Wallet"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Platform</Text>
            <TextInput
              style={styles.input}
              value={data.platform || ''}
              onChangeText={(value) => setData({ ...data, platform: value })}
              placeholder="e.g., Gmail, Facebook, Coinbase"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={data.username || ''}
              onChangeText={(value) => setData({ ...data, username: value })}
              placeholder="Username or account ID"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Wallet Address</Text>
            <TextInput
              style={styles.input}
              value={data.wallet_address || ''}
              onChangeText={(value) => setData({ ...data, wallet_address: value })}
              placeholder="Crypto wallet address (if applicable)"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Recovery Info</Text>
            <TextInput
              style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
              value={data.recovery_info || ''}
              onChangeText={(value) => setData({ ...data, recovery_info: value })}
              placeholder="Recovery codes, backup info"
              multiline
              secureTextEntry
            />
          </View>
        </>
      )}

      {/* Legal Documents */}
      {category === 'legal_documents' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Document Type</Text>
            <TextInput
              style={styles.input}
              value={data.type || ''}
              onChangeText={(value) => setData({ ...data, type: value })}
              placeholder="e.g., Will, Power of Attorney, Trust"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={data.location || ''}
              onChangeText={(value) => setData({ ...data, location: value })}
              placeholder="Where the document is stored"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Attorney Name</Text>
            <TextInput
              style={styles.input}
              value={data.attorney_name || ''}
              onChangeText={(value) => setData({ ...data, attorney_name: value })}
              placeholder="Attorney's name"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Attorney Contact</Text>
            <TextInput
              style={styles.input}
              value={data.attorney_contact || ''}
              onChangeText={(value) => setData({ ...data, attorney_contact: value })}
              placeholder="Phone or email"
              keyboardType="phone-pad"
            />
          </View>
        </>
      )}

      {/* Final Wishes */}
      {category === 'final_wishes' && (
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Category</Text>
            <TextInput
              style={styles.input}
              value={data.category || ''}
              onChangeText={(value) => setData({ ...data, category: value })}
              placeholder="e.g., Funeral, Organ Donation, Message"
            />
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, { minHeight: 120, textAlignVertical: 'top' }]}
              value={data.content || ''}
              onChangeText={(value) => setData({ ...data, content: value })}
              placeholder="Your wishes and instructions"
              multiline
            />
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{isEditMode ? 'Update Item' : 'Save'}</Text>
      </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxMark: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.navy,
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    color: colors.gold,
    fontSize: 18,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'serif',
    fontSize: 22,
    fontWeight: '400',
    color: colors.cream,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  body: {
    flex: 1,
  },
  keyboardAvoider: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    marginTop: 8,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  inputContainer: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 14,
    fontSize: 15,
    backgroundColor: colors.white,
    color: colors.textPrimary,
  },
  categoryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    fontWeight: '400',
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    backgroundColor: colors.navy,
    padding: 16,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
