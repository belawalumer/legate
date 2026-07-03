import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { colors, borderRadius } from '../../constants/theme';
import { getCurrentUser } from '../../services/auth';
import { listDocuments, uploadDocument, getDocumentSignedUrl, deleteDocument } from '../../services/documents';
import { Document } from '../../types';
import { PLAN_FEATURES } from '../../constants';
import { getUserPlan, PLAN_LABELS } from '../../services/plan';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { alert } from '../../components/AppAlert';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function fileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return '📄';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return '🖼️';
  if (ext === 'doc' || ext === 'docx') return '📝';
  return '📁';
}

export default function DocumentsScreen() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const params = route.params as { vaultOwnerId?: string; vaultOwnerName?: string } | undefined;
  const isViewingOtherVault = !!params?.vaultOwnerId;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resolveVaultOwnerId = async () => {
    if (params?.vaultOwnerId) return params.vaultOwnerId;
    const user = await getCurrentUser();
    return user?.id || null;
  };

  const load = async () => {
    try {
      const vaultOwnerId = await resolveVaultOwnerId();
      if (!vaultOwnerId) return;
      const docs = await listDocuments(vaultOwnerId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const handleUpload = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const plan = await getUserPlan(user.id);
      if (!PLAN_FEATURES[plan].documentUpload) {
        alert(
          'Upgrade Required',
          `Document upload isn't available on the ${PLAN_LABELS[plan]} plan. Upgrade to store estate documents.`,
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
          ]
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;

      const file = result.assets[0];
      setUploading(true);
      await uploadDocument(user.id, user.id, file.uri, file.name);
      await load();
    } catch (error: any) {
      alert('Upload Failed', error.message || 'Could not upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (doc: Document) => {
    try {
      const url = await getDocumentSignedUrl(doc.file_url);
      await Linking.openURL(url);
    } catch (error: any) {
      alert('Error', error.message || 'Could not open document');
    }
  };

  const handleDelete = (doc: Document) => {
    alert('Delete Document', `Remove "${doc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setBusyId(doc.id);
            await deleteDocument(doc.id, doc.file_url);
            await load();
          } catch (error: any) {
            alert('Error', error.message || 'Could not delete document');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isViewingOtherVault ? `${params!.vaultOwnerName || 'Owner'}'s Documents` : 'Documents'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {isViewingOtherVault ? 'Read-only access' : 'Upload and organize estate documents'}
        </Text>
      </View>

      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>Upload wills, deeds, and other estate documents so trusted persons can find them later.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.docCard} onPress={() => handleOpen(item)} activeOpacity={0.7}>
            <Text style={styles.docIcon}>{fileIcon(item.name)}</Text>
            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.docMeta}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            {!isViewingOtherVault && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
                disabled={busyId === item.id}
              >
                <Text style={styles.deleteButtonText}>{busyId === item.id ? '...' : 'Delete'}</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />

      {!isViewingOtherVault && (
        <TouchableOpacity style={styles.fab} onPress={handleUpload} disabled={uploading} activeOpacity={0.8}>
          <Text style={styles.fabText}>{uploading ? 'Uploading...' : '+ Upload Document'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 10,
  },
  docCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  docIcon: {
    fontSize: 24,
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.navy,
    marginBottom: 2,
  },
  docMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  deleteButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(139,58,58,0.08)',
  },
  deleteButtonText: {
    fontSize: 11,
    color: colors.error,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'serif',
    fontSize: 18,
    color: colors.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: colors.navy,
    borderRadius: borderRadius.lg,
    padding: 16,
    alignItems: 'center',
  },
  fabText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
