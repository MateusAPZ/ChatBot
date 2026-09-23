import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, GitBranch, LayoutGrid, Play, Smartphone, MessageSquare, ListTree,
  Flag, FlagOff, Plus, Minus, Crosshair, X, Trash2, Loader2
} from 'lucide-react';
import { apiService } from '../api/client';
import { FluxoBuilderViewModel, NoBuilder } from '../types';
import { useToast } from '../context/ToastContext';

const LARGURA_NO = 256;
const COLUNA = 340;
const LINHA = 230;

export const FlowBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const fluxoId = parseInt(id || '0', 10);
  const { toast } = useToast();

  const [fluxo, setFluxo] = useState<FluxoBuilderViewModel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvandoStatus, setSalvandoStatus] = useState<'salvo' | 'salvando'>('salvo');
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);

  // Canvas Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Linking State
  const [ligacao, setLigacao] = useState<{
    tipo: 'sequencial' | 'opcao';
    origemId: number;
    opcaoId?: number;
  } | null>(null);

  // Editor Form Fields
  const [editorTitulo, setEditorTitulo] = useState('');
  const [editorConteudo, setEditorConteudo] = useState('');
  const [novaOpcaoChave, setNovaOpcaoChave] = useState('');
  const [novaOpcaoDestino, setNovaOpcaoDestino] = useState<string>('novo');

  // Dragging refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const startPanRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const isDraggingNodeRef = useRef<{ id: number; startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const carregarFluxo = useCallback(async () => {
    try {
      const data = await apiService.getFluxo(fluxoId);
      setFluxo(data);
    } catch {
      toast('Não foi possível carregar o fluxo.', 'erro');
    } finally {
      setCarregando(false);
    }
  }, [fluxoId, toast]);

  useEffect(() => {
    carregarFluxo();
  }, [carregarFluxo]);

  const noSelecionado = fluxo?.nos.find(n => n.id === selecionadoId) || null;

  useEffect(() => {
    if (noSelecionado) {
      setEditorTitulo(noSelecionado.titulo || '');
      setEditorConteudo(noSelecionado.conteudo || '');
    }
  }, [selecionadoId, noSelecionado?.conteudo, noSelecionado?.titulo]);

  // Centralizar no nó de início
  const centralizarNoInicio = useCallback(() => {
    if (!fluxo || fluxo.nos.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }
    const inicio = fluxo.nos.find(n => n.ehInicio) || fluxo.nos[0];
    setPan({
      x: 120 - inicio.posX * zoom,
      y: 120 - inicio.posY * zoom
    });
  }, [fluxo, zoom]);

  useEffect(() => {
    if (fluxo && !carregando) {
      centralizarNoInicio();
    }
  }, [carregando]); // eslint-disable-line

  // Renomear fluxo
  const handleRenomear = async (novoNome: string) => {
    if (!novoNome.trim() || !fluxo || novoNome === fluxo.nome) return;
    setSalvandoStatus('salvando');
    try {
      await apiService.renomearFluxo(fluxo.id, novoNome.trim());
      setFluxo(prev => prev ? { ...prev, nome: novoNome.trim() } : null);
      toast('Fluxo renomeado.', 'sucesso');
    } catch {
      toast('Erro ao renomear fluxo.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Definir como padrão
  const handleDefinirPadrao = async () => {
    if (!fluxo) return;
    try {
      await apiService.definirFluxoPadrao(fluxo.id);
      setFluxo(prev => prev ? { ...prev, ehPadrao: true } : null);
      toast('Fluxo publicado como padrão do WhatsApp.', 'sucesso');
    } catch {
      toast('Erro ao publicar fluxo.', 'erro');
    }
  };

  // Adicionar novo bloco
  const handleAdicionarBloco = async (tipo: 'mensagem' | 'menu') => {
    if (!fluxo) return;

    // Calcular posição livre
    const ocupados = fluxo.nos;
    let posX = 120;
    let posY = 140;

    if (ocupados.length > 0) {
      const maiorX = Math.max(...ocupados.map(n => n.posX));
      const naColuna = ocupados.filter(n => Math.abs(n.posX - maiorX) < 10);
      const maiorY = Math.max(...naColuna.map(n => n.posY));

      if (naColuna.length > 2) {
        posX = maiorX + COLUNA;
        posY = 140;
      } else {
        posX = maiorX;
        posY = maiorY + LINHA;
      }
    }

    const conteudo = tipo === 'menu'
      ? 'Escolha uma opção:\n\n1 - Falar com atendente\n2 - Encerrar'
      : 'Digite aqui a mensagem do bot.';
    const titulo = tipo === 'menu' ? 'Menu' : 'Mensagem';

    setSalvandoStatus('salvando');
    try {
      const res = await apiService.criarNo(fluxo.id, { conteudo, posX, posY, titulo });
      setFluxo(res.fluxo);
      setSelecionadoId(res.noId);
      toast('Bloco criado. Edite o texto ao lado.', 'sucesso');
    } catch {
      toast('Erro ao criar bloco.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Salvar texto do nó selecionado
  const handleSalvarTexto = async () => {
    if (!noSelecionado || !fluxo) return;
    if (!editorConteudo.trim()) {
      toast('A mensagem não pode ficar vazia.', 'erro');
      setEditorConteudo(noSelecionado.conteudo);
      return;
    }

    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.atualizarNo(noSelecionado.id, {
        conteudo: editorConteudo.trim(),
        titulo: editorTitulo.trim(),
        fluxoId: fluxo.id
      });
      if (atualizado) setFluxo(atualizado);
      toast('Mensagem salva.', 'sucesso');
    } catch {
      toast('Erro ao salvar mensagem.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Conectar sequencial via editor
  const handleConectarSequencial = async (proximoId: string) => {
    if (!noSelecionado || !fluxo) return;
    const dest = proximoId === '' ? null : parseInt(proximoId, 10);
    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.conectarSequencial({
        origemId: noSelecionado.id,
        destinoId: dest,
        fluxoId: fluxo.id
      });
      if (atualizado) setFluxo(atualizado);
    } catch {
      toast('Erro ao alterar caminho.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Adicionar Opção
  const handleAdicionarOpcao = async () => {
    if (!noSelecionado || !fluxo || !novaOpcaoChave.trim()) {
      toast('Escreva o que o cliente precisa digitar.', 'erro');
      return;
    }

    setSalvandoStatus('salvando');
    try {
      const destId = novaOpcaoDestino === 'novo' ? null : parseInt(novaOpcaoDestino, 10);
      const atualizado = await apiService.criarOpcao(noSelecionado.id, {
        palavraChave: novaOpcaoChave.trim(),
        destinoId: destId,
        conteudoNovoNo: `Resposta para "${novaOpcaoChave.trim()}"`,
        fluxoId: fluxo.id
      });
      if (atualizado) {
        setFluxo(atualizado);
        setNovaOpcaoChave('');
        toast('Caminho criado com sucesso.', 'sucesso');
      }
    } catch {
      toast('Gatilho inválido ou já existente.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Atualizar Opção
  const handleAtualizarOpcao = async (opcaoId: number, palavraChave: string, destinoId: number) => {
    if (!fluxo) return;
    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.atualizarOpcao(opcaoId, {
        palavraChave,
        destinoId,
        fluxoId: fluxo.id
      });
      if (atualizado) setFluxo(atualizado);
    } catch {
      toast('Erro ao atualizar opção.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Excluir Opção
  const handleExcluirOpcao = async (opcaoId: number) => {
    if (!fluxo || !window.confirm('Remover esta opção? O bloco de destino continuará existindo.')) return;
    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.excluirOpcao(opcaoId, fluxo.id);
      if (atualizado) {
        setFluxo(atualizado);
        toast('Opção removida.', 'sucesso');
      }
    } catch {
      toast('Erro ao excluir opção.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Definir como Início
  const handleDefinirInicio = async () => {
    if (!noSelecionado || !fluxo) return;
    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.definirInicio(noSelecionado.id, fluxo.id);
      if (atualizado) {
        setFluxo(atualizado);
        toast('Este bloco agora abre a conversa.', 'sucesso');
      }
    } catch {
      toast('Erro ao definir bloco de início.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Excluir Nó
  const handleExcluirNo = async () => {
    if (!noSelecionado || !fluxo) return;
    if (!window.confirm('Excluir este bloco? As ligações que chegam nele serão desfeitas.')) return;

    setSalvandoStatus('salvando');
    try {
      const atualizado = await apiService.excluirNo(noSelecionado.id, fluxo.id);
      if (atualizado) {
        setFluxo(atualizado);
        setSelecionadoId(null);
        toast('Bloco excluído.', 'sucesso');
      }
    } catch {
      toast('Erro ao excluir bloco.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Auto-organização (Layered Layout)
  const handleOrganizar = async () => {
    if (!fluxo || fluxo.nos.length === 0) return;

    const nos = fluxo.nos;
    const inicio = nos.find(n => n.ehInicio) || nos[0];
    const nivel = new Map<number, number>([[inicio.id, 0]]);
    const fila = [inicio.id];

    while (fila.length > 0) {
      const atualId = fila.shift()!;
      const atual = nos.find(n => n.id === atualId);
      if (!atual) continue;

      const destinos = atual.opcoes.map(o => o.destinoId).filter((id): id is number => id !== null);
      if (atual.proximoId) destinos.push(atual.proximoId);

      destinos.forEach(destId => {
        if (!nivel.has(destId)) {
          nivel.set(destId, (nivel.get(atualId) || 0) + 1);
          fila.push(destId);
        }
      });
    }

    const maiorNivel = Math.max(0, ...Array.from(nivel.values()));
    nos.forEach(n => {
      if (!nivel.has(n.id)) nivel.set(n.id, maiorNivel + 1);
    });

    const porColuna = new Map<number, number>();
    const posicoes: { noId: number; posX: number; posY: number }[] = [];

    const novosNos = nos.map(n => ({ ...n }));
    novosNos.sort((a, b) => (nivel.get(a.id) || 0) - (nivel.get(b.id) || 0) || a.id - b.id);

    novosNos.forEach(n => {
      const coluna = nivel.get(n.id) || 0;
      const linha = porColuna.get(coluna) || 0;
      porColuna.set(coluna, linha + 1);

      n.posX = 120 + coluna * COLUNA;
      n.posY = 120 + linha * LINHA;
      posicoes.push({ noId: n.id, posX: n.posX, posY: n.posY });
    });

    setFluxo(prev => prev ? { ...prev, nos: novosNos } : null);
    centralizarNoInicio();

    setSalvandoStatus('salvando');
    try {
      await apiService.salvarPosicoes(posicoes);
      toast('Mapa organizado automaticamente.', 'sucesso');
    } catch {
      toast('Não foi possível salvar a nova organização.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Modo Ligação
  const iniciarLigacao = (tipo: 'sequencial' | 'opcao', origemId: number, opcaoId?: number) => {
    setLigacao({ tipo, origemId, opcaoId });
  };

  const cancelarLigacao = () => {
    setLigacao(null);
  };

  const concluirLigacao = async (destinoId: number) => {
    if (!ligacao || !fluxo || ligacao.origemId === destinoId) {
      cancelarLigacao();
      return;
    }

    const { tipo, origemId, opcaoId } = ligacao;
    cancelarLigacao();

    setSalvandoStatus('salvando');
    try {
      if (tipo === 'sequencial') {
        const atualizado = await apiService.conectarSequencial({ origemId, destinoId, fluxoId: fluxo.id });
        if (atualizado) setFluxo(atualizado);
        toast('Blocos ligados.', 'sucesso');
      } else if (tipo === 'opcao' && opcaoId) {
        const origem = fluxo.nos.find(n => n.id === origemId);
        const opcao = origem?.opcoes.find(o => o.id === opcaoId);
        if (opcao) {
          const atualizado = await apiService.atualizarOpcao(opcao.id, {
            palavraChave: opcao.palavraChave,
            destinoId,
            fluxoId: fluxo.id
          });
          if (atualizado) setFluxo(atualizado);
          toast('Caminho da opção atualizado.', 'sucesso');
        }
      }
    } catch {
      toast('Erro ao conectar blocos.', 'erro');
    } finally {
      setSalvandoStatus('salvo');
    }
  };

  // Mouse e Canvas Pan & Drag
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-drag-header]')) return;
    if ((e.target as HTMLElement).closest('[data-no-pan]')) return;

    if (ligacao) {
      cancelarLigacao();
      return;
    }

    isPanningRef.current = true;
    startPanRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseDownNode = (e: React.MouseEvent, no: NoBuilder) => {
    e.stopPropagation();
    if (ligacao) return;

    isDraggingNodeRef.current = {
      id: no.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: no.posX,
      origY: no.posY,
      moved: false
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingNodeRef.current) {
      const { id, startX, startY, origX, origY } = isDraggingNodeRef.current;
      const dx = (e.clientX - startX) / zoom;
      const dy = (e.clientY - startY) / zoom;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        isDraggingNodeRef.current.moved = true;
      }

      const novaX = Math.max(0, origX + dx);
      const novaY = Math.max(0, origY + dy);

      setFluxo(prev => {
        if (!prev) return null;
        return {
          ...prev,
          nos: prev.nos.map(n => n.id === id ? { ...n, posX: novaX, posY: novaY } : n)
        };
      });
      return;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - startPanRef.current.x;
      const dy = e.clientY - startPanRef.current.y;
      setPan({
        x: startPanRef.current.panX + dx,
        y: startPanRef.current.panY + dy
      });
    }
  };

  const handleMouseUp = async () => {
    if (isDraggingNodeRef.current) {
      const { id, moved } = isDraggingNodeRef.current;
      isDraggingNodeRef.current = null;

      if (moved && fluxo) {
        const no = fluxo.nos.find(n => n.id === id);
        if (no) {
          setSalvandoStatus('salvando');
          try {
            await apiService.salvarPosicao(id, Math.round(no.posX), Math.round(no.posY));
          } catch {
            console.error('Erro ao salvar posição');
          } finally {
            setSalvandoStatus('salvo');
          }
        }
      }
    }

    if (isPanningRef.current) {
      isPanningRef.current = false;
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(prev => Math.min(1.6, Math.max(0.4, Math.round((prev + delta) * 100) / 100)));
  };

  // Tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ligacao) cancelarLigacao();
        else setSelecionadoId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ligacao]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0f13]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!fluxo) {
    return (
      <div className="p-8 text-center bg-[#0d0f13] min-h-screen text-gray-300">
        <p>Fluxo não encontrado.</p>
        <Link to="/fluxos" className="text-emerald-400 underline mt-2 inline-block">Voltar aos fluxos</Link>
      </div>
    );
  }

  // Estilo visual por tipo de nó
  const getEstiloDoTipo = (no: NoBuilder) => {
    if (no.ehInicio) return { cor: 'text-emerald-400', fundo: 'bg-emerald-500/10', borda: 'border-emerald-500/20', icone: Flag, rotulo: 'Início' };
    if (no.opcoes.length > 0) return { cor: 'text-amber-400', fundo: 'bg-amber-500/10', borda: 'border-amber-500/20', icone: ListTree, rotulo: 'Menu' };
    if (no.proximoId) return { cor: 'text-sky-400', fundo: 'bg-sky-500/10', borda: 'border-sky-500/20', icone: MessageSquare, rotulo: 'Mensagem' };
    return { cor: 'text-rose-400', fundo: 'bg-rose-500/10', borda: 'border-rose-500/20', icone: FlagOff, rotulo: 'Fim' };
  };

  return (
    <div className="bg-[#0d0f13] text-gray-200 h-screen flex flex-col overflow-hidden antialiased select-none">
      {/* TOPO */}
      <header className="h-14 shrink-0 border-b border-white/5 bg-[#11141a] px-4 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/fluxos"
            className="w-8 h-8 rounded-lg border border-white/10 hover:bg-white/5 flex items-center justify-center text-gray-400 transition"
            title="Voltar para a lista"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="w-8 h-8 rounded-lg bg-emerald-500 text-[#0d0f13] flex items-center justify-center shrink-0">
            <GitBranch className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <input
              value={fluxo.nome}
              onChange={(e) => setFluxo({ ...fluxo, nome: e.target.value })}
              onBlur={(e) => handleRenomear(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              maxLength={80}
              className="bg-transparent text-sm font-semibold text-white w-full max-w-xs truncate border border-transparent hover:border-white/10 focus:border-emerald-500/50 rounded px-2 py-0.5 focus:outline-none transition"
            />
            <div className="px-2 flex items-center gap-2 text-[11px] text-gray-500">
              <span>{fluxo.nos.length} {fluxo.nos.length === 1 ? 'passo' : 'passos'}</span>
              <span>·</span>
              <span className={salvandoStatus === 'salvando' ? 'text-amber-400/80' : 'text-gray-600'}>
                {salvandoStatus === 'salvando' ? 'salvando...' : 'tudo salvo'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fluxo.ehPadrao ? (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
              <Smartphone className="w-3 h-3" /> Publicado no WhatsApp
            </span>
          ) : (
            <button
              type="button"
              onClick={handleDefinirPadrao}
              className="hidden md:inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-gray-300 transition"
            >
              <Smartphone className="w-3.5 h-3.5" /> Publicar no WhatsApp
            </button>
          )}

          <button
            type="button"
            onClick={handleOrganizar}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/5 text-gray-300 transition"
            title="Reorganizar os blocos automaticamente"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Organizar
          </button>

          <Link
            to={`/simulador?fluxoId=${fluxo.id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] transition"
          >
            <Play className="w-3.5 h-3.5" /> Testar bot
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* PALETA LATERAL ESQUERDA */}
        <aside className="w-56 shrink-0 border-r border-white/5 bg-[#11141a] p-3 flex flex-col gap-4 overflow-y-auto z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-1 mb-2">Adicionar bloco</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleAdicionarBloco('mensagem')}
                className="w-full text-left flex items-center gap-3 p-2.5 bg-[#161a22] hover:bg-[#1b202a] border border-white/5 hover:border-white/10 rounded-xl transition"
              >
                <span className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-xs font-medium block text-gray-200">Mensagem</span>
                  <span className="text-[10px] text-gray-500 block">Só envia um texto</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleAdicionarBloco('menu')}
                className="w-full text-left flex items-center gap-3 p-2.5 bg-[#161a22] hover:bg-[#1b202a] border border-white/5 hover:border-white/10 rounded-xl transition"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                  <ListTree className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="text-xs font-medium block text-gray-200">Menu de opções</span>
                  <span className="text-[10px] text-gray-500 block">Pergunta e ramifica</span>
                </span>
              </button>
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-1 mb-2">Legenda</p>
            <ul className="space-y-2 text-[11px] text-gray-500 px-1">
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Bloco de início</li>
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> Caminho automático</li>
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Caminho por opção</li>
              <li className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fim da conversa</li>
            </ul>
          </div>

          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 px-1 mb-2">Atalhos</p>
            <ul className="space-y-1.5 text-[11px] text-gray-500 px-1 leading-relaxed">
              <li>Arraste o fundo para mover o mapa</li>
              <li>Ctrl + rolagem para zoom</li>
              <li>Clique na bolinha de saída e depois no destino para ligar</li>
              <li><kbd className="px-1 py-0.5 bg-white/5 rounded border border-white/10">Esc</kbd> cancela a ligação</li>
            </ul>
          </div>
        </aside>

        {/* CANVAS PRINCIPAL */}
        <main
          ref={canvasRef}
          onMouseDown={handleMouseDownCanvas}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 canvas-grid relative overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{
              width: '6000px',
              height: '4000px',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }}
          >
            {/* SVG DE CONEXÕES */}
            <svg width="6000" height="4000" className="absolute top-0 left-0 pointer-events-none">
              <defs>
                <marker id="seta-azul" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <marker id="seta-ambar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                </marker>
              </defs>

              {fluxo.nos.map(no => {
                if (no.opcoes.length > 0) {
                  return no.opcoes.map((op, idx) => {
                    if (!op.destinoId) return null;
                    const dest = fluxo.nos.find(n => n.id === op.destinoId);
                    if (!dest) return null;

                    const x1 = no.posX + LARGURA_NO + 6;
                    const y1 = no.posY + 70 + (idx * 34) + 16;
                    const x2 = dest.posX - 8;
                    const y2 = dest.posY + 38;
                    const curva = Math.max(60, Math.abs(x2 - x1) * 0.45);

                    return (
                      <path
                        key={`op-${op.id}`}
                        d={`M ${x1} ${y1} C ${x1 + curva} ${y1}, ${x2 - curva} ${y2}, ${x2} ${y2}`}
                        stroke="#fbbf24"
                        strokeWidth="2"
                        fill="none"
                        opacity="0.75"
                        markerEnd="url(#seta-ambar)"
                      />
                    );
                  });
                } else if (no.proximoId) {
                  const dest = fluxo.nos.find(n => n.id === no.proximoId);
                  if (!dest) return null;

                  const x1 = no.posX + LARGURA_NO + 6;
                  const y1 = no.posY + 86;
                  const x2 = dest.posX - 8;
                  const y2 = dest.posY + 38;
                  const curva = Math.max(60, Math.abs(x2 - x1) * 0.45);

                  return (
                    <path
                      key={`seq-${no.id}`}
                      d={`M ${x1} ${y1} C ${x1 + curva} ${y1}, ${x2 - curva} ${y2}, ${x2} ${y2}`}
                      stroke="#38bdf8"
                      strokeWidth="2"
                      fill="none"
                      opacity="0.75"
                      markerEnd="url(#seta-azul)"
                    />
                  );
                }
                return null;
              })}
            </svg>

            {/* NÓS DO FLUXO */}
            <div className="pointer-events-auto">
              {fluxo.nos.map(no => {
                const tipo = getEstiloDoTipo(no);
                const Icone = tipo.icone;
                const titulo = no.titulo && no.titulo.trim() ? no.titulo : `Passo #${no.id}`;
                const isSelected = selecionadoId === no.id;
                const isTargetCandidate = ligacao && ligacao.origemId !== no.id;

                return (
                  <div
                    key={no.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (ligacao) {
                        concluirLigacao(no.id);
                      } else {
                        setSelecionadoId(no.id);
                      }
                    }}
                    className={`no absolute w-64 bg-[#151922] border border-white/10 rounded-xl shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] overflow-visible select-none transition-shadow ${
                      isSelected ? 'node-ativo' : ''
                    } ${isTargetCandidate ? 'node-alvo' : ''}`}
                    style={{ left: `${no.posX}px`, top: `${no.posY}px` }}
                  >
                    {/* Cabeçalho arrastável */}
                    <div
                      data-drag-header="true"
                      onMouseDown={(e) => handleMouseDownNode(e, no)}
                      className={`cabecalho cursor-grab active:cursor-grabbing flex items-center justify-between gap-2 px-3 py-2 border-b ${tipo.borda} ${tipo.fundo} rounded-t-xl`}
                    >
                      <div className={`flex items-center gap-2 min-w-0 ${tipo.cor}`}>
                        <Icone className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{titulo}</span>
                      </div>
                      <span className={`text-[10px] ${tipo.cor} opacity-70 shrink-0`}>{tipo.rotulo}</span>
                    </div>

                    {/* Conteúdo */}
                    <div className="p-2.5 space-y-2">
                      <div className="text-[11px] leading-relaxed text-gray-300 bg-[#0f1218] border border-white/5 rounded-lg p-2 whitespace-pre-wrap break-words max-h-24 overflow-hidden">
                        {no.conteudo || <span className="text-gray-600">(sem texto)</span>}
                      </div>

                      {/* Saídas */}
                      <div className="space-y-1.5" data-no-pan="true">
                        {no.opcoes.length > 0 ? (
                          no.opcoes.map(opcao => (
                            <div
                              key={opcao.id}
                              className="saida relative flex items-center justify-between gap-2 bg-[#0f1218] border border-white/5 rounded-lg px-2 py-1.5 text-[11px]"
                            >
                              <span className="truncate text-gray-300">{opcao.palavraChave}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  iniciarLigacao('opcao', no.id, opcao.id);
                                }}
                                className="dot w-3 h-3 rounded-full bg-amber-400 hover:ring-2 hover:ring-amber-400/40 shrink-0 translate-x-3.5 transition"
                                title="Ligar esta opção a outro bloco"
                              />
                            </div>
                          ))
                        ) : no.proximoId ? (
                          <div className="saida relative flex items-center justify-between gap-2 bg-[#0f1218] border border-white/5 rounded-lg px-2 py-1.5 text-[11px]">
                            <span className="text-gray-500">Segue automaticamente</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                iniciarLigacao('sequencial', no.id);
                              }}
                              className="dot w-3 h-3 rounded-full bg-sky-400 hover:ring-2 hover:ring-sky-400/40 shrink-0 translate-x-3.5 transition"
                              title="Ligar a outro bloco"
                            />
                          </div>
                        ) : (
                          <div className="saida relative flex items-center justify-between gap-2 bg-rose-500/5 border border-rose-500/10 rounded-lg px-2 py-1.5 text-[11px]">
                            <span className="text-rose-400/80">Conversa termina aqui</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                iniciarLigacao('sequencial', no.id);
                              }}
                              className="dot w-3 h-3 rounded-full bg-rose-500/60 hover:ring-2 hover:ring-rose-400/40 shrink-0 translate-x-3.5 transition"
                              title="Ligar a outro bloco"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ponto de entrada */}
                    <span className="entrada absolute left-0 top-8 -translate-x-1.5 w-3 h-3 rounded-full bg-white/20 border-2 border-[#151922]" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aviso do modo ligação */}
          {ligacao && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs px-4 py-2 rounded-lg shadow-lg z-30">
              Clique no bloco de destino · <kbd className="px-1 bg-black/30 rounded">Esc</kbd> para cancelar
            </div>
          )}

          {/* Controles de Zoom */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-[#161a22] border border-white/10 rounded-lg p-1 shadow-lg z-30">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.4, Math.round((prev - 0.1) * 10) / 10))}
              className="w-7 h-7 rounded-md hover:bg-white/5 text-gray-400 flex items-center justify-center transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-gray-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(1.6, Math.round((prev + 0.1) * 10) / 10))}
              className="w-7 h-7 rounded-md hover:bg-white/5 text-gray-400 flex items-center justify-center transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button
              type="button"
              onClick={centralizarNoInicio}
              className="w-7 h-7 rounded-md hover:bg-white/5 text-gray-400 flex items-center justify-center transition"
              title="Centralizar no início"
            >
              <Crosshair className="w-3.5 h-3.5" />
            </button>
          </div>
        </main>

        {/* EDITOR LATERAL DIREITO */}
        <aside className="w-80 shrink-0 border-l border-white/5 bg-[#11141a] flex flex-col overflow-hidden z-10">
          {!noSelecionado ? (
            <div className="flex-1 flex items-center justify-center p-6 text-center">
              <div>
                <span className="inline-flex w-12 h-12 rounded-xl bg-white/5 text-gray-600 items-center justify-center mb-3">
                  <GitBranch className="w-5 h-5" />
                </span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Clique em um bloco do mapa<br />para editar o que o bot diz.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Header do editor */}
              <div className="h-12 shrink-0 px-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-6 h-6 rounded-md ${getEstiloDoTipo(noSelecionado).fundo} ${getEstiloDoTipo(noSelecionado).cor} flex items-center justify-center shrink-0`}>
                    {React.createElement(getEstiloDoTipo(noSelecionado).icone, { className: 'w-3.5 h-3.5' })}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 truncate">
                    {getEstiloDoTipo(noSelecionado).rotulo}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelecionadoId(null)}
                  className="text-gray-600 hover:text-gray-300 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Corpo do formulário de edição */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
                    Nome do bloco
                  </label>
                  <input
                    type="text"
                    value={editorTitulo}
                    onChange={(e) => setEditorTitulo(e.target.value)}
                    onBlur={handleSalvarTexto}
                    maxLength={60}
                    placeholder="Ex: Boas-vindas"
                    className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                      Mensagem enviada
                    </label>
                    <span className="text-[10px] text-gray-600">*negrito* _itálico_</span>
                  </div>
                  <textarea
                    rows={6}
                    value={editorConteudo}
                    onChange={(e) => setEditorConteudo(e.target.value)}
                    onBlur={handleSalvarTexto}
                    placeholder="Digite o texto que o bot vai enviar..."
                    className="w-full bg-[#161a22] border border-white/10 rounded-lg p-3 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-gray-600">Salva ao sair do campo</span>
                    <button
                      type="button"
                      onClick={handleSalvarTexto}
                      className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Salvar agora
                    </button>
                  </div>
                </div>

                {/* Caminho sequencial (se não tiver opções de menu) */}
                {noSelecionado.opcoes.length === 0 && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 block mb-1.5">
                      Depois desta mensagem
                    </label>
                    <select
                      value={noSelecionado.proximoId || ''}
                      onChange={(e) => handleConectarSequencial(e.target.value)}
                      className="w-full bg-[#161a22] border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="">— Encerrar conversa —</option>
                      {fluxo.nos
                        .filter(n => n.id !== noSelecionado.id)
                        .map(n => (
                          <option key={n.id} value={n.id}>
                            #{n.id} · {n.titulo || n.conteudo.slice(0, 28)}
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed">
                      Encerrar significa que a conversa termina aqui. Com um bloco escolhido, o bot envia as duas mensagens seguidas.
                    </p>
                  </div>
                )}

                {/* Opções de menu */}
                <div className="border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600">
                      Opções de resposta
                    </label>
                    <span className="text-[10px] text-gray-600">
                      {noSelecionado.opcoes.length ? `${noSelecionado.opcoes.length} caminho(s)` : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {noSelecionado.opcoes.map(opcao => (
                      <div key={opcao.id} className="bg-[#161a22] border border-white/5 rounded-xl p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            defaultValue={opcao.palavraChave}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && val !== opcao.palavraChave && opcao.destinoId) {
                                handleAtualizarOpcao(opcao.id, val, opcao.destinoId);
                              }
                            }}
                            maxLength={40}
                            className="flex-1 bg-[#0f1218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                          />
                          <button
                            type="button"
                            onClick={() => handleExcluirOpcao(opcao.id)}
                            className="p-1.5 rounded-md text-gray-600 hover:text-rose-400 hover:bg-white/5 transition"
                            title="Excluir opção"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <select
                          value={opcao.destinoId || ''}
                          onChange={(e) => handleAtualizarOpcao(opcao.id, opcao.palavraChave, parseInt(e.target.value, 10))}
                          className="w-full bg-[#0f1218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                        >
                          {fluxo.nos
                            .filter(n => n.id !== noSelecionado.id)
                            .map(n => (
                              <option key={n.id} value={n.id}>
                                #{n.id} · {n.titulo || n.conteudo.slice(0, 28)}
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  {/* Adicionar nova opção */}
                  <div className="mt-3 bg-[#161a22] border border-white/5 rounded-xl p-3 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Nova opção</p>
                    <input
                      type="text"
                      value={novaOpcaoChave}
                      onChange={(e) => setNovaOpcaoChave(e.target.value)}
                      maxLength={40}
                      placeholder="O que o cliente digita (ex: 1, sim, suporte)"
                      className="w-full bg-[#0f1218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-emerald-500/50"
                    />
                    <select
                      value={novaOpcaoDestino}
                      onChange={(e) => setNovaOpcaoDestino(e.target.value)}
                      className="w-full bg-[#0f1218] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500/50"
                    >
                      <option value="novo">➕ Criar um bloco novo</option>
                      {fluxo.nos
                        .filter(n => n.id !== noSelecionado.id)
                        .map(n => (
                          <option key={n.id} value={n.id}>
                            #{n.id} · {n.titulo || n.conteudo.slice(0, 28)}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAdicionarOpcao}
                      className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-[#0d0f13] rounded-lg text-xs font-semibold transition"
                    >
                      Adicionar caminho
                    </button>
                  </div>
                </div>
              </div>

              {/* Ações inferiores */}
              <div className="shrink-0 border-t border-white/5 p-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDefinirInicio}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-gray-300 transition"
                >
                  <Flag className="w-3.5 h-3.5" /> Marcar como início
                </button>
                <button
                  type="button"
                  onClick={handleExcluirNo}
                  className="inline-flex items-center justify-center p-2 rounded-lg border border-white/10 text-gray-500 hover:text-rose-400 hover:border-rose-500/30 transition"
                  title="Excluir bloco"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
