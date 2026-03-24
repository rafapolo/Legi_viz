/**
 * UI Store - Manages UI state (theme, view, menus, animations)
 * Uses Zustand for global state management
 */

import { create } from 'zustand'

export type View = 'graph' | 'user' | 'about' | 'profile'

export interface UIState {
  // View state
  currentView: View
  previousView: View | null
  
  // Theme
  isDark: boolean
  
  // Menus
  menuOpen: boolean
  filtersOpen: boolean
  uiVisible: boolean
  
  // Animations
  animationsEnabled: boolean
  showInitialAnimation: boolean
  
  // Profile
  selectedParliamentarianId: string | null
  cardIndex: number
  preserveGraphPositions: boolean
  
  // Actions - View
  setView: (view: View) => void
  setPreviousView: (view: View | null) => void
  
  // Actions - Theme
  setIsDark: (isDark: boolean) => void
  toggleTheme: () => void
  
  // Actions - Menus
  setMenuOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
  setUiVisible: (visible: boolean) => void
  
  // Actions - Animations
  setAnimationsEnabled: (enabled: boolean) => void
  setShowInitialAnimation: (show: boolean) => void
  handleAnimationComplete: () => void
  
  // Actions - Profile
  setSelectedParliamentarianId: (id: string | null) => void
  setCardIndex: (index: number) => void
  setPreserveGraphPositions: (preserve: boolean) => void
  handleBackFromProfile: () => void
  
  // Persistence
  loadThemeFromStorage: () => void
  persistThemeToStorage: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state
  currentView: 'graph',
  previousView: null,
  isDark: true,
  menuOpen: false,
  filtersOpen: false,
  uiVisible: true,
  animationsEnabled: true,
  showInitialAnimation: true,
  selectedParliamentarianId: null,
  cardIndex: 0,
  preserveGraphPositions: false,
  
  // View actions
  setView: (view) => set({ currentView: view }),
  
  setPreviousView: (view) => set({ previousView: view }),
  
  // Theme actions
  setIsDark: (isDark) => {
    set({ isDark })
    document.documentElement.classList.toggle('dark', isDark)
  },
  
  toggleTheme: () => {
    const isDark = !get().isDark
    set({ isDark })
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('legi-viz-theme', isDark ? 'dark' : 'light')
  },
  
  // Menu actions
  setMenuOpen: (open) => set({ menuOpen: open }),
  
  setFiltersOpen: (open) => set({ filtersOpen: open }),
  
  setUiVisible: (visible) => set({ uiVisible: visible }),
  
  // Animation actions
  setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
  
  setShowInitialAnimation: (show) => set({ showInitialAnimation: show }),
  
  handleAnimationComplete: () => {
    set({ showInitialAnimation: false })
    sessionStorage.setItem('legi-viz-animation-seen', 'true')
  },
  
  // Profile actions
  setSelectedParliamentarianId: (id) => set({ selectedParliamentarianId: id }),
  
  setCardIndex: (index) => set({ cardIndex: index }),
  
  setPreserveGraphPositions: (preserve) => set({ preserveGraphPositions: preserve }),
  
  handleBackFromProfile: () => {
    set({
      previousView: 'profile',
      preserveGraphPositions: true,
      currentView: 'graph',
      selectedParliamentarianId: null,
      cardIndex: 0,
    })
    
    // Reset preserve after a short delay
    setTimeout(() => {
      set({ preserveGraphPositions: false })
    }, 500)
  },
  
  // Persistence
  loadThemeFromStorage: () => {
    const stored = localStorage.getItem('legi-viz-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored === 'dark' || (!stored && prefersDark)
    
    set({ isDark })
    document.documentElement.classList.toggle('dark', isDark)
  },
  
  persistThemeToStorage: () => {
    const { isDark } = get()
    localStorage.setItem('legi-viz-theme', isDark ? 'dark' : 'light')
  },
}))
