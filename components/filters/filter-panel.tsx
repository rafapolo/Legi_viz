'use client'

import React from 'react'
import { X } from 'lucide-react'
import { PARTY_COLORS, UFS, BANCADAS, FAIXAS_ETARIAS, RACAS } from '@/lib/parliamentarians'
import { CLUSTER_OPTIONS } from '@/lib/constants/clusters'
import type { ClusterMode } from '@/components/network-graph'

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  isDark: boolean
  
  // Filter values
  filterPartido: string
  filterUF: string
  filterTipo: string
  filterBancada: string
  filterGenero: string
  filterFaixaEtaria: string
  filterRaca: string
  filterAlinhamento: string
  clusterMode: ClusterMode
  
  // Filter setters
  setFilterPartido: (value: string) => void
  setFilterUF: (value: string) => void
  setFilterTipo: (value: string) => void
  setFilterBancada: (value: string) => void
  setFilterGenero: (value: string) => void
  setFilterFaixaEtaria: (value: string) => void
  setFilterRaca: (value: string) => void
  setFilterAlinhamento: (value: string) => void
  setClusterMode: (mode: ClusterMode) => void
  
  // Actions
  clearFilters: () => void
  hasActiveFilters: boolean
  
  // Data
  uniqueParties: string[]
}

export function FilterPanel({
  isOpen,
  onClose,
  isDark,
  filterPartido,
  filterUF,
  filterTipo,
  filterBancada,
  filterGenero,
  filterFaixaEtaria,
  filterRaca,
  filterAlinhamento,
  clusterMode,
  setFilterPartido,
  setFilterUF,
  setFilterTipo,
  setFilterBancada,
  setFilterGenero,
  setFilterFaixaEtaria,
  setFilterRaca,
  setFilterAlinhamento,
  setClusterMode,
  clearFilters,
  hasActiveFilters,
  uniqueParties,
}: FilterPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 50,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(0,0,0,0.40)',
        }}
        onClick={onClose}
      />
      
      {/* Panel */}
      <div
        className="mx-3 mt-1 rounded-2xl backdrop-blur-xl p-4"
        style={{
          position: 'relative',
          zIndex: 51,
          backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(250,250,250,0.98)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-3"
          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
          <span className="text-sm font-mono font-semibold"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
            Filtros
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Cluster mode - mobile only */}
        <div className="md:hidden mb-4">
          <span className="text-xs font-mono opacity-50 block mb-2">Agrupar por</span>
          <div className="flex flex-wrap gap-1.5">
            {CLUSTER_OPTIONS.map(opt => (
              <button
                key={opt.mode}
                onClick={() => setClusterMode(opt.mode)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono transition-all"
                style={clusterMode === opt.mode ? {
                  backgroundColor: '#3B82F6',
                  color: '#FFFFFF',
                } : {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                  color: isDark ? '#FFFFFF' : '#64748B',
                }}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '12px 16px',
          alignItems: 'start',
        }}>
          {/* Partido */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Partido
            </span>
            <select
              value={filterPartido}
              onChange={e => setFilterPartido(e.target.value)}
              className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: filterPartido
                  ? PARTY_COLORS[filterPartido] || (isDark ? '#FFFFFF' : '#0F172A')
                  : (isDark ? '#FFFFFF' : '#64748B'),
                border: `1px solid ${
                  filterPartido
                    ? PARTY_COLORS[filterPartido] || '#3B82F6'
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                }`,
                minWidth: '110px',
              }}
              aria-label="Filtrar por partido"
            >
              <option value="">Todos</option>
              {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Estado */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Estado
            </span>
            <select
              value={filterUF}
              onChange={e => setFilterUF(e.target.value)}
              className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: isDark ? '#FFFFFF' : '#64748B',
                border: `1px solid ${
                  filterUF ? '#3B82F6' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                }`,
                minWidth: '80px',
              }}
              aria-label="Filtrar por estado"
            >
              <option value="">Todos</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Casa */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Casa
            </span>
            <div className="flex gap-1">
              {[
                { v: '', l: 'Todos' },
                { v: 'DEPUTADO_FEDERAL', l: 'Câmara' },
                { v: 'SENADOR', l: 'Senado' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setFilterTipo(opt.v)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                  style={filterTipo === opt.v ? {
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                  } : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Alinhamento */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Alinhamento
            </span>
            <div className="flex gap-1 flex-wrap">
              {[
                { v: '', l: 'Todos', c: undefined },
                { v: '0', l: 'Oposição', c: '#EF4444' },
                { v: '25', l: 'Neutro', c: '#FACC15' },
                { v: '50', l: 'Alinhado', c: '#3B82F6' },
                { v: '75', l: 'Gov', c: '#22C55E' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setFilterAlinhamento(opt.v)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                  style={filterAlinhamento === opt.v ? {
                    backgroundColor: opt.c || '#3B82F6',
                    color: '#FFFFFF',
                  } : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Bancada */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Bancada
            </span>
            <select
              value={filterBancada}
              onChange={e => setFilterBancada(e.target.value)}
              className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: isDark ? '#FFFFFF' : '#64748B',
                border: `1px solid ${
                  filterBancada ? '#3B82F6' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                }`,
                minWidth: '100px',
              }}
            >
              <option value="">Todas</option>
              {BANCADAS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Gênero */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
            Gênero
            </span>
            <div className="flex gap-1 flex-wrap">
              {[
                { v: '', l: 'Todos', c: '#3B82F6' },
                { v: 'Homem', l: 'Homem Cis', c: '#3B82F6' },
                { v: 'Mulher', l: 'Mulher Cis', c: '#EC4899' },
                { v: 'Trans', l: 'Mulher Trans', c: '#A855F7' },
                { v: 'NaoBinarie', l: 'Não-binárie', c: '#F97316' },
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setFilterGenero(opt.v)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all"
                  style={filterGenero === opt.v ? {
                    backgroundColor: opt.c,
                    color: '#FFFFFF',
                  } : {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    color: isDark ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatos */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Mandatos
            </span>
            <select
              value={filterFaixaEtaria}
              onChange={e => setFilterFaixaEtaria(e.target.value)}
              className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: isDark ? '#FFFFFF' : '#64748B',
                border: `1px solid ${
                  filterFaixaEtaria ? '#3B82F6' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                }`,
                minWidth: '80px',
              }}
            >
              <option value="">Todas</option>
              {FAIXAS_ETARIAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {/* Raça */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-mono"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              Raça
            </span>
            <select
              value={filterRaca}
              onChange={e => setFilterRaca(e.target.value)}
              className="text-xs font-mono rounded-lg px-2.5 py-1.5 outline-none appearance-none"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                color: isDark ? '#FFFFFF' : '#64748B',
                border: `1px solid ${
                  filterRaca ? '#3B82F6' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
                }`,
                minWidth: '90px',
              }}
            >
              <option value="">Todas</option>
              {RACAS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1.5 rounded-lg transition-all ml-auto"
              style={{
                backgroundColor: 'rgba(239,68,68,0.12)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <X size={11} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </>
  )
}
