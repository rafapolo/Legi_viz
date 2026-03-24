'use client'

import React from 'react'
import { X, User, Info } from 'lucide-react'
import { Logo } from '@/components/logo'

interface SidebarMenuProps {
  isOpen: boolean
  isDark: boolean
  hasUser: boolean
  userName?: string
  
  // Actions
  onClose: () => void
  onNavigate: (view: 'graph' | 'user' | 'about') => void
}

export function SidebarMenu({
  isOpen,
  isDark,
  hasUser,
  userName,
  onClose,
  onNavigate,
}: SidebarMenuProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Sidebar */}
      <div
        className="fixed top-0 left-0 h-full w-72 z-50 p-6 pt-16"
        style={{
          backgroundColor: isDark ? 'rgba(10,10,10,0.97)' : 'rgba(250,250,250,0.97)',
          backdropFilter: 'blur(24px)',
          borderRight: `1px solid ${isDark ? '#262626' : '#E5E5E5'}`,
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg opacity-50 hover:opacity-100"
        >
          <X size={18} />
        </button>

        {/* Logo */}
        <Logo className="h-5 mb-8" isDark={isDark} />

        {/* User section */}
        <div className="space-y-1 mb-6">
          {hasUser ? (
            <button
              onClick={() => { onNavigate('user'); onClose() }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors w-full text-left"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            >
              <User size={16} className="opacity-60" />
              <div>
                <div className="text-sm font-medium">{userName}</div>
                <div className="text-xs opacity-40">Meus parlamentares</div>
              </div>
            </button>
          ) : (
            <button
              onClick={() => { onNavigate('user'); onClose() }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors w-full text-left"
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            >
              <User size={16} className="opacity-60" />
              <span className="text-sm">Meu Painel</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => { onNavigate('graph'); onClose() }}
            className="w-full text-left px-3 py-3 rounded-xl text-sm transition-colors"
            style={{
              backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.08)',
              color: '#3B82F6',
            }}
          >
            Rede de Parlamentares
          </button>
          <button
            onClick={() => { onNavigate('about'); onClose() }}
            className="w-full text-left px-3 py-3 rounded-xl text-sm transition-colors opacity-70 hover:opacity-100"
          >
            Sobre o Projeto
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-xs opacity-30 font-mono">
            Painel de Transparência Parlamentar · 2025
          </div>
        </div>
      </div>
    </>
  )
}
