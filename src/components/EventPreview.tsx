import { Calendar, MapPin, Users, Star } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EventPreviewProps {
  data: {
    name: string;
    date: string;
    time: string;
    location: string;
    city: string;
    state: string;
    image: string;
    description: string;
    organizer: string;
    maxParticipants: number;
    category: string;
    distances: any[];
    kits: any[];
    featured: boolean;
  };
}

export default function EventPreview({ data }: EventPreviewProps) {
  if (!data.name && !data.image) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-slate-500 text-sm">
          Preencha os dados do evento para ver o preview
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header do Preview */}
      <div className="bg-slate-900 text-white px-4 py-2 text-xs font-medium flex items-center justify-between">
        <span>📱 Preview do Evento</span>
        <span className="text-slate-400">Como os participantes verão</span>
      </div>

      {/* Imagem do Evento */}
      {data.image && (
        <div className="relative h-48">
          <img
            src={data.image}
            alt={data.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          {data.featured && (
            <div className="absolute top-3 left-3">
              <span className="px-2 py-1 bg-amber-500 text-amber-950 text-xs font-bold rounded">
                ⭐ DESTAQUE
              </span>
            </div>
          )}
        </div>
      )}

      {/* Conteúdo */}
      <div className="p-4 space-y-3">
        {/* Nome e Categoria */}
        <div>
          <h3 className="font-bold text-slate-900 text-lg line-clamp-2">
            {data.name || 'Nome do Evento'}
          </h3>
          <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
            {data.category || 'Categoria'}
          </span>
        </div>

        {/* Informações */}
        <div className="space-y-1.5 text-sm text-slate-600">
          {data.date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>
                {format(parseISO(data.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                {data.time && ` às ${data.time}`}
              </span>
            </div>
          )}
          {data.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-500" />
              <span className="truncate">
                {data.location}
                {data.city && ` - ${data.city}/${data.state}`}
              </span>
            </div>
          )}
          {data.organizer && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="truncate">{data.organizer}</span>
            </div>
          )}
        </div>

        {/* Descrição */}
        {data.description && (
          <p className="text-sm text-slate-600 line-clamp-3">
            {data.description}
          </p>
        )}

        {/* Distâncias */}
        {data.distances && data.distances.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Distâncias Disponíveis:
            </p>
            <div className="flex flex-wrap gap-2">
              {data.distances.slice(0, 3).map((d, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded"
                >
                  {d.km}km - R$ {d.price.toFixed(2)}
                </span>
              ))}
              {data.distances.length > 3 && (
                <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded">
                  +{data.distances.length - 3} mais
                </span>
              )}
            </div>
          </div>
        )}

        {/* Kits */}
        {data.kits && data.kits.length > 0 && (
          <div className="pt-3 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Kits Disponíveis:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.kits.slice(0, 2).map((kit, i) => (
                <div key={i} className="border border-slate-200 rounded p-2">
                  {kit.image && (
                    <img
                      src={kit.image}
                      alt={kit.name}
                      className="w-full h-16 object-cover rounded mb-1"
                    />
                  )}
                  <p className="text-xs font-medium text-slate-900 line-clamp-1">
                    {kit.name}
                  </p>
                  <p className="text-xs font-bold text-emerald-600">
                    R$ {kit.price.toFixed(2)}
                  </p>
                </div>
              ))}
              {data.kits.length > 2 && (
                <div className="border border-slate-200 rounded p-2 flex items-center justify-center">
                  <span className="text-xs text-slate-600">
                    +{data.kits.length - 2} kits
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preço */}
        {data.distances && data.distances.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">A partir de</span>
            <span className="text-lg font-bold text-emerald-600">
              R$ {Math.min(...data.distances.map(d => d.price)).toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
