'use client'

import React from 'react'
import { X } from 'lucide-react'
import { UFS } from '@/lib/parliamentarians'
import type { Parlamentar } from '@/lib/parliamentarians'
import { VIVID_COLORS } from '@/lib/constants/colors'

interface AddParliamentarianModalProps {
  isOpen: boolean
  isDark: boolean
  search: string
  filterPartido: string
  filterUF: string
  filterTipo: string
  uniqueParties: string[]
  filteredParliamentarians: Parlamentar[]
  savedIds: string[]
  
  // Actions
  onClose: () => void
  onSearchChange: (value: string) => void
  onFilterPartidoChange: (value: string) => void
  onFilterUFChange: (value: string) => void
  onFilterTipoChange: (value: string) => void
  onToggleSave: (id: string) => void
}

export function AddParliamentarianModal({
  isOpen,
  isDark,
  search,
  filterPartido,
  filterUF,
  filterTipo,
  uniqueParties,
  filteredParliamentarians,
  savedIds,
  onClose,
  onSearchChange,
  onFilterPartidoChange,
  onFilterUFChange,
  onFilterTipoChange,
  onToggleSave,
}: AddParliamentarianModalProps) {
  if (!isOpen) return null

  const CARD = isDark ? '#141414' : '#FFFFFF'
  const INK = isDark ? '#F0F0F0' : '#0B1220'
  const MUT = isDark ? '#777' : '#666'
  const BRD = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          borderRadius: 20,
          width: '100%',
          maxWidth: 520,
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${BRD}`,
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${BRD}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 900, color: INK, margin: 0 }}>
              Adicionar parlamentar
            </p>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 140 }}>
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke={MUT}
                strokeWidth="2"
                style={{
                  position: 'absolute',
                  left: 9,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Buscar por nome..."
                style={{
                  width: '100%',
                  padding: '7px 10px 7px 28px',
                  borderRadius: 8,
                  border: `1px solid ${BRD}`,
                  background: 'transparent',
                  color: INK,
                  fontFamily: FONT,
                  fontSize: 11,
                  outline: 'none',
                  boxSizing: 'border-box' as const,
                }}
              />
            </div>

            {/* Party filter */}
            <select
              value={filterPartido}
              onChange={e => onFilterPartidoChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: `1px solid ${BRD}`,
                background: CARD,
                color: INK,
                fontFamily: FONT,
                fontSize: 11,
                outline: 'none',
              }}
            >
              <option value="">Partido</option>
              {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* UF filter */}
            <select
              value={filterUF}
              onChange={e => onFilterUFChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: `1px solid ${BRD}`,
                background: CARD,
                color: INK,
                fontFamily: FONT,
                fontSize: 11,
                outline: 'none',
              }}
            >
              <option value="">Estado</option>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Type filter */}
            <select
              value={filterTipo}
              onChange={e => onFilterTipoChange(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: 8,
                border: `1px solid ${BRD}`,
                background: CARD,
                color: INK,
                fontFamily: FONT,
                fontSize: 11,
                outline: 'none',
              }}
            >
              <option value="">Câmara/Senado</option>
              <option value="DEPUTADO_FEDERAL">Câmara</option>
              <option value="SENADOR">Senado</option>
            </select>
          </div>

          <p style={{ fontSize: 10, color: MUT, margin: '8px 0 0' }}>
            {filteredParliamentarians.length} parlamentares
          </p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredParliamentarians.slice(0, 80).map(p => {
            const isSaved = savedIds.includes(p.id)
            const accent = VIVID_COLORS[p.idNumerico % VIVID_COLORS.length]
            const initials = p.nomeUrna.split(' ').map(w => w[0]).slice(0, 2).join('')

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 11,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: `1px solid ${isSaved ? accent : BRD}`,
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Photo */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 9,
                    background: accent,
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.urlFoto ? (
                    <img
                      src={p.urlFoto}
                      alt={p.nomeUrna}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#000' }}>
                      {initials}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: INK, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nomeUrna}
                  </p>
                  <p style={{ fontSize: 9, color: MUT, margin: '1px 0 0' }}>
                    {p.tipo === 'SENADOR' ? 'Senador(a)' : 'Dep. Federal'} · {p.partido} · {p.uf}
                  </p>
                </div>

                {/* Save toggle */}
                <button
                  onClick={() => onToggleSave(p.id)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isSaved ? accent : 'transparent',
                    border: `1px solid ${isSaved ? accent : BRD}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                >
                  {isSaved ? (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
              </div>
            )
          })}

          {filteredParliamentarians.length > 80 && (
            <p style={{ fontSize: 10, color: MUT, textAlign: 'center', padding: 8 }}>
              Use os filtros para refinar os resultados ({filteredParliamentarians.length} total)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
