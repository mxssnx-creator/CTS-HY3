"use client"

import { useCallback } from "react"
import { useErrorContext } from "@/lib/error-context"
import { ErrorHandler } from "@/lib/error-handling"
import type { ErrorCode } from "@/lib/error-handling"

export function useErrorHandler(component: string) {
  const { addError } = useErrorContext()

  const reportError = useCallback(
    (error: any, operation?: string, additionalContext?: Record<string, any>) => {
      const code = ErrorHandler.classifyError(error) as ErrorCode
      const message = error instanceof Error ? error.message : String(error)

      addError({
        code,
        message,
        severity: "error",
        source: component,
        context: {
          component,
          operation,
          ...additionalContext,
        },
      })

      // Also log to console for development
      console.error(`[${component}]${operation ? ` [${operation}]` : ""} Error:`, error)
    },
    [addError, component]
  )

  const reportDatabaseError = useCallback(
    (error: any, operation?: string) => {
      reportError(error, operation || "database", { type: "database" })
    },
    [reportError]
  )

  const reportApiError = useCallback(
    (error: any, endpoint?: string) => {
      reportError(error, endpoint || "api_call", { type: "api" })
    },
    [reportError]
  )

  const reportServiceError = useCallback(
    (error: any, service?: string) => {
      reportError(error, service || "service", { type: "service" })
    },
    [reportError]
  )

  return {
    reportError,
    reportDatabaseError,
    reportApiError,
    reportServiceError,
  }
}
