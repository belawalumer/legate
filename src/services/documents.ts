import { File } from 'expo-file-system';
import { supabase } from './supabase';
import { Document } from '../types';

const SIGNED_URL_TTL_SECONDS = 60 * 5;

export async function listDocuments(vaultOwnerId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('vault_owner_id', vaultOwnerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function uploadDocument(
  vaultOwnerId: string,
  uploadedBy: string,
  fileUri: string,
  fileName: string,
  category?: string
): Promise<Document> {
  const file = new File(fileUri);
  const bytes = await file.arrayBuffer();
  const path = `${vaultOwnerId}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(path, bytes, { contentType: guessContentType(fileName) });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      vault_owner_id: vaultOwnerId,
      name: fileName,
      file_url: path,
      category: category || null,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getDocumentSignedUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(documentId: string, filePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from('documents').remove([filePath]);
  if (storageError) throw storageError;

  const { error } = await supabase.from('documents').delete().eq('id', documentId);
  if (error) throw error;
}

function guessContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/octet-stream';
}
