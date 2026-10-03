import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, Link as LinkIcon, Info } from 'lucide-react';
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
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida (JPG, PNG, WEBP)');
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
      // Verificar se Supabase está configurado
      if (!supabase) {
        throw new Error('Supabase não está configurado. Use a opção "Inserir URL manualmente" abaixo.');
      }

      // Criar preview local
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Tentar fazer upload
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Erro detalhado do upload:', uploadError);
        
        // Mensagens de erro específicas
        if (uploadError.message.includes('bucket not found')) {
          throw new Error(`O bucket "${bucket}" não existe. Crie-o no Supabase Dashboard em Storage → New bucket.`);
        } else if (uploadError.message.includes('new row violates row-level security')) {
          throw new Error('Permissão negada. Configure as políticas de segurança do Storage no Supabase.');
        } else if (uploadError.message.includes('The resource already exists')) {
          throw new Error('Arquivo já existe. Tente novamente.');
        } else {
          throw new Error(`Erro ao fazer upload: ${uploadError.message}. Use a opção "Inserir URL manualmente" abaixo.`);
        }
      }

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onChange(publicUrl);
      setPreview(publicUrl);
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      const errorMessage = err.message || 'Erro desconhecido ao fazer upload da imagem';
      setError(errorMessage);
      setPreview(value);
      
      // Mostrar opção de URL manual automaticamente
      setShowUrlInput(true);
    } finally {
      setUploading(false);
    }
  };

  const handleManualUrl = () => {
    if (manualUrl && manualUrl.trim()) {
      onChange(manualUrl.trim());
      setPreview(manualUrl.trim());
      setError(null);
      setShowUrlInput(false);
    } else {
      setError('Por favor, insira uma URL válida');
    }
  };

  const handleRemove = () => {
    onChange('');
    setPreview('');
    setManualUrl('');
    setShowUrlInput(false);
    setError(null);
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
              onError={() => {
                setError('Não foi possível carregar a imagem. Verifique se a URL está correta.');
                setPreview('');
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(true);
                  setManualUrl(preview);
                }}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                title="Editar URL"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                title="Remover imagem"
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
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{error}</p>
            {error.includes('bucket') && (
              <div className="mt-2 text-xs text-red-700 bg-red-100 rounded p-2">
                <p className="font-semibold mb-1">Como criar o bucket no Supabase:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Acesse o Dashboard do Supabase</li>
                  <li>Vá em <strong>Storage</strong> (menu lateral)</li>
                  <li>Clique em <strong>"New bucket"</strong></li>
                  <li>Nome: <code className="bg-red-200 px-1 rounded">{bucket}</code></li>
                  <li>Marque <strong>"Public bucket"</strong></li>
                  <li>Clique em <strong>"Create bucket"</strong></li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Opção de URL manual */}
      <div className="border-t border-slate-200 pt-3">
        {!showUrlInput ? (
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
          >
            <LinkIcon className="w-4 h-4" />
            Inserir URL manualmente
          </button>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-600">
              URL da imagem:
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleManualUrl}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Aplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUrlInput(false);
                  setError(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
            <p className="text-xs text-slate-500 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                Use URLs de imagens do Unsplash, Imgur, ou qualquer serviço de hospedagem de imagens.
                Ex: https://images.unsplash.com/photo-xxx?w=1200&h=630&fit=crop
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
