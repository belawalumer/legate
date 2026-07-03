import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';
import { getCurrentUser } from '../../services/auth';
import { decryptData } from '../../services/encryption';
import { VaultCategory } from '../../types';
import { VAULT_CATEGORIES } from '../../constants';
import { colors, borderRadius } from '../../constants/theme';
import { alert } from '../../components/AppAlert';

export default function CategoryItemsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = route.params as { category: VaultCategory; vaultOwnerId?: string; vaultOwnerName?: string };
  const category = params?.category;
  const isViewingOtherVault = !!params?.vaultOwnerId;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadItems();

    // Reload when screen comes into focus (after adding new item)
    const unsubscribe = navigation.addListener('focus', () => {
      loadItems();
    });

    return unsubscribe;
  }, [category, navigation]);

  const resolveVaultOwnerId = async () => {
    if (params?.vaultOwnerId) return params.vaultOwnerId;
    const user = await getCurrentUser();
    return user?.id || null;
  };

  const loadItems = async () => {
    try {
      const vaultOwnerId = await resolveVaultOwnerId();
      if (!vaultOwnerId) return;

      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('user_id', vaultOwnerId)
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Decrypt the data for display
      const decryptedItems = await Promise.all(
        (data || []).map(async (item) => {
          try {
            if (!item.encrypted_data) {
              return { ...item, decrypted_data: {} };
            }
            const decrypted = await decryptData(item.encrypted_data);
            return {
              ...item,
              decrypted_data: JSON.parse(decrypted),
            };
          } catch (err) {
            console.error('Error decrypting item:', err);
            // Return item with empty decrypted_data if decryption fails
            return {
              ...item,
              decrypted_data: {},
            };
          }
        })
      );
      
      setItems(decryptedItems);
    } catch (error: any) {
      alert('Error', error.message);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const categoryInfo = VAULT_CATEGORIES.find(cat => cat.value === category);

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const data = item.decrypted_data || {};
    
    // Render category-specific fields
    const renderCategoryFields = () => {
      // Banking
      if (category === 'banking') {
        return (
          <>
            {data.bank_name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Bank Name</Text>
                <Text style={styles.fieldValue}>{data.bank_name}</Text>
              </View>
            )}
            {data.account_type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Account Type</Text>
                <Text style={styles.fieldValue}>{data.account_type}</Text>
              </View>
            )}
            {data.account_number && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Account Number</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••  ••••  {String(data.account_number).slice(-4)}
                  </Text>
                </View>
              </View>
            )}
            {data.routing_number && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Routing Number</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••••••{String(data.routing_number).slice(-1)}
                  </Text>
                </View>
              </View>
            )}
            {(data.approx_balance || data.approximate_balance) && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Approx. Balance</Text>
                <Text style={styles.fieldValue}>
                  {data.approx_balance || data.approximate_balance}
                </Text>
              </View>
            )}
            {data.online_banking && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Online Banking</Text>
                <Text style={[styles.fieldValue, { fontSize: 13 }]}>
                  {data.online_banking}
                </Text>
              </View>
            )}
          </>
        );
      }

      // Investments
      if (category === 'investments') {
        return (
          <>
            {data.type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Type</Text>
                <Text style={styles.fieldValue}>{data.type}</Text>
              </View>
            )}
            {data.name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Name</Text>
                <Text style={styles.fieldValue}>{data.name}</Text>
              </View>
            )}
            {data.provider && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Provider</Text>
                <Text style={styles.fieldValue}>{data.provider}</Text>
              </View>
            )}
            {data.account_number && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Account Number</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••  ••••  {String(data.account_number).slice(-4)}
                  </Text>
                </View>
              </View>
            )}
            {data.approx_value && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Approx. Value</Text>
                <Text style={styles.fieldValue}>{data.approx_value}</Text>
              </View>
            )}
          </>
        );
      }

      // Insurance
      if (category === 'insurance') {
        return (
          <>
            {data.type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Type</Text>
                <Text style={styles.fieldValue}>{data.type}</Text>
              </View>
            )}
            {data.provider && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Provider</Text>
                <Text style={styles.fieldValue}>{data.provider}</Text>
              </View>
            )}
            {data.policy_number && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Policy Number</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••••••{String(data.policy_number).slice(-4)}
                  </Text>
                </View>
              </View>
            )}
            {data.agent_name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Agent Name</Text>
                <Text style={styles.fieldValue}>{data.agent_name}</Text>
              </View>
            )}
            {data.agent_contact && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Agent Contact</Text>
                <Text style={styles.fieldValue}>{data.agent_contact}</Text>
              </View>
            )}
          </>
        );
      }

      // Loans & Debts
      if (category === 'loans_debts') {
        return (
          <>
            {data.type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Loan Type</Text>
                <Text style={styles.fieldValue}>{data.type}</Text>
              </View>
            )}
            {data.lender && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Lender</Text>
                <Text style={styles.fieldValue}>{data.lender}</Text>
              </View>
            )}
            {data.account_number && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Account Number</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••  ••••  {String(data.account_number).slice(-4)}
                  </Text>
                </View>
              </View>
            )}
            {data.monthly_payment && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Monthly Payment</Text>
                <Text style={styles.fieldValue}>{data.monthly_payment}</Text>
              </View>
            )}
            {data.balance && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Balance</Text>
                <Text style={styles.fieldValue}>{data.balance}</Text>
              </View>
            )}
          </>
        );
      }

      // Subscriptions
      if (category === 'subscriptions') {
        return (
          <>
            {data.name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Name</Text>
                <Text style={styles.fieldValue}>{data.name}</Text>
              </View>
            )}
            {data.provider && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Provider</Text>
                <Text style={styles.fieldValue}>{data.provider}</Text>
              </View>
            )}
            {data.monthly_cost && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Monthly Cost</Text>
                <Text style={styles.fieldValue}>{data.monthly_cost}</Text>
              </View>
            )}
            {data.billing_date && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Billing Date</Text>
                <Text style={styles.fieldValue}>{data.billing_date}</Text>
              </View>
            )}
          </>
        );
      }

      // Real Estate
      if (category === 'real_estate') {
        return (
          <>
            {data.property_type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Property Type</Text>
                <Text style={styles.fieldValue}>{data.property_type}</Text>
              </View>
            )}
            {data.address && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Address</Text>
                <Text style={styles.fieldValue}>{data.address}</Text>
              </View>
            )}
            {data.mortgage_status && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Mortgage Status</Text>
                <Text style={styles.fieldValue}>{data.mortgage_status}</Text>
              </View>
            )}
            {data.deed_location && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Deed Location</Text>
                <Text style={styles.fieldValue}>{data.deed_location}</Text>
              </View>
            )}
          </>
        );
      }

      // Vehicles
      if (category === 'vehicles') {
        return (
          <>
            {data.make && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Make</Text>
                <Text style={styles.fieldValue}>{data.make}</Text>
              </View>
            )}
            {data.model && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Model</Text>
                <Text style={styles.fieldValue}>{data.model}</Text>
              </View>
            )}
            {data.year && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Year</Text>
                <Text style={styles.fieldValue}>{data.year}</Text>
              </View>
            )}
            {data.title_location && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Title Location</Text>
                <Text style={styles.fieldValue}>{data.title_location}</Text>
              </View>
            )}
            {data.loan_status && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Loan Status</Text>
                <Text style={styles.fieldValue}>{data.loan_status}</Text>
              </View>
            )}
            {data.insurance_provider && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Insurance Provider</Text>
                <Text style={styles.fieldValue}>{data.insurance_provider}</Text>
              </View>
            )}
          </>
        );
      }

      // Important Contacts
      if (category === 'important_contacts') {
        return (
          <>
            {data.name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Name</Text>
                <Text style={styles.fieldValue}>{data.name}</Text>
              </View>
            )}
            {data.role && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Role</Text>
                <Text style={styles.fieldValue}>{data.role}</Text>
              </View>
            )}
            {data.phone && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <Text style={styles.fieldValue}>{data.phone}</Text>
              </View>
            )}
            {data.email && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Email</Text>
                <Text style={styles.fieldValue}>{data.email}</Text>
              </View>
            )}
            {data.address && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Address</Text>
                <Text style={styles.fieldValue}>{data.address}</Text>
              </View>
            )}
          </>
        );
      }

      // Digital Assets
      if (category === 'digital_assets') {
        return (
          <>
            {data.type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Type</Text>
                <Text style={styles.fieldValue}>{data.type}</Text>
              </View>
            )}
            {data.platform && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Platform</Text>
                <Text style={styles.fieldValue}>{data.platform}</Text>
              </View>
            )}
            {data.username && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Username</Text>
                <Text style={styles.fieldValue}>{data.username}</Text>
              </View>
            )}
            {data.wallet_address && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Wallet Address</Text>
                <View style={styles.encryptedValue}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.encryptedText}>
                    ••••  ••••  {String(data.wallet_address).slice(-8)}
                  </Text>
                </View>
              </View>
            )}
          </>
        );
      }

      // Legal Documents
      if (category === 'legal_documents') {
        return (
          <>
            {data.type && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Document Type</Text>
                <Text style={styles.fieldValue}>{data.type}</Text>
              </View>
            )}
            {data.location && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Location</Text>
                <Text style={styles.fieldValue}>{data.location}</Text>
              </View>
            )}
            {data.attorney_name && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Attorney Name</Text>
                <Text style={styles.fieldValue}>{data.attorney_name}</Text>
              </View>
            )}
            {data.attorney_contact && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Attorney Contact</Text>
                <Text style={styles.fieldValue}>{data.attorney_contact}</Text>
              </View>
            )}
          </>
        );
      }

      // Final Wishes
      if (category === 'final_wishes') {
        return (
          <>
            {data.category && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Category</Text>
                <Text style={styles.fieldValue}>{data.category}</Text>
              </View>
            )}
            {data.content && (
              <View style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>Content</Text>
                <Text style={styles.fieldValue}>{data.content}</Text>
              </View>
            )}
          </>
        );
      }

      // Generic fallback for any other category
      return (
        <>
          {Object.entries(data).slice(0, 4).map(([key, value]) => (
            value && (
              <View key={key} style={styles.fieldItem}>
                <Text style={styles.fieldLabel}>
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.fieldValue}>{String(value)}</Text>
              </View>
            )
          ))}
        </>
      );
    };
    
    const handleDelete = () => {
      alert(
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
              try {
                const user = await getCurrentUser();
                if (!user) return;

                const { error } = await supabase
                  .from('vault_items')
                  .delete()
                  .eq('id', item.id)
                  .eq('user_id', user.id);

                if (error) throw error;

                // Reload items
                loadItems();
              } catch (error: any) {
                alert('Error', error.message);
              }
            },
          },
        ]
      );
    };

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <Text style={styles.accountLabel}>
            {category === 'banking' ? 'Account' :
             category === 'subscriptions' ? 'Subscription' :
             category === 'important_contacts' ? 'Contact' :
             category === 'legal_documents' ? 'Document' :
             category === 'final_wishes' ? 'Wish' :
             'Item'} {index + 1} of {items.length}
          </Text>
          {!isViewingOtherVault && (
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => (navigation as any).navigate('AddVaultItem', {
                  category: item.category,
                  itemId: item.id
                })}
              >
                <Ionicons name="create-outline" size={16} color={colors.gold} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.fieldGroup}
          onPress={() => (navigation as any).navigate('VaultItemDetail', {
            itemId: item.id,
            vaultOwnerId: params?.vaultOwnerId,
          })}
          activeOpacity={0.7}
        >
          {item.title && (
            <View style={styles.fieldItem}>
              <Text style={styles.fieldLabel}>Title</Text>
              <Text style={styles.fieldValue}>{item.title}</Text>
            </View>
          )}
          {renderCategoryFields()}
        </TouchableOpacity>
      </View>
    );
  };

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
          <Text style={styles.headerTitle}>{categoryInfo?.icon} {categoryInfo?.label}</Text>
          <Text style={styles.headerSubtitle}>
            {initialLoading
              ? 'Loading…'
              : `${items.length} ${category === 'banking' ? 'account' : category === 'subscriptions' ? 'subscription' : category === 'important_contacts' ? 'contact' : category === 'legal_documents' ? 'document' : category === 'final_wishes' ? 'wish' : 'item'}${items.length !== 1 ? 's' : ''} stored · encrypted`}
          </Text>
        </View>
      </View>

      {initialLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.navy} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No items yet</Text>
          {!isViewingOtherVault && (
            <>
              <Text style={styles.emptySubtext}>Tap the + button to add your first item</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => (navigation as any).navigate('AddVaultItem', { category })}
              >
                <Text style={styles.addButtonText}>Add Item</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={loadItems} />
            }
          >
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {renderItem({ item, index })}
              </React.Fragment>
            ))}
            {!isViewingOtherVault && (
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.outlineButton}
                  onPress={() => (navigation as any).navigate('AddVaultItem', { category })}
                >
                  <Text style={styles.outlineButtonText}>
                    + Add {category === 'banking' ? 'Account' :
                           category === 'subscriptions' ? 'Subscription' :
                           category === 'important_contacts' ? 'Contact' :
                           category === 'legal_documents' ? 'Document' :
                           category === 'final_wishes' ? 'Wish' :
                           'Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </>
      )}
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
  bodyContent: {
    padding: 20,
    gap: 14,
  },
  itemContainer: {
    marginBottom: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  itemActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldGroup: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 50,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  addButton: {
    backgroundColor: colors.navy,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  addButtonText: {
    color: colors.gold,
    fontSize: 15,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
    paddingTop: 20,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  outlineButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
});
