import { supabase } from '@/integrations/supabase/client';
import imageCompression from 'browser-image-compression';

const BUCKET = 'attachments';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // compress images larger than 1.5MB

/** Compress an image file if it's larger than the threshold. Non-image files pass through. */
export async function maybeCompressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= COMPRESS_THRESHOLD) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      initialQuality: 0.8,
    });
    // imageCompression returns a Blob in some browsers; ensure it's a File
    return new File([compressed], file.name, { type: compressed.type || file.type });
  } catch (err) {
    console.warn('Image compression failed, uploading original:', err);
    return file;
  }
}

export async function uploadAttachment(file: File): Promise<{ storagePath: string; size: number; type: string; name: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`${file.name} is too large (max 25MB)`);
  }
  const processed = await maybeCompressImage(file);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Normalize filename to avoid storage key issues (spaces, unicode, etc.)
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, processed, {
    cacheControl: '3600',
    contentType: processed.type || file.type,
    upsert: false,
  });
  if (error) throw error;

  return { storagePath: path, size: processed.size, type: processed.type || file.type, name: file.name };
}

/** Returns a short-lived signed URL for viewing/downloading a private file. */
export async function getAttachmentUrl(storagePath: string, expiresInSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSec);
  if (error || !data) throw error || new Error('Failed to sign URL');
  return data.signedUrl;
}

export async function deleteAttachment(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  if (error) console.warn('Failed to delete attachment:', error);
}
