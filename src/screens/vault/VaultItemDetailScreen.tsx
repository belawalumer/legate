import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { decryptData } from '../../services/encryption';
import { VAULT_CATEGORIES } from '../../constants';
import { colors, borderRadius } from '../../constants/theme';

export default function VaultItemDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { itemId } = route.params as { itemId: string };
  
  const [item, setItem] = useState<any>(null);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadItemDetails();
  }, [itemId]);

  const loadItemDetails = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('id', itemId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!data) {
        Alert.alert('Error', 'Item not found');
        return;
      }

      setItem(data);

      // Decrypt the data
      try {
        const decrypted = await decryptData(data.encrypted_data);
        setDecryptedData(JSON.parse(decrypted));
      } catch (err) {
        console.error('Error decrypting item:', err);
        setDecryptedData({});
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const categoryInfo = VAULT_CATEGORIES.find(cat => cat.value === item?.category);

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const user = await getCurrentUser();
              if (!user) {
                Alert.alert('Error', 'You must be logged in');
                return;
              }

              const { error } = await supabase
                .from('vault_items')
                .delete()
                .eq('id', item?.id)
                .eq('user_id', user.id);

              if (error) throw error;

              Alert.alert('Success', 'Item deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const renderField = (label: string, value: any, isEncrypted: boolean = false) => {
    if (!value || value === '') return null;
    
    return (
      <View style={styles.fieldItem}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEncrypted ? (
          <View style={styles.encryptedValue}>
            <Text style={styles.lockIcon}>🔒</Text>
            <Text style={styles.encryptedText}>
              {typeof value === 'string' && value.length > 4 
                ? `••••  ••••  ${value.slice(-4)}`
                : `••••  ••••  ${String(value).slice(-4)}`}
            </Text>
          </View>
        ) : (
          <Text style={styles.fieldValue}>{String(value)}</Text>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading item details...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Item not found</Text>
      </View>
    );
  }

  const data = decryptedData || {};

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
            {categoryInfo?.icon} {categoryInfo?.label || item.title}
          </Text>
          <Text style={styles.headerSubtitle}>View account details</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => (navigation as any).navigate('AddVaultItem', { 
              category: item.category, 
              itemId: item.id 
            })}
          >
            <Ionicons name="create-outline" size={20} color={colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.fieldGroup}>
          {/* Display fields based on category */}
          {item.category === 'banking' && (
            <>
              {renderField('Bank Name', data.bank_name)}
              {renderField('Account Type', data.account_type)}
              {renderField('Account Number', data.account_number, true)}
              {renderField('Routing Number', data.routing_number, true)}
              {renderField('Approx. Balance', data.approx_balance || data.approximate_balance)}
              {renderField('Online Banking', data.online_banking)}
              {renderField('Branch', data.branch)}
            </>
          )}
          {item.category === 'investments' && (
            <>
              {renderField('Type', data.type)}
              {renderField('Name', data.name)}
              {renderField('Provider', data.provider)}
              {renderField('Account Number', data.account_number, true)}
              {renderField('Approx. Value', data.approx_value)}
            </>
          )}
          {item.category === 'insurance' && (
            <>
              {renderField('Type', data.type)}
              {renderField('Provider', data.provider)}
              {renderField('Policy Number', data.policy_number, true)}
              {renderField('Agent Name', data.agent_name)}
              {renderField('Agent Contact', data.agent_contact)}
            </>
          )}
          {item.category === 'loans_debts' && (
            <>
              {renderField('Loan Type', data.type)}
              {renderField('Lender', data.lender)}
              {renderField('Account Number', data.account_number, true)}
              {renderField('Monthly Payment', data.monthly_payment)}
              {renderField('Balance', data.balance)}
            </>
          )}
          {item.category === 'subscriptions' && (
            <>
              {renderField('Name', data.name)}
              {renderField('Provider', data.provider)}
              {renderField('Monthly Cost', data.monthly_cost)}
              {renderField('Billing Date', data.billing_date)}
            </>
          )}
          {item.category === 'real_estate' && (
            <>
              {renderField('Property Type', data.property_type)}
              {renderField('Address', data.address)}
              {renderField('Mortgage Status', data.mortgage_status)}
              {renderField('Deed Location', data.deed_location)}
            </>
          )}
          {item.category === 'vehicles' && (
            <>
              {renderField('Make', data.make)}
              {renderField('Model', data.model)}
              {renderField('Year', data.year)}
              {renderField('Title Location', data.title_location)}
              {renderField('Loan Status', data.loan_status)}
              {renderField('Insurance Provider', data.insurance_provider)}
            </>
          )}
          {item.category === 'important_contacts' && (
            <>
              {renderField('Name', data.name)}
              {renderField('Role', data.role)}
              {renderField('Phone', data.phone)}
              {renderField('Email', data.email)}
              {renderField('Address', data.address)}
            </>
          )}
          {item.category === 'digital_assets' && (
            <>
              {renderField('Type', data.type)}
              {renderField('Platform', data.platform)}
              {renderField('Username', data.username)}
              {renderField('Wallet Address', data.wallet_address, true)}
              {renderField('Recovery Info', data.recovery_info, true)}
            </>
          )}
          {item.category === 'legal_documents' && (
            <>
              {renderField('Document Type', data.type)}
              {renderField('Location', data.location)}
              {renderField('Attorney Name', data.attorney_name)}
              {renderField('Attorney Contact', data.attorney_contact)}
            </>
          )}
          {item.category === 'final_wishes' && (
            <>
              {renderField('Category', data.category)}
              {renderField('Content', data.content)}
            </>
          )}
          {/* Generic fallback for any remaining fields */}
          {Object.entries(data).map(([key, value]) => {
            // Skip fields already shown above
            const shownFields = ['bank_name', 'account_type', 'account_number', 'routing_number', 
              'approx_balance', 'approximate_balance', 'online_banking', 'branch', 'type', 'name', 
              'provider', 'approx_value', 'policy_number', 'agent_name', 'agent_contact', 'lender',
              'monthly_payment', 'balance', 'monthly_cost', 'billing_date', 'property_type', 'address',
              'mortgage_status', 'deed_location', 'make', 'model', 'year', 'title_location', 'loan_status',
              'insurance_provider', 'role', 'phone', 'email', 'platform', 'username', 'wallet_address',
              'recovery_info', 'location', 'attorney_name', 'attorney_contact', 'category', 'content'];
            
            if (value && typeof value === 'string' && !shownFields.includes(key)) {
              const sensitiveFields = ['account_number', 'routing_number', 'password', 'pin', 'ssn', 
                'wallet_address', 'recovery_info', 'policy_number'];
              const isEncrypted = sensitiveFields.some(field => key.toLowerCase().includes(field));
              return renderField(
                key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                value,
                isEncrypted
              );
            }
            return null;
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '500',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
  },
  fieldGroup: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fieldItem: {
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: colors.navy,
    fontWeight: '400',
  },
  encryptedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    fontSize: 12,
    color: colors.gold,
  },
  encryptedText: {
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 3,
  },
  metadataSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
