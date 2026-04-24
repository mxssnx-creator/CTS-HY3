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
}

export interface ErrorContextType {
  errors: AppError[]
  addError: (error: Omit<AppError, "id" | "timestamp">) => void
  dismissError: (id: string) => void
  clearErrors: () => void
  hasErrors: boolean
  hasCriticalErrors: boolean
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
      }}
    >
      {children}
    </ErrorContext.Provider>
  )
}
