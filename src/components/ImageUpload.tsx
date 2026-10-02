import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  recommendedWidth?: number;
  recommendedHeight?: number;
  aspectRatio?: string;
  bucket?: string;
}

export default function ImageUpload({
  value,
  onChange,
  label,
  recommendedWidth = 1200,
  recommendedHeight = 630,
  aspectRatio = '16:9',
  bucket = 'event-images',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);

      // Upload para Supabase Storage
      if (!supabase) {
        throw new Error('Supabase não configurado');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      setPreview(publicUrl);
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao fazer upload da imagem');
      setPreview(value);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      
      {/* Informações de dimensão */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ImageIcon className="w-3 h-3" />
        <span>
          Tamanho ideal: {recommendedWidth}x{recommendedHeight}px ({aspectRatio})
        </span>
      </div>

      {/* Área de upload */}
      <div className="relative">
        {preview ? (
          <div className="relative group">
            <img
              src={preview}
              alt={label}
              className="w-full h-48 object-cover rounded-lg border border-slate-200"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
          >
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">
              Clique para fazer upload
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PNG, JPG ou WEBP (máx. 5MB)
            </p>
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-sm text-slate-600 mt-2">Enviando...</p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
