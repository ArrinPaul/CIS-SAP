import { supabase } from './supabase/client';

// SVGs are deliberately excluded: they can carry <script>/external references,
// and are a common stored-XSS vector if ever rendered inline without
// sanitization, which nothing downstream of this upload does today.
const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

// Chat attachments (and any future generic upload) additionally allow common
// document/archive types on top of images.
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
]);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export type UploadKind = 'image' | 'any';

export function useStorage() {
  /**
   * Upload a file to Supabase Storage
   * @param file The file to upload (should already be optimized to 520x520 for images)
   * @param bucket The storage bucket name (default: 'eventra-uploads')
   * @param kind 'image' (default) restricts to image types, e.g. for avatars/banners/maps;
   *   'any' additionally allows common document/archive types, e.g. for chat attachments.
   */
  const uploadFile = async (file: File, bucket: string = 'eventra-uploads', kind: UploadKind = 'image'): Promise<string> => {
    const allowed = kind === 'any'
      ? new Set([...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES])
      : IMAGE_MIME_TYPES;
    if (!allowed.has(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`);
    }

    // Create a unique file path. file.name may have no extension (or end in
    // a bare dot), so don't assume split('.').pop() gives a real one — that
    // produced paths like "..._169.undefined".
    const lastDot = file.name.lastIndexOf('.');
    const fileExt = lastDot > 0 ? file.name.slice(lastDot + 1).toLowerCase() : '';
    const fileBase = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    const filePath = fileExt ? `${fileBase}.${fileExt}` : fileBase;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Error uploading to Supabase Storage:', error);
      // Surface the failure to the caller instead of silently returning a
      // blob: URL — that URL only resolves in this tab/session, so if it
      // were persisted (profile image, event banner) it would render as a
      // broken image for everyone else and after reload.
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  };

  return { uploadFile };
}
