"use client"

import { useErrorContext, getErrorDisplay, getErrorSeverity } from "@/lib/error-context"
import { ErrorCode } from "@/lib/error-handling"
import type { AppError } from "@/lib/error-context"
import { X, AlertTriangle, AlertCircle, Info, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ErrorBanner() {
  const { errors, dismissError, criticalErrors, hasErrors } = useErrorContext()
  const [visibleErrors, setVisibleErrors] = useState<typeof errors>([])

  // Show recent undismissed errors
  useEffect(() => {
    const recent = errors
      .filter((e: AppError) => !e.dismissed)
      .slice(-3)
      .reverse()
    setVisibleErrors(recent)
  }, [errors])

  if (!hasErrors || visibleErrors.length === 0) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] p-2 space-y-2">
      {visibleErrors.map((error: AppError) => {
        const display = getErrorDisplay(error.code)
        const severity = getErrorSeverity(error.code)
        const isCritical = severity === "critical"

        return (
          <div
            key={error.id}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-lg animate-in slide-in-from-top duration-300 ${display.bgColor}`}
          >
            <span className="text-lg">{display.icon}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${display.color}`}>
                {isCritical && <AlertCircle className="inline h-4 w-4 mr-1" />}
                {error.message}
              </p>
              {error.context?.component && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source: {error.context.component}
                  {error.context.operation && ` / ${error.context.operation}`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-black/10"
              onClick={() => dismissError(error.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export function ErrorHint() {
  const { hasErrors, criticalErrors, errors } = useErrorContext()

  const undismissedErrors = errors.filter((e: AppError) => !e.dismissed)
  const errorCount = undismissedErrors.length

  if (!hasErrors || errorCount === 0) {
    return null
  }

  const highestSeverity = undismissedErrors.reduce((max: string, e: AppError) => {
    const sev = getErrorSeverity(e.code)
    const order: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 }
    return order[sev] > order[max] ? sev : max
  }, "low" as ReturnType<typeof getErrorSeverity>)

  const isCritical = highestSeverity === "critical"
  const color =
    highestSeverity === "critical"
      ? "text-red-600 bg-red-50 border-red-200"
      : highestSeverity === "high"
        ? "text-red-500 bg-red-50 border-red-200"
        : highestSeverity === "medium"
          ? "text-orange-500 bg-orange-50 border-orange-200"
          : "text-blue-500 bg-blue-50 border-blue-200"

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}
    >
      {isCritical ? (
        <AlertCircle className="h-3.5 w-3.5" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5" />
      )}
      <span>
        {errorCount} error{errorCount > 1 ? "s" : ""}
      </span>
    </div>
  )
}
