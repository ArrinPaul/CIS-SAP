import { supabase } from './supabase/client';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export function useStorage() {
  /**
   * Upload a file to Supabase Storage
   * @param file The file to upload (should already be optimized to 520x520)
   * @param bucket The storage bucket name (default: 'eventra-uploads')
   */
  const uploadFile = async (file: File, bucket: string = 'eventra-uploads'): Promise<string> => {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File is too large (max ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB)`);
    }

    // Create a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

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
