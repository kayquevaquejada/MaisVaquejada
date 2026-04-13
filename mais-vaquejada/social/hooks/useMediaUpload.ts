import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { compressImage } from '../../lib/imageUtils';

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File, folder: string = 'posts') => {
    setUploading(true);
    setProgress(0);
    try {
      // 1. Comprimir apenas se for imagem
      let fileToUpload: File | Blob = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file);
        } catch (e) {
          console.warn('Falha na compressão, enviando original:', e);
        }
      }

      const fileExt = file.name ? file.name.split('.').pop() : (file.type ? file.type.split('/').pop() : 'jpg');
      const finalExt = fileExt === 'jpeg' ? 'jpg' : fileExt;
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${finalExt}`;
      const filePath = `${folder}/${fileName}`; // Usa o parametro como pasta
      const BUCKET_NAME = 'vaquejadas'; // Bucket centralizado criado no Supabase

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
          console.error("Storage Error:", error);
          throw new Error("Erro no Storage (Verifique se o bucket 'vaquejadas' está criado e público no Supabase)");
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
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
