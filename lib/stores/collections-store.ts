/**
 * Collections Store - Manages saved parliamentarians and collections
 * Uses Zustand for global state management with localStorage persistence
 */

import { create } from 'zustand'
import type { Parlamentar } from '@/lib/parliamentarians'

export interface Collection {
  id: string
  name: string
  emoji: string
  color?: string
  parliamentarianIds: string[]
  createdAt: number
}

export interface CollectionsState {
  // Data
  savedIds: string[]
  collections: Collection[]
  activeCollection: string | null
  
  // Actions - Saved parliamentarians
  saveParliamentarian: (id: string) => void
  unsaveParliamentarian: (id: string) => void
  isSaved: (id: string) => boolean
  
  // Actions - Collections
  createCollection: (name: string, emoji: string, color: string) => void
  deleteCollection: (id: string) => void
  renameCollection: (id: string, name: string, color: string) => void
  addToCollection: (colId: string, pId: string) => void
  removeFromCollection: (colId: string, pId: string) => void
  setActiveCollection: (id: string | null) => void
  
  // Persistence
  loadFromStorage: () => void
  persistToStorage: () => void
}

const STORAGE_KEYS = {
  SAVED_PREFIX: 'legi-viz-saved-',
  COLLECTIONS: 'legi-viz-collections',
} as const

export const useCollectionsStore = create<CollectionsState>((set, get) => ({
  // Initial state
  savedIds: [],
  collections: [],
  activeCollection: null,
  
  // Saved parliamentarians actions
  saveParliamentarian: (id) => {
    set((state) => ({
      savedIds: [...state.savedIds, id],
    }))
    localStorage.setItem(`${STORAGE_KEYS.SAVED_PREFIX}${id}`, '1')
  },
  
  unsaveParliamentarian: (id) => {
    set((state) => ({
      savedIds: state.savedIds.filter(x => x !== id),
      collections: state.collections.map(c => ({
        ...c,
        parliamentarianIds: c.parliamentarianIds.filter(x => x !== id),
      })),
    }))
    localStorage.removeItem(`${STORAGE_KEYS.SAVED_PREFIX}${id}`)
  },
  
  isSaved: (id) => get().savedIds.includes(id),
  
  // Collections actions
  createCollection: (name, emoji, color) => {
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      emoji,
      color,
      parliamentarianIds: [],
      createdAt: Date.now(),
    }
    
    set((state) => {
      const collections = [...state.collections, newCollection]
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
      return { collections }
    })
  },
  
  deleteCollection: (id) => {
    set((state) => {
      const collections = state.collections.filter(c => c.id !== id)
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
      return {
        collections,
        activeCollection: state.activeCollection === id ? null : state.activeCollection,
      }
    })
  },
  
  renameCollection: (id, name, color) => {
    set((state) => {
      const collections = state.collections.map(c =>
        c.id === id ? { ...c, name: name.trim() || c.name, color } : c
      )
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
      return { collections }
    })
  },
  
  addToCollection: (colId, pId) => {
    set((state) => {
      const collections = state.collections.map(c =>
        c.id === colId && !c.parliamentarianIds.includes(pId)
          ? { ...c, parliamentarianIds: [...c.parliamentarianIds, pId] }
          : c
      )
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
      return { collections }
    })
  },
  
  removeFromCollection: (colId, pId) => {
    set((state) => {
      const collections = state.collections.map(c =>
        c.id === colId
          ? { ...c, parliamentarianIds: c.parliamentarianIds.filter(x => x !== pId) }
          : c
      )
      localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
      return { collections }
    })
  },
  
  setActiveCollection: (id) => set({ activeCollection: id }),
  
  // Persistence
  loadFromStorage: () => {
    // Load saved IDs
    const savedIds: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_KEYS.SAVED_PREFIX)) {
        savedIds.push(key.replace(STORAGE_KEYS.SAVED_PREFIX, ''))
      }
    }
    
    // Load collections
    let collections: Collection[] = []
    const colData = localStorage.getItem(STORAGE_KEYS.COLLECTIONS)
    if (colData) {
      try {
        collections = JSON.parse(colData)
      } catch (e) {
        console.error('[Collections] Failed to parse collections:', e)
      }
    }
    
    set({ savedIds, collections })
  },
  
  persistToStorage: () => {
    const { collections } = get()
    localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections))
  },
}))
