'use client'

import React from 'react'
import { X } from 'lucide-react'

interface EditCollectionModalProps {
  isOpen: boolean
  isDark: boolean
  collectionName: string
  collectionColor: string
  
  // Actions
  onClose: () => void
  onNameChange: (value: string) => void
  onColorChange: (value: string) => void
  onSave: () => void
  onDelete: () => void
}

const COLOR_SWATCHES = [
  '#3B82F6', '#EF4444', '#22C55E', '#FACC15',
  '#A855F7', '#F97316', '#EC4899', '#14B8A6',
  '#64748B', '#FB923C', '#C8F752', '#38BDF8',
]

export function EditCollectionModal({
  isOpen,
  isDark,
  collectionName,
  collectionColor,
  onClose,
  onNameChange,
  onColorChange,
  onSave,
  onDelete,
}: EditCollectionModalProps) {
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
        zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          borderRadius: 20,
          padding: 28,
          maxWidth: 360,
          width: '100%',
          border: `1px solid ${BRD}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: INK, margin: 0 }}>
            Editar coleção
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Name input */}
        <input
          value={collectionName}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              onSave()
              onClose()
            }
          }}
          autoFocus
          placeholder="Nome da coleção"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1.5px solid ${BRD}`,
            background: 'transparent',
            color: INK,
            fontFamily: FONT,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box' as const,
            marginBottom: 16,
          }}
        />

        {/* Color picker label */}
        <p style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Cor
        </p>

        {/* Color swatches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {COLOR_SWATCHES.map(sw => (
            <button
              key={sw}
              onClick={() => onColorChange(sw)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: sw,
                border: collectionColor === sw ? `3px solid ${INK}` : '3px solid transparent',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { onSave(); onClose() }}
            style={{
              flex: 1,
              padding: '11px',
              borderRadius: 10,
              background: INK,
              color: isDark ? '#000' : '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONT,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Salvar
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: '11px 16px',
              borderRadius: 10,
              background: 'transparent',
              color: '#EF4444',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: FONT,
              border: `1px solid rgba(239,68,68,0.3)`,
              cursor: 'pointer',
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

interface NewCollectionModalProps {
  isOpen: boolean
  isDark: boolean
  name: string
  emoji: string
  color: string
  
  // Actions
  onClose: () => void
  onNameChange: (value: string) => void
  onEmojiChange: (value: string) => void
  onColorChange: (value: string) => void
  onCreate: () => void
}

const EMOJI_OPTIONS = ['📌', '⭐', '🔍', '💡', '🗂️', '🎯', '📊', '🏛️', '⚡', '🌱']

export function NewCollectionModal({
  isOpen,
  isDark,
  name,
  emoji,
  color,
  onClose,
  onNameChange,
  onEmojiChange,
  onColorChange,
  onCreate,
}: NewCollectionModalProps) {
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
        zIndex: 300,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          borderRadius: 20,
          padding: 28,
          maxWidth: 380,
          width: '100%',
          border: `1px solid ${BRD}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <p style={{ fontSize: 15, fontWeight: 900, color: INK, margin: 0 }}>
            Nova coleção
          </p>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUT }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Name input */}
        <input
          value={name}
          onChange={e => onNameChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) {
              onCreate()
              onClose()
            }
          }}
          autoFocus
          placeholder="Nome da coleção"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            border: `1.5px solid ${BRD}`,
            background: 'transparent',
            color: INK,
            fontFamily: FONT,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box' as const,
            marginBottom: 16,
          }}
        />

        {/* Emoji picker */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
          {EMOJI_OPTIONS.map(e => (
            <button
              key={e}
              onClick={() => onEmojiChange(e)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                border: `2px solid ${emoji === e ? INK : BRD}`,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Color picker label */}
        <p style={{ fontSize: 10, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          Cor
        </p>

        {/* Color swatches */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {COLOR_SWATCHES.map(sw => (
            <button
              key={sw}
              onClick={() => onColorChange(sw)}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: sw,
                border: color === sw ? `3px solid ${INK}` : '3px solid transparent',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Create button */}
        <button
          onClick={() => {
            if (name.trim()) {
              onCreate()
              onClose()
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 10,
            background: INK,
            color: isDark ? '#000' : '#FFFFFF',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Criar coleção
        </button>
      </div>
    </div>
  )
}
