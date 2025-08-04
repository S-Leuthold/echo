/**
 * Toast Context System
 * 
 * Global toast management system for showing temporary notifications throughout the app.
 * Provides methods to show success, error, info, and warning toasts.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast } from '@/components/ui/toast'

export interface ToastData {
  id: string
  variant: 'success' | 'error' | 'info' | 'warning'
  title?: string
  description: string
  duration?: number
}

interface ToastContextType {
  toasts: ToastData[]
  showToast: (toast: Omit<ToastData, 'id'>) => void
  showSuccess: (description: string, title?: string, duration?: number) => void
  showError: (description: string, title?: string, duration?: number) => void
  showInfo: (description: string, title?: string, duration?: number) => void
  showWarning: (description: string, title?: string, duration?: number) => void
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: React.ReactNode
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  const showToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = generateId()
    const newToast: ToastData = { ...toast, id }
    
    setToasts(prev => [...prev, newToast])
  }, [generateId])

  const showSuccess = useCallback((description: string, title?: string, duration: number = 5000) => {
    showToast({ variant: 'success', description, title, duration })
  }, [showToast])

  const showError = useCallback((description: string, title?: string, duration: number = 7000) => {
    showToast({ variant: 'error', description, title, duration })
  }, [showToast])

  const showInfo = useCallback((description: string, title?: string, duration: number = 5000) => {
    showToast({ variant: 'info', description, title, duration })
  }, [showToast])

  const showWarning = useCallback((description: string, title?: string, duration: number = 6000) => {
    showToast({ variant: 'warning', description, title, duration })
  }, [showToast])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const value: ToastContextType = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    dismissToast,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast Container - renders all active toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 w-full max-w-sm pointer-events-none">
        {toasts.map((toast, index) => (
          <div 
            key={toast.id} 
            className="pointer-events-auto"
            style={{
              transform: `translateY(${index * 10}px)`,
              zIndex: 1000 - index,
            }}
          >
            <Toast
              variant={toast.variant}
              title={toast.title}
              description={toast.description}
              duration={toast.duration}
              onDismiss={() => dismissToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}