"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

export interface AppError {
  id: string
  code: string
  message: string
  severity: "info" | "warning" | "error" | "critical"
  timestamp: Date
  source?: string
  details?: any
  dismissed?: boolean
  context?: {
    component?: string
    operation?: string
    [key: string]: any
  }
}

export interface ErrorDisplay {
  bgColor: string
  icon: string
  color: string
}

export interface ErrorContextType {
  errors: AppError[]
  addError: (error: Omit<AppError, "id" | "timestamp">) => void
  dismissError: (id: string) => void
  clearErrors: () => void
  hasErrors: boolean
  hasCriticalErrors: boolean
  criticalErrors?: boolean
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export function useErrorContext(): ErrorContextType {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error("useErrorContext must be used within an ErrorProvider")
  }
  return context
}

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([])

  const addError = (error: Omit<AppError, "id" | "timestamp">) => {
    const newError: AppError = {
      ...error,
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    }
    setErrors((prev) => [...prev, newError])
  }

  const dismissError = (id: string) => {
    setErrors((prev) => prev.map((err) => (err.id === id ? { ...err, dismissed: true } : err)))
  }

  const clearErrors = () => {
    setErrors([])
  }

  const hasErrors = errors.some((err) => !err.dismissed)
  const hasCriticalErrors = errors.some((err) => err.severity === "critical" && !err.dismissed)
  const criticalErrors = hasCriticalErrors

  // Auto-clear old errors after 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      setErrors((prev) => prev.filter((err) => err.timestamp > fiveMinutesAgo))
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <ErrorContext.Provider
      value={{
        errors,
        addError,
        dismissError,
        clearErrors,
        hasErrors,
        hasCriticalErrors,
        criticalErrors,
      }}
    >
      {children}
    </ErrorContext.Provider>
  )
}

// Helper functions
export function getErrorDisplay(code: string): ErrorDisplay {
  const displayMap: Record<string, ErrorDisplay> = {
    "DATABASE_CONNECTION_FAILED": { bgColor: "bg-red-50", icon: "🗄", color: "text-red-600" },
    "DATABASE_QUERY_FAILED": { bgColor: "bg-red-50", icon: "🗄", color: "text-red-600" },
    "API_TIMEOUT": { bgColor: "bg-yellow-50", icon: "⏱", color: "text-yellow-600" },
    "API_RATE_LIMIT": { bgColor: "bg-yellow-50", icon: "⚠", color: "text-yellow-600" },
    "SERVICE_UNAVAILABLE": { bgColor: "bg-red-50", icon: "❌", color: "text-red-600" },
    "default": { bgColor: "bg-gray-50", icon: "ℹ", color: "text-gray-600" },
  }
  return displayMap[code] || displayMap["default"]
}

export function getErrorSeverity(code: string): "info" | "warning" | "error" | "critical" {
  if (code.includes("FAILED") || code.includes("ERROR")) return "error"
  if (code.includes("WARNING") || code.includes("TIMEOUT")) return "warning"
  if (code.includes("CRITICAL")) return "critical"
  return "info"
}
