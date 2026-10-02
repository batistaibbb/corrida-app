import { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, Download, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PdfUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  bucket?: string;
}

export default function PdfUpload({
  value,
  onChange,
  label = 'Regulamento do Evento (PDF)',
  bucket = 'event-documents',
}: PdfUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF');
      return;
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('O PDF deve ter no máximo 10MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      if (!supabase) {
        throw new Error('Supabase não configurado');
      }

      // Upload para Supabase Storage
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`;
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
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao fazer upload do PDF');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      
      <div className="text-xs text-slate-500">
        <FileText className="w-3 h-3 inline mr-1" />
        Formato: PDF (máx. 10MB)
      </div>

      {/* Área de upload */}
      <div className="relative">
        {value ? (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900">PDF enviado</p>
                  <div className="flex items-center gap-3 mt-1">
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Visualizar
                    </a>
                    <a
                      href={value}
                      download
                      className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Baixar
                    </a>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">
              Clique para fazer upload do PDF
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Regulamento, mapa do percurso, etc.
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
          accept="application/pdf"
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
