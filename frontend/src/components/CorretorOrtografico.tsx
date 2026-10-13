import React, { useState, useMemo } from 'react';
import { Sparkles, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { analisarEcorrigirTexto } from '../utils/ptBrCorrector';

interface CorretorOrtograficoProps {
  texto: string;
  onAplicarCorrecao: (textoCorrigido: string) => void;
  className?: string;
  compacto?: boolean;
}

export const CorretorOrtografico: React.FC<CorretorOrtograficoProps> = ({
  texto,
  onAplicarCorrecao,
  className = '',
  compacto = false
}) => {
  const [expandido, setExpandido] = useState(false);

  // Analisa o texto em tempo real com memoização
  const analise = useMemo(() => {
    return analisarEcorrigirTexto(texto);
  }, [texto]);

  if (!texto || !texto.trim()) {
    return null;
  }

  const handleCorrigir = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAplicarCorrecao(analise.textoCorrigido);
  };

  if (!analise.temCorrecoes) {
    if (compacto) return null;
    return (
      <div className={`flex items-center gap-1.5 text-[11px] text-emerald-400/90 py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
        <CheckCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>Ortografia e acentuação revisadas (PT-BR)</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border transition-all ${
      analise.temCorrecoes
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        : 'bg-[#161a22] border-white/5 text-gray-400'
    } ${className}`}>
      {/* Barra Principal */}
      <div className="p-2.5 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
              <span>Corretor PT-BR</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/25 text-amber-300 font-bold">
                {analise.totalSugestoes} {analise.totalSugestoes === 1 ? 'ajuste' : 'ajustes'}
              </span>
            </p>
            <p className="text-[10px] text-amber-300/80 truncate">
              {analise.sugestoes.slice(0, 3).map(s => `"${s.original}" ➔ "${s.corrigido}"`).join(', ')}
              {analise.sugestoes.length > 3 && ` (+${analise.sugestoes.length - 3})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {analise.sugestoes.length > 0 && (
            <button
              type="button"
              onClick={() => setExpandido(prev => !prev)}
              className="text-[10px] text-amber-300 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition flex items-center gap-1"
              title="Ver detalhes das correções"
            >
              {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              <span>{expandido ? 'Ocultar' : 'Ver'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCorrigir}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0d0f13] transition shadow-sm"
            title="Aplicar correções ortográficas e de acentuação"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Corrigir Texto</span>
          </button>
        </div>
      </div>

      {/* Lista detalhada expandida */}
      {expandido && analise.sugestoes.length > 0 && (
        <div className="border-t border-amber-500/20 p-2.5 space-y-1.5 bg-black/20 rounded-b-xl text-[11px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1">
            Sugestões identificadas:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
            {analise.sugestoes.map((sug, i) => (
              <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/5 border border-white/5 text-[11px]">
                <div className="truncate">
                  <span className="line-through text-rose-400 mr-1.5">{sug.original}</span>
                  <span className="font-semibold text-emerald-400">{sug.corrigido}</span>
                </div>
                <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-white/10 text-gray-300 shrink-0">
                  {sug.tipo}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 pt-1">
            💡 Mantém tags especiais como <code className="text-amber-300">[ATENDENTE]</code> e variáveis <code className="text-emerald-300">{`{{nome}}`}</code> intactas.
          </p>
        </div>
      )}
    </div>
  );
};
