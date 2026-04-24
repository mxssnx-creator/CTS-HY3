/**
 * Unified Logging & Error Handling System
 * Centralized logging with context, error codes, and structured output
 */

export enum ErrorCode {
  // Connection errors
  CONNECTION_FAILED = "CONNECTION_FAILED",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  API_TIMEOUT = "API_TIMEOUT",
  RATE_LIMITED = "RATE_LIMITED",

  // Order errors
  ORDER_FAILED = "ORDER_FAILED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INVALID_SYMBOL = "INVALID_SYMBOL",
  ORDER_NOT_FOUND = "ORDER_NOT_FOUND",

  // Position errors
  POSITION_NOT_FOUND = "POSITION_NOT_FOUND",
  POSITION_CLOSED = "POSITION_CLOSED",
  LIQUIDATION_RISK = "LIQUIDATION_RISK",

  // Risk errors
  LEVERAGE_TOO_HIGH = "LEVERAGE_TOO_HIGH",
  POSITION_SIZE_TOO_LARGE = "POSITION_SIZE_TOO_LARGE",
  DRAWDOWN_EXCEEDED = "DRAWDOWN_EXCEEDED",
  MAX_POSITIONS_REACHED = "MAX_POSITIONS_REACHED",

  // Signal errors
  SIGNAL_NOT_READY = "SIGNAL_NOT_READY",
  INDICATOR_CALCULATION_FAILED = "INDICATOR_CALCULATION_FAILED",

  // System errors
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_CONNECTION_ERROR = "DATABASE_CONNECTION_ERROR",
  DATABASE_QUERY_ERROR = "DATABASE_QUERY_ERROR",
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT",

  // API errors
  API_ERROR = "API_ERROR",
  API_SERVICE_UNAVAILABLE = "API_SERVICE_UNAVAILABLE",
  API_BAD_REQUEST = "API_BAD_REQUEST",
  API_UNAUTHORIZED = "API_UNAUTHORIZED",
  API_FORBIDDEN = "API_FORBIDDEN",
  API_NOT_FOUND = "API_NOT_FOUND",
  API_INTERNAL_ERROR = "API_INTERNAL_ERROR",

  // Rate limiting errors
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  RATE_LIMIT_IP_BLOCKED = "RATE_LIMIT_IP_BLOCKED",
  RATE_LIMIT_ACCOUNT_RESTRICTED = "RATE_LIMIT_ACCOUNT_RESTRICTED",

  // Service errors
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  SERVICE_TIMEOUT = "SERVICE_TIMEOUT",
  SERVICE_INITIALIZATION_FAILED = "SERVICE_INITIALIZATION_FAILED",
  SERVICE_DEPENDENCY_FAILED = "SERVICE_DEPENDENCY_FAILED",

  // Validation errors
  VALIDATION_FAILED = "VALIDATION_FAILED",
  INVALID_INPUT = "INVALID_INPUT",
  MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  DNS_RESOLUTION_FAILED = "DNS_RESOLUTION_FAILED",
  SSL_CERTIFICATE_ERROR = "SSL_CERTIFICATE_ERROR",

  UNKNOWN = "UNKNOWN",
}

export interface LogContext {
  component: string
  operation: string
  connectionId?: string
  symbol?: string
  orderId?: string
  positionId?: string
  userId?: string
  [key: string]: any
}

export interface ErrorLog {
  code: ErrorCode
  message: string
  context: LogContext
  timestamp: string
  attempt?: number
  maxAttempts?: number
  retryIn?: number
  originalError?: string
}

/**
 * Unified Logger
 * Provides structured logging with context and severity levels
 */
export class UnifiedLogger {
  private static logs: ErrorLog[] = []
  private static maxLogs = 1000

  /**
   * Log info message
   */
  static info(context: LogContext, message: string) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${context.component}]`
    const details = context.operation ? ` [${context.operation}]` : ""
    const fullMsg = `${prefix}${details} ${message}`

    console.log(`[v0] ${fullMsg}`)
  }

  /**
   * Log warning
   */
  static warn(context: LogContext, message: string) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${context.component}] WARN`
    const details = context.operation ? ` [${context.operation}]` : ""
    const fullMsg = `${prefix}${details} ${message}`

    console.warn(`[v0] ${fullMsg}`)
  }

  /**
   * Log error with structured error log
   */
  static error(context: LogContext, code: ErrorCode, message: string, originalError?: any) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${context.component}] ERROR`
    const details = context.operation ? ` [${context.operation}]` : ""
    const errorMsg = `${prefix}${details} [${code}] ${message}`

    // Add context details
    let fullMsg = errorMsg
    if (context.connectionId) fullMsg += ` (connection: ${context.connectionId})`
    if (context.symbol) fullMsg += ` (symbol: ${context.symbol})`
    if (context.orderId) fullMsg += ` (order: ${context.orderId})`

    if (originalError) {
      const errStr = originalError instanceof Error ? originalError.message : String(originalError)
      fullMsg += `\n    Original: ${errStr}`
    }

    console.error(`[v0] ${fullMsg}`)

    // Store error log
    const errorLog: ErrorLog = {
      code,
      message,
      context,
      timestamp,
      originalError: originalError instanceof Error ? originalError.message : String(originalError),
    }

    this.logs.push(errorLog)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  /**
   * Log retry attempt
   */
  static retry(context: LogContext, attempt: number, maxAttempts: number, backoffMs: number) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${context.component}] RETRY`
    const details = context.operation ? ` [${context.operation}]` : ""
    const msg = `${prefix}${details} Attempt ${attempt}/${maxAttempts}, retrying in ${backoffMs}ms`

    console.log(`[v0] ${msg}`)
  }

  /**
   * Get recent error logs
   */
  static getErrorLogs(limit: number = 50): ErrorLog[] {
    return this.logs.slice(-limit)
  }

  /**
   * Get error logs filtered by component or code
   */
  static getErrorsByFilter(filter: { component?: string; code?: ErrorCode }): ErrorLog[] {
    return this.logs.filter((log) => {
      if (filter.component && log.context.component !== filter.component) return false
      if (filter.code && log.code !== filter.code) return false
      return true
    })
  }

  /**
   * Clear logs
   */
  static clearLogs() {
    this.logs = []
  }

  /**
   * Export logs as JSON for analysis
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

/**
 * Error Handler - catches and categorizes errors
 */
export class ErrorHandler {
  /**
   * Classify error and return appropriate error code
   */
  static classifyError(error: any): ErrorCode {
    if (!error) return ErrorCode.UNKNOWN

    const msg = error.message?.toLowerCase() || error.toString().toLowerCase()
    const errorCode = error.code?.toLowerCase() || ""
    const status = error.status || error.statusCode || error.response?.status

    // Database errors
    if (msg.includes("database") || msg.includes("db error") || msg.includes("sqlite") || msg.includes("postgres") || msg.includes("redis")) {
      if (msg.includes("connection") || msg.includes("econnrefused")) return ErrorCode.DATABASE_CONNECTION_ERROR
      if (msg.includes("timeout")) return ErrorCode.DATABASE_TIMEOUT
      if (msg.includes("query failed") || msg.includes("syntax error")) return ErrorCode.DATABASE_QUERY_ERROR
      return ErrorCode.DATABASE_ERROR
    }

    // Rate limiting errors (check before general API errors)
    if (status === 429 || msg.includes("rate limit") || msg.includes("too many requests") || errorCode.includes("rate")) {
      if (msg.includes("ip") && (msg.includes("blocked") || msg.includes("banned"))) return ErrorCode.RATE_LIMIT_IP_BLOCKED
      if (msg.includes("account") && (msg.includes("restricted") || msg.includes("suspended"))) return ErrorCode.RATE_LIMIT_ACCOUNT_RESTRICTED
      return ErrorCode.RATE_LIMIT_EXCEEDED
    }

    // API errors
    if (msg.includes("api") || msg.includes("endpoint") || status >= 400) {
      if (status === 400 || msg.includes("bad request")) return ErrorCode.API_BAD_REQUEST
      if (status === 401 || msg.includes("unauthorized") || msg.includes("invalid api key")) return ErrorCode.API_UNAUTHORIZED
      if (status === 403 || msg.includes("forbidden")) return ErrorCode.API_FORBIDDEN
      if (status === 404 || msg.includes("not found")) return ErrorCode.API_NOT_FOUND
      if (status === 500 || msg.includes("internal server error")) return ErrorCode.API_INTERNAL_ERROR
      if (msg.includes("service unavailable") || status === 503) return ErrorCode.API_SERVICE_UNAVAILABLE
      if (msg.includes("timeout")) return ErrorCode.API_TIMEOUT
      return ErrorCode.API_ERROR
    }

    // Service errors
    if (msg.includes("service") || msg.includes("dependency")) {
      if (msg.includes("unavailable") || msg.includes("down")) return ErrorCode.SERVICE_UNAVAILABLE
      if (msg.includes("timeout")) return ErrorCode.SERVICE_TIMEOUT
      if (msg.includes("initialization") || msg.includes("init failed")) return ErrorCode.SERVICE_INITIALIZATION_FAILED
      if (msg.includes("dependency") && (msg.includes("failed") || msg.includes("missing"))) return ErrorCode.SERVICE_DEPENDENCY_FAILED
      return ErrorCode.SERVICE_UNAVAILABLE
    }

    // Network errors
    if (msg.includes("econnrefused") || msg.includes("connection refused")) return ErrorCode.CONNECTION_FAILED
    if (msg.includes("dns") || msg.includes("enotfound")) return ErrorCode.DNS_RESOLUTION_FAILED
    if (msg.includes("ssl") || msg.includes("certificate")) return ErrorCode.SSL_CERTIFICATE_ERROR
    if (msg.includes("network") || msg.includes("econnreset") || msg.includes("econnaborted")) return ErrorCode.NETWORK_ERROR

    // Connection errors
    if (msg.includes("invalid api key") || msg.includes("invalid credentials")) return ErrorCode.INVALID_CREDENTIALS
    if (msg.includes("timeout")) return ErrorCode.API_TIMEOUT

    // Order errors
    if (msg.includes("insufficient balance") || msg.includes("insufficient margin")) return ErrorCode.INSUFFICIENT_BALANCE
    if (msg.includes("invalid symbol")) return ErrorCode.INVALID_SYMBOL
    if (msg.includes("order not found")) return ErrorCode.ORDER_NOT_FOUND

    // Position errors
    if (msg.includes("position not found")) return ErrorCode.POSITION_NOT_FOUND
    if (msg.includes("liquidation")) return ErrorCode.LIQUIDATION_RISK

    // Risk errors
    if (msg.includes("leverage") && msg.includes("too high")) return ErrorCode.LEVERAGE_TOO_HIGH
    if (msg.includes("position size") && msg.includes("too large")) return ErrorCode.POSITION_SIZE_TOO_LARGE
    if (msg.includes("drawdown")) return ErrorCode.DRAWDOWN_EXCEEDED
    if (msg.includes("max positions")) return ErrorCode.MAX_POSITIONS_REACHED

    // Validation errors
    if (msg.includes("validation") || msg.includes("invalid input") || msg.includes("schema")) return ErrorCode.VALIDATION_FAILED
    if (msg.includes("missing") && msg.includes("required")) return ErrorCode.MISSING_REQUIRED_FIELD

    return ErrorCode.UNKNOWN
  }

  /**
   * Get retry delay based on error code
   */
  static getRetryDelay(code: ErrorCode, attempt: number): number {
    const baseDelay = 1000 // 1 second
    const exponential = Math.pow(2, attempt - 1)

    switch (code) {
      case ErrorCode.RATE_LIMITED:
        // Back off longer for rate limit
        return baseDelay * exponential * 5
      case ErrorCode.API_TIMEOUT:
        return baseDelay * exponential * 2
      case ErrorCode.CONNECTION_FAILED:
        return baseDelay * exponential * 3
      default:
        return baseDelay * exponential
    }
  }

  /**
   * Determine if error is retryable
   */
  static isRetryable(code: ErrorCode): boolean {
    const nonRetryable = [
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.INVALID_SYMBOL,
      ErrorCode.LEVERAGE_TOO_HIGH,
      ErrorCode.POSITION_SIZE_TOO_LARGE,
      ErrorCode.VALIDATION_FAILED,
      ErrorCode.INVALID_INPUT,
      ErrorCode.MISSING_REQUIRED_FIELD,
      ErrorCode.API_BAD_REQUEST,
      ErrorCode.API_UNAUTHORIZED,
      ErrorCode.API_FORBIDDEN,
      ErrorCode.API_NOT_FOUND,
      ErrorCode.ORDER_NOT_FOUND,
      ErrorCode.POSITION_NOT_FOUND,
    ]

    return !nonRetryable.includes(code)
  }

  /**
   * Should stop processing on this error?
   */
  static shouldStop(code: ErrorCode): boolean {
    const stopErrors = [
      ErrorCode.INVALID_CREDENTIALS,
      ErrorCode.LIQUIDATION_RISK,
      ErrorCode.DRAWDOWN_EXCEEDED,
      ErrorCode.SERVICE_INITIALIZATION_FAILED,
      ErrorCode.DATABASE_CONNECTION_ERROR,
    ]

    return stopErrors.includes(code)
  }
}

/**
 * Operation wrapper with automatic error handling and logging
 */
export async function withErrorHandling<T>(
  context: LogContext,
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<{ success: boolean; data?: T; error?: string; code?: ErrorCode }> {
  let lastError: any
  let lastCode: ErrorCode = ErrorCode.UNKNOWN

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation()
      return { success: true, data: result }
    } catch (error) {
      lastError = error
      lastCode = ErrorHandler.classifyError(error)

      UnifiedLogger.error(context, lastCode, "Operation failed", error)

      // Check if error is retryable
      if (!ErrorHandler.isRetryable(lastCode)) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          code: lastCode,
        }
      }

      // Check if we should stop
      if (ErrorHandler.shouldStop(lastCode)) {
        return {
          success: false,
          error: "Critical error - stopping",
          code: lastCode,
        }
      }

      // Retry if not last attempt
      if (attempt < maxRetries) {
        const delay = ErrorHandler.getRetryDelay(lastCode, attempt)
        UnifiedLogger.retry(context, attempt, maxRetries, delay)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
    code: lastCode,
  }
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 500,
  details?: any
) {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Create a standardized API success response
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Map ErrorCode to HTTP status code
 */
export function getHttpStatusForErrorCode(code: ErrorCode): number {
  switch (code) {
    case ErrorCode.API_BAD_REQUEST:
    case ErrorCode.VALIDATION_FAILED:
    case ErrorCode.INVALID_INPUT:
    case ErrorCode.MISSING_REQUIRED_FIELD:
      return 400
    case ErrorCode.API_UNAUTHORIZED:
    case ErrorCode.INVALID_CREDENTIALS:
      return 401
    case ErrorCode.API_FORBIDDEN:
      return 403
    case ErrorCode.API_NOT_FOUND:
    case ErrorCode.ORDER_NOT_FOUND:
    case ErrorCode.POSITION_NOT_FOUND:
      return 404
    case ErrorCode.RATE_LIMITED:
    case ErrorCode.RATE_LIMIT_EXCEEDED:
    case ErrorCode.RATE_LIMIT_IP_BLOCKED:
    case ErrorCode.RATE_LIMIT_ACCOUNT_RESTRICTED:
      return 429
    case ErrorCode.API_INTERNAL_ERROR:
    case ErrorCode.DATABASE_ERROR:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 500
    case ErrorCode.API_SERVICE_UNAVAILABLE:
    case ErrorCode.SERVICE_UNAVAILABLE:
      return 503
    case ErrorCode.API_TIMEOUT:
    case ErrorCode.SERVICE_TIMEOUT:
    case ErrorCode.DATABASE_TIMEOUT:
      return 504
    default:
      return 500
  }
}

/**
 * Handle API errors with standardized response
 */
export function handleApiError(
  error: any,
  context: LogContext,
  customMessage?: string
): { response: ReturnType<typeof createErrorResponse>; status: number } {
  const code = ErrorHandler.classifyError(error)
  const message = customMessage || (error instanceof Error ? error.message : "An unexpected error occurred")

  UnifiedLogger.error(context, code, message, error)

  const status = getHttpStatusForErrorCode(code)

  return {
    response: createErrorResponse(code, message, status, error instanceof Error ? error.stack : String(error)),
    status,
  }
}
