/**
 * Filter Store - Manages filter state for parliamentarian data
 * Uses Zustand for global state management
 */

import { create } from 'zustand'
import type { ClusterMode } from '@/components/network-graph'

export interface FilterState {
  // Search
  searchQuery: string
  
  // Filters
  filterPartido: string
  filterUF: string
  filterTipo: string
  filterBancada: string
  filterGenero: string
  filterFaixaEtaria: string
  filterRaca: string
  filterAlinhamento: string
  
  // View
  clusterMode: ClusterMode
  
  // UI state
  filtersOpen: boolean
  searchRef: React.RefObject<HTMLInputElement | null>
  
  // Actions
  setSearchQuery: (query: string) => void
  setFilterPartido: (value: string) => void
  setFilterUF: (value: string) => void
  setFilterTipo: (value: string) => void
  setFilterBancada: (value: string) => void
  setFilterGenero: (value: string) => void
  setFilterFaixaEtaria: (value: string) => void
  setFilterRaca: (value: string) => void
  setFilterAlinhamento: (value: string) => void
  setClusterMode: (mode: ClusterMode) => void
  setFiltersOpen: (open: boolean) => void
  clearFilters: () => void
  hasActiveFilters: () => boolean
  getActiveFilterCount: () => number
}

export const useFilterStore = create<FilterState>((set, get) => ({
  // Initial state
  searchQuery: '',
  filterPartido: '',
  filterUF: '',
  filterTipo: '',
  filterBancada: '',
  filterGenero: '',
  filterFaixaEtaria: '',
  filterRaca: '',
  filterAlinhamento: '',
  clusterMode: 'partido',
  filtersOpen: false,
  searchRef: { current: null },
  
  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setFilterPartido: (value) => set({ filterPartido: value }),
  
  setFilterUF: (value) => set({ filterUF: value }),
  
  setFilterTipo: (value) => set({ filterTipo: value }),
  
  setFilterBancada: (value) => set({ filterBancada: value }),
  
  setFilterGenero: (value) => set({ filterGenero: value }),
  
  setFilterFaixaEtaria: (value) => set({ filterFaixaEtaria: value }),
  
  setFilterRaca: (value) => set({ filterRaca: value }),
  
  setFilterAlinhamento: (value) => set({ filterAlinhamento: value }),
  
  setClusterMode: (mode) => set({ clusterMode: mode }),
  
  setFiltersOpen: (open) => set({ filtersOpen: open }),
  
  clearFilters: () => set({
    searchQuery: '',
    filterPartido: '',
    filterUF: '',
    filterTipo: '',
    filterBancada: '',
    filterGenero: '',
    filterFaixaEtaria: '',
    filterRaca: '',
    filterAlinhamento: '',
  }),
  
  hasActiveFilters: () => {
    const state = get()
    return !!(
      state.searchQuery ||
      state.filterPartido ||
      state.filterUF ||
      state.filterTipo ||
      state.filterBancada ||
      state.filterGenero ||
      state.filterFaixaEtaria ||
      state.filterRaca ||
      state.filterAlinhamento
    )
  },
  
  getActiveFilterCount: () => {
    const state = get()
    return [
      state.filterPartido,
      state.filterUF,
      state.filterTipo,
      state.filterBancada,
      state.filterGenero,
      state.filterFaixaEtaria,
      state.filterRaca,
      state.filterAlinhamento,
    ].filter(Boolean).length
  },
}))
