/**
 * Utilitário para compressão de imagens no cliente.
 * Focado em manter a qualidade visual enquanto reduz o tamanho do arquivo.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxFileSizeMB?: number;
}

export const compressImage = async (
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<Blob> => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxFileSizeMB = 1.5
  } = options;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Manter proporção
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Não foi possível obter o contexto do canvas'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Compressão iterativa se necessário para atingir o target de tamanho
      let currentQuality = quality;
      
      const attemptCompression = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha na geração do Blob'));
              return;
            }

            // Se o arquivo for maior que o limite e ainda pudermos reduzir a qualidade
            if (blob.size > maxFileSizeMB * 1024 * 1024 && q > 0.3) {
              attemptCompression(q - 0.1);
            } else {
              resolve(blob);
            }
          },
          'image/jpeg',
          q
        );
      };

      attemptCompression(currentQuality);
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível processar a imagem da galeria. Formato não suportado.'));
    };

    img.src = url;
  });
};

/**
 * Gera uma thumbnail leve para uso em feeds/cards.
 * Limita a largura a 400px e qualidade baixa para carregamento rápido.
 */
export const generateThumbnail = async (file: File | Blob): Promise<Blob> => {
  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.6,
    maxFileSizeMB: 0.1 // 100KB target para thumbnails
  });
};
