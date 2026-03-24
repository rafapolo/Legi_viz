'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import type { Parlamentar } from '@/lib/parliamentarians'
import { VIVID_COLORS } from '@/lib/constants/colors'

interface Collection {
  id: string
  name: string
  emoji: string
  color?: string
  parliamentarianIds: string[]
}

interface SavedCardProps {
  p: Parlamentar
  isDark: boolean
  colors: {
    CARD: string
    INK: string
    MUT: string
    BRD: string
    BG: string
    FONT: string
  }
  collections: Collection[]
  
  // Actions
  onRemove: () => void
  onOpen: () => void
  onToggleMember: (colId: string, pId: string) => void
}

export function SavedCard({
  p,
  isDark,
  colors,
  collections,
  onRemove,
  onOpen,
  onToggleMember,
}: SavedCardProps) {
  const [showColPicker, setShowColPicker] = useState(false)
  
  const { CARD, INK, MUT, BRD, BG, FONT } = colors
  const accent = VIVID_COLORS[p.idNumerico % VIVID_COLORS.length]
  const initials = p.nomeUrna.split(' ').map(w => w[0]).slice(0, 2).join('')
  const inCols = collections.filter(col => col.parliamentarianIds.includes(p.id))

  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: CARD,
        border: `1px solid ${BRD}`,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
      }}
    >
      {/* Vivid color banner */}
      <div
        style={{
          height: 80,
          background: accent,
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onClick={onOpen}
      >
        {/* Photo/Initials */}
        <div
          style={{
            position: 'absolute',
            bottom: -18,
            left: 12,
            width: 52,
            height: 52,
            borderRadius: 12,
            background: '#000',
            border: `3px solid ${CARD}`,
            overflow: 'hidden',
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
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>
              {initials}
            </span>
          )}
        </div>

        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'rgba(0,0,0,0.25)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000',
          }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Info section */}
      <div style={{ padding: '24px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Name and party */}
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: INK,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {p.nomeUrna}
          </p>
          <p style={{ fontSize: 10, color: MUT, margin: '2px 0 0' }}>
            {p.partido} · {p.uf} · {p.tipo === 'SENADOR' ? 'Senador(a)' : 'Dep. Federal'}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { l: 'Mand.', v: p.mandatos },
            { l: 'Freq.', v: `${Math.round(p.frequencia * 100)}%` },
            { l: 'Proc.', v: p.processos },
          ].map(({ l, v }) => (
            <div
              key={l}
              style={{
                flex: 1,
                padding: '5px 0',
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderRadius: 7,
                textAlign: 'center' as const,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 900, color: INK, margin: 0 }}>{v}</p>
              <p style={{ fontSize: 7, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Collection tags */}
        {inCols.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {inCols.map(col => (
              <span
                key={col.id}
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 99,
                  background: `${col.color || '#3B82F6'}18`,
                  color: col.color || '#3B82F6',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: 2, background: col.color || '#3B82F6' }} />
                {col.name}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 'auto' }}>
          {/* Collection picker */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColPicker(s => !s)}
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 8,
                background: 'transparent',
                border: `1px solid ${BRD}`,
                color: MUT,
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              Coleção
            </button>
            
            {/* Collection picker dropdown */}
            {showColPicker && collections.length > 0 && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 19 }}
                  onClick={() => setShowColPicker(false)}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: CARD,
                    border: `1px solid ${BRD}`,
                    borderRadius: 10,
                    padding: 6,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  {collections.map(col => (
                    <button
                      key={col.id}
                      onClick={() => { onToggleMember(col.id, p.id); setShowColPicker(false) }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 7,
                        padding: '7px 8px',
                        background: col.parliamentarianIds.includes(p.id)
                          ? `${col.color || '#3B82F6'}12`
                          : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: 7,
                      }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: col.color || '#3B82F6',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 11, color: INK, flex: 1, textAlign: 'left' }}>
                        {col.name}
                      </span>
                      {col.parliamentarianIds.includes(p.id) && (
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={col.color || '#3B82F6'} strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View profile button */}
          <button
            onClick={onOpen}
            style={{
              padding: '7px 0',
              borderRadius: 8,
              background: INK,
              border: 'none',
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 700,
              color: BG,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            Ver perfil
            <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
