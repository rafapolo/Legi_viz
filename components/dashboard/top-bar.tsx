'use client'

import React, { useRef } from 'react'
import { Search, X, Filter, Sun, Moon, Menu, ChevronDown } from 'lucide-react'
import { Logo } from '@/components/logo'
import { CLUSTER_OPTIONS } from '@/lib/constants/clusters'
import { PARTY_COLORS } from '@/lib/parliamentarians'
import type { ClusterMode } from '@/components/network-graph'

interface TopBarProps {
  isDark: boolean
  uiVisible: boolean
  menuOpen: boolean
  filtersOpen: boolean
  hasActiveFilters: boolean
  search: string
  clusterMode: ClusterMode
  activeFilterCount: number
  
  // Actions
  setMenuOpen: (open: boolean) => void
  setClusterMode: (mode: ClusterMode) => void
  setSearch: (value: string) => void
  setFiltersOpen: (open: boolean) => void
  toggleTheme: () => void
  clearFilters: () => void
  
  // Refs
  searchRef: React.RefObject<HTMLInputElement>
}

export function TopBar({
  isDark,
  uiVisible,
  menuOpen,
  filtersOpen,
  hasActiveFilters,
  search,
  clusterMode,
  activeFilterCount,
  setMenuOpen,
  setClusterMode,
  setSearch,
  setFiltersOpen,
  toggleTheme,
  searchRef,
}: TopBarProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        opacity: uiVisible ? 1 : 0,
        transform: uiVisible ? 'translateY(0)' : 'translateY(-8px)',
        pointerEvents: uiVisible ? 'auto' : 'none',
      }}
    >
      {/* Main bar */}
      <div
        className="mx-3 mt-3 rounded-2xl backdrop-blur-xl px-3 py-2 flex items-center gap-2"
        style={{
          backgroundColor: isDark ? 'rgba(10,10,10,0.92)' : 'rgba(250,250,250,0.95)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
        }}
      >
        {/* Menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={16} /> : <Menu size={16} />}
        </button>

        {/* Logo - hidden on mobile */}
        <div className="shrink-0 mx-1 hidden sm:block">
          <Logo className="h-5" isDark={isDark} />
        </div>

        {/* Cluster mode buttons - desktop only */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <div
            className="w-px h-5 shrink-0 mx-1"
            style={{ backgroundColor: isDark ? '#1E293B' : '#CBD5E1' }}
          />
          {CLUSTER_OPTIONS.map(opt => (
            <button
              key={opt.mode}
              onClick={() => setClusterMode(opt.mode)}
              title={opt.desc}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium font-mono transition-all"
              style={clusterMode === opt.mode ? {
                backgroundColor: '#3B82F6',
                color: '#FFFFFF',
              } : {
                backgroundColor: 'transparent',
                color: isDark ? '#64748B' : '#94A3B8',
              }}
            >
              {opt.icon}
              <span className="hidden lg:inline">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="flex-1 relative min-w-0">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl font-mono outline-none bg-transparent"
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: isDark ? '#F8FAFC' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
            }}
            aria-label="Buscar parlamentar por nome"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
              aria-label="Limpar busca"
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors relative"
          style={filtersOpen || hasActiveFilters ? {
            backgroundColor: '#3B82F6',
            color: '#FFFFFF',
          } : {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            color: isDark ? '#64748B' : '#94A3B8',
          }}
          aria-label={hasActiveFilters ? 'Filtros ativos - Abrir painel de filtros' : 'Abrir painel de filtros'}
          aria-expanded={filtersOpen}
        >
          <Filter size={15} />
          {hasActiveFilters && (
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold"
              aria-hidden="true"
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}
          aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </div>
  )
}
