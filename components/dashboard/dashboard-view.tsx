'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { SavedCard } from './saved-card'
import { AddParliamentarianModal } from './add-parliamentarian-modal'
import { EditCollectionModal, NewCollectionModal } from './collection-modals'
import type { Parlamentar } from '@/lib/parliamentarians'

interface Collection {
  id: string
  name: string
  emoji: string
  color?: string
  parliamentarianIds: string[]
  createdAt: number
}

type SortMode = 'nome' | 'partido' | 'uf' | 'mandatos'

interface DashboardViewProps {
  isDark: boolean
  savedParliamentarians: Parlamentar[]
  collections: Collection[]
  activeCollection: string | null
  sortMode: SortMode
  
  // Actions
  onBack: () => void
  onSetActiveCollection: (id: string | null) => void
  onSortChange: (mode: SortMode) => void
  onCreateCollection: (name: string, emoji: string, color: string) => void
  onDeleteCollection: (id: string) => void
  onRenameCollection: (id: string, name: string, color: string) => void
  onAddToCollection: (colId: string, pId: string) => void
  onRemoveFromCollection: (colId: string, pId: string) => void
  onUnsaveParliamentarian: (pId: string) => void
  onOpenProfile: (p: Parlamentar) => void
  
  // Add modal state
  showAddModal: boolean
  onToggleAddModal: () => void
  onToggleSave: (pId: string) => void
  
  // Add modal filters
  addSearch: string
  addFilterPartido: string
  addFilterUF: string
  addFilterTipo: string
  uniqueParties: string[]
  filteredAddModal: Parlamentar[]
  onAddSearchChange: (value: string) => void
  onAddFilterPartidoChange: (value: string) => void
  onAddFilterUFChange: (value: string) => void
  onAddFilterTipoChange: (value: string) => void
}

export function DashboardView({
  isDark,
  savedParliamentarians,
  collections,
  activeCollection,
  sortMode,
  onBack,
  onSetActiveCollection,
  onSortChange,
  onCreateCollection,
  onDeleteCollection,
  onRenameCollection,
  onAddToCollection,
  onRemoveFromCollection,
  onUnsaveParliamentarian,
  onOpenProfile,
  showAddModal,
  onToggleAddModal,
  onToggleSave,
  addSearch,
  addFilterPartido,
  addFilterUF,
  addFilterTipo,
  uniqueParties,
  filteredAddModal,
  onAddSearchChange,
  onAddFilterPartidoChange,
  onAddFilterUFChange,
  onAddFilterTipoChange,
}: DashboardViewProps) {
  // Local state for modals
  const [editingCol, setEditingCol] = useState<string | null>(null)
  const [editColName, setEditColName] = useState('')
  const [editColColor, setEditColColor] = useState('')
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColEmoji, setNewColEmoji] = useState('📌')
  const [newColColor, setNewColColor] = useState('#3B82F6')

  // Sort options
  const SORT_OPTS: { v: SortMode; l: string }[] = [
    { v: 'nome', l: 'A–Z' },
    { v: 'partido', l: 'Partido' },
    { v: 'uf', l: 'Estado' },
    { v: 'mandatos', l: 'Mandatos' },
  ]

  // Filter for active collection
  const visibleParls = (() => {
    let list = activeCollection
      ? (collections.find(c => c.id === activeCollection)?.parliamentarianIds ?? [])
          .map(id => savedParliamentarians.find(p => p.id === id))
          .filter(Boolean) as Parlamentar[]
      : savedParliamentarians
    
    return [...list].sort((a, b) => {
      if (sortMode === 'nome') return a.nomeUrna.localeCompare(b.nomeUrna)
      if (sortMode === 'partido') return a.partido.localeCompare(b.partido)
      if (sortMode === 'uf') return a.uf.localeCompare(b.uf)
      if (sortMode === 'mandatos') return b.mandatos - a.mandatos
      return 0
    })
  })()

  // Colors
  const BG = isDark ? '#0A0A0A' : '#F4F4F0'
  const CARD = isDark ? '#141414' : '#FFFFFF'
  const INK = isDark ? '#F0F0F0' : '#0B1220'
  const MUT = isDark ? '#777' : '#666'
  const BRD = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'
  const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"

  // Toggle collection member
  const toggleMember = (colId: string, pId: string) => {
    const collection = collections.find(c => c.id === colId)
    if (!collection) return
    
    if (collection.parliamentarianIds.includes(pId)) {
      onRemoveFromCollection(colId, pId)
    } else {
      onAddToCollection(colId, pId)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: BG,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: FONT,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          borderBottom: `1px solid ${BRD}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          backdropFilter: 'blur(12px)',
          background: isDark ? 'rgba(10,10,10,0.9)' : 'rgba(244,244,240,0.9)',
          position: 'sticky' as const,
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button
            onClick={onBack}
            style={{
              width: 34,
              height: 34,
              border: `1px solid ${BRD}`,
              borderRadius: 9,
              background: 'transparent',
              color: INK,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
          <div>
            <p style={{ fontSize: 16, fontWeight: 900, color: INK, margin: 0 }}>
              Meu Painel
            </p>
            <p style={{ fontSize: 10, color: MUT, margin: 0 }}>
              {savedParliamentarians.length} parlamentares · {collections.length} coleções
            </p>
          </div>
        </div>
        <button
          onClick={onToggleAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 9,
            border: `1px solid ${INK}`,
            background: 'transparent',
            color: INK,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar parlamentar
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            borderRight: `1px solid ${BRD}`,
            padding: '14px 0',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {/* Favorites button */}
          <button
            onClick={() => onSetActiveCollection(null)}
            style={{
              padding: '8px 14px',
              textAlign: 'left',
              background: activeCollection === null
                ? isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
                : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: INK,
              fontSize: 12,
              fontWeight: activeCollection === null ? 800 : 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 6,
              margin: '0 4px',
            }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span>Favoritos</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: MUT }}>
              {savedParliamentarians.length}
            </span>
          </button>

          {/* Collections list */}
          {collections.length > 0 && (
            <p
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: MUT,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                padding: '10px 14px 3px',
              }}
            >
              Coleções
            </p>
          )}

          {collections.map(col => (
            <div
              key={col.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '0 4px',
                borderRadius: 6,
                background: activeCollection === col.id
                  ? isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)'
                  : 'transparent',
              }}
            >
              <button
                onClick={() => onSetActiveCollection(col.id)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: INK,
                  fontSize: 12,
                  fontWeight: activeCollection === col.id ? 800 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: col.color || '#3B82F6',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.name}
                </span>
                <span style={{ fontSize: 10, color: MUT, flexShrink: 0 }}>
                  {col.parliamentarianIds.length}
                </span>
              </button>
              <button
                onClick={e => {
                  e.stopPropagation()
                  setEditingCol(col.id)
                  setEditColName(col.name)
                  setEditColColor(col.color || '#3B82F6')
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 5,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: MUT,
                  marginRight: 4,
                }}
              >
                <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          ))}

          {/* New collection button */}
          <button
            onClick={() => setAddingCol(true)}
            style={{
              padding: '8px 14px',
              textAlign: 'left',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: MUT,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 4,
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova coleção
          </button>

          {/* Delete collection button */}
          {activeCollection && (
            <div style={{ marginTop: 'auto', padding: '12px 10px 0' }}>
              <button
                onClick={() => onDeleteCollection(activeCollection)}
                style={{
                  padding: '6px 10px',
                  width: '100%',
                  borderRadius: 7,
                  background: 'transparent',
                  border: `1px solid rgba(239,68,68,0.25)`,
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Excluir coleção
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: MUT, textTransform: 'uppercase', letterSpacing: '0.1em', marginRight: 2 }}>
              Ordenar:
            </p>
            {SORT_OPTS.map(o => (
              <button
                key={o.v}
                onClick={() => onSortChange(o.v)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: `1px solid ${sortMode === o.v ? INK : BRD}`,
                  background: sortMode === o.v ? INK : 'transparent',
                  color: sortMode === o.v
                    ? isDark ? '#000' : '#FFF'
                    : MUT,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {o.l}
              </button>
            ))}
          </div>

          {/* Empty state */}
          {visibleParls.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60%',
                gap: 12,
                opacity: 0.5,
              }}
            >
              <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke={INK} strokeWidth="1.5">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <p style={{ fontSize: 14, fontWeight: 700, color: INK }}>
                {activeCollection ? 'Coleção vazia' : 'Nenhum parlamentar salvo'}
              </p>
              <p style={{ fontSize: 11, color: MUT, textAlign: 'center', maxWidth: 240 }}>
                Salve parlamentares clicando no ❤ no perfil deles.
              </p>
              <button
                onClick={() => { onToggleAddModal(); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 8,
                  background: INK,
                  color: isDark ? '#000' : '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Explorar
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gridAutoRows: '320px',
                gap: 14,
              }}
            >
              {visibleParls.map(p => (
                <SavedCard
                  key={p.id}
                  p={p}
                  isDark={isDark}
                  colors={{ CARD, INK, MUT, BRD, BG, FONT }}
                  collections={collections}
                  onRemove={() => onUnsaveParliamentarian(p.id)}
                  onOpen={() => onOpenProfile(p)}
                  onToggleMember={toggleMember}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddParliamentarianModal
        isOpen={showAddModal}
        isDark={isDark}
        search={addSearch}
        filterPartido={addFilterPartido}
        filterUF={addFilterUF}
        filterTipo={addFilterTipo}
        uniqueParties={uniqueParties}
        filteredParliamentarians={filteredAddModal}
        savedIds={savedParliamentarians.map(p => p.id)}
        onClose={onToggleAddModal}
        onSearchChange={onAddSearchChange}
        onFilterPartidoChange={onAddFilterPartidoChange}
        onFilterUFChange={onAddFilterUFChange}
        onFilterTipoChange={onAddFilterTipoChange}
        onToggleSave={onToggleSave}
      />

      <EditCollectionModal
        isOpen={editingCol !== null}
        isDark={isDark}
        collectionName={editColName}
        collectionColor={editColColor}
        onClose={() => setEditingCol(null)}
        onNameChange={setEditColName}
        onColorChange={setEditColColor}
        onSave={() => {
          if (editingCol) {
            onRenameCollection(editingCol, editColName, editColColor)
          }
        }}
        onDelete={() => {
          if (editingCol) {
            onDeleteCollection(editingCol)
            setEditingCol(null)
          }
        }}
      />

      <NewCollectionModal
        isOpen={addingCol}
        isDark={isDark}
        name={newColName}
        emoji={newColEmoji}
        color={newColColor}
        onClose={() => setAddingCol(false)}
        onNameChange={setNewColName}
        onEmojiChange={setNewColEmoji}
        onColorChange={setNewColColor}
        onCreate={() => {
          if (newColName.trim()) {
            onCreateCollection(newColName.trim(), newColEmoji, newColColor)
            setNewColName('')
            setNewColEmoji('📌')
            setNewColColor('#3B82F6')
          }
        }}
      />
    </div>
  )
}
