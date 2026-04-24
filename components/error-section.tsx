"use client"

import { useErrorContext, getErrorDisplay, getErrorSeverity } from "@/lib/error-context"
import { ErrorCode } from "@/lib/error-handling"
import type { AppError } from "@/lib/error-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, X, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { formatDistanceToNow } from "date-fns"

export function ErrorSection() {
  const { errors, dismissError, clearErrors } = useErrorContext()
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const undismissedErrors = errors.filter((e: AppError) => !e.dismissed)

  if (undismissedErrors.length === 0) {
    return null
  }

  const sortedErrors = [...undismissedErrors].sort((a: AppError, b: AppError) => {
    // Map severity to numeric order (critical=0, error=1, warning=2, info=3)
    const getSeverityOrder = (sev: string): number => {
      if (sev === "critical") return 0
      if (sev === "error") return 1
      if (sev === "warning") return 2
      return 3 // info or default
    }
    const aSev = getSeverityOrder(getErrorSeverity(a.code))
    const bSev = getSeverityOrder(getErrorSeverity(b.code))
    if (aSev !== bSev) return aSev - bSev
    // Compare timestamps as numbers
    const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime()
    const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime()
    return bTime - aTime
  })

  const criticalCount = undismissedErrors.filter(
    (e: AppError) => getErrorSeverity(e.code) === "critical"
  ).length

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">
              System Errors
              <Badge variant="destructive" className="ml-2">
                {undismissedErrors.length}
              </Badge>
            </CardTitle>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="bg-red-600">
                {criticalCount} critical
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearErrors}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-2">
          {sortedErrors.map((error) => {
            const display = getErrorDisplay(error.code)
            const severity = getErrorSeverity(error.code)
            const isExpanded = expandedError === error.id
            const timeAgo = formatDistanceToNow(new Date(error.timestamp), {
              addSuffix: true,
            })

            return (
              <div
                key={error.id}
                className={`rounded-lg border p-3 ${display.bgColor} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{display.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium ${display.color}`}>
                        {error.message}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {error.code}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          severity === "critical"
                            ? "bg-red-100 text-red-700"
                            : severity === "error"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {timeAgo}
                      {error.context?.component && (
                        <span className="ml-2">
                          · {error.context.component}
                          {error.context.operation && ` / ${error.context.operation}`}
                        </span>
                      )}
                    </p>

                    {isExpanded && error.context && (
                      <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {error.context && Object.keys(error.context).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() =>
                          setExpandedError(isExpanded ? null : error.id)
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:text-destructive"
                      onClick={() => dismissError(error.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      )}
    </Card>
  )
}
