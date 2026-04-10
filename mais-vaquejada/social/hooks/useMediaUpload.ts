import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File, bucket: string = 'posts') => {
    setUploading(true);
    setProgress(0);
    try {
      const fileExt = file.name ? file.name.split('.').pop() : (file.type ? file.type.split('/').pop() : 'jpg');
      const finalExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${finalExt}`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Upload Error:', err);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
    progress
  };
}
