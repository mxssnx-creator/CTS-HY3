/**
 * Live Trade Processor
 * Handles live positions in their own dedicated processing cycle, independent of
 * pseudo position / indication / strategy processors.
 *
 * Responsibilities per cycle:
 *   1. Sync all open live positions with exchange data (mark price, liq price, PnL)
 *   2. Check for SL/TP hits via exchange orders or price thresholds
 *   3. Reconcile positions that were closed externally (exchange SL/TP, liquidation)
 *   4. Update position state and metrics
 */

import { getRedisClient, getSettingsVersionCachedSync } from "@/lib/redis-db"
import { logProgressionEvent } from "@/lib/engine-progression-logs"
import { syncWithExchange, reconcileLivePositions, getLivePositions, closeLivePosition } from "./stages/live-stage"
import type { LivePosition } from "./stages/live-stage"

export class LiveTradeProcessor {
  private connectionId: string
  private isRunning = false
  private timer?: NodeJS.Timeout
  private lastCycleTime = 0

  // Configurable pause between cycles (ms), synced with app_settings.cyclePauseMs
  private static readonly DEFAULT_CYCLE_PAUSE_MS = 1000
  private static readonly MIN_CYCLE_PAUSE_MS = 500
  private static readonly MAX_CYCLE_PAUSE_MS = 5000

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  /**
   * Start the live trade processing cycle with self-scheduling setTimeout loop.
   */
  start(intervalSeconds = 1): void {
    if (this.isRunning) return
    this.isRunning = true
    this.scheduleNextCycle(0) // Start immediately
    console.log(`[v0] [LiveTradeProcessor] Started for ${this.connectionId}`)
  }

  /**
   * Stop the live trade processing cycle.
   */
  stop(): void {
    this.isRunning = false
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    console.log(`[v0] [LiveTradeProcessor] Stopped for ${this.connectionId}`)
  }

  private scheduleNextCycle(ms: number): void {
    if (!this.isRunning) return
    this.timer = setTimeout(() => this.runCycle(), ms)
  }

  private getCyclePauseMs(): number {
    try {
      const liveVersion = getSettingsVersionCachedSync()
      // Simplified: use the same cycle pause as other processors
      // In a real implementation, you might have a separate setting
      return LiveTradeProcessor.DEFAULT_CYCLE_PAUSE_MS
    } catch {
      return LiveTradeProcessor.DEFAULT_CYCLE_PAUSE_MS
    }
  }

  private async runCycle(): Promise<void> {
    if (!this.isRunning) return
    const startTime = Date.now()
    this.lastCycleTime = startTime

    try {
      // Get exchange connector (simplified - in real code, get from connection manager)
      const connector = await this.getExchangeConnector()
      if (!connector) {
        console.warn(`[v0] [LiveTradeProcessor] No exchange connector for ${this.connectionId}`)
        this.scheduleNextCycle(this.getCyclePauseMs())
        return
      }

      // Step 1: Sync open positions with exchange
      await syncWithExchange(this.connectionId, connector)

      // Step 2: Reconcile positions closed externally
      const reconcileResult = await reconcileLivePositions(this.connectionId, connector)
      if (reconcileResult.closed > 0) {
        console.log(
          `[v0] [LiveTradeProcessor] Reconciled ${reconcileResult.closed} closed positions for ${this.connectionId}`,
        )
      }

      // Step 3: Check for SL/TP hits on open positions (simplified)
      await this.checkLivePositionSlTp(connector)

      // Step 4: Update metrics
      await this.updateMetrics()
    } catch (error) {
      console.error(`[v0] [LiveTradeProcessor] Cycle error:`, error)
      await logProgressionEvent(this.connectionId, "live_trade_error", "error", "Live trade cycle failed", {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (this.isRunning) {
        const elapsed = Date.now() - startTime
        const pause = Math.max(this.getCyclePauseMs(), 0)
        this.scheduleNextCycle(pause)
      }
    }
  }

  private async getExchangeConnector(): Promise<any> {
    // Simplified connector retrieval - replace with actual connection manager logic
    try {
      const { getConnection } = await import("@/lib/redis-db")
      const conn = await getConnection(this.connectionId)
      return conn?.connector || null
    } catch {
      return null
    }
  }

  private async checkLivePositionSlTp(connector: any): Promise<void> {
    try {
      const openPositions = await getLivePositions(this.connectionId)
      const open = openPositions.filter(
        (p) => p.status === "open" || p.status === "filled" || p.status === "partially_filled",
      )

      for (const pos of open) {
        // Get current price
        const client = getRedisClient()
        const md = await client.hgetall(`market_data:${pos.symbol}`)
        const currentPrice = parseFloat(String(md?.close || md?.price || "0"))
        if (!currentPrice || currentPrice <= 0) continue

        const direction = pos.direction
        const slPrice = pos.stopLossPrice || 0
        const tpPrice = pos.takeProfitPrice || 0

        let shouldClose = false
        let closeReason = ""

        if (direction === "long") {
          if (slPrice > 0 && currentPrice <= slPrice) {
            shouldClose = true
            closeReason = "stop_loss"
          } else if (tpPrice > 0 && currentPrice >= tpPrice) {
            shouldClose = true
            closeReason = "take_profit"
          }
        } else {
          if (slPrice > 0 && currentPrice >= slPrice) {
            shouldClose = true
            closeReason = "stop_loss"
          } else if (tpPrice > 0 && currentPrice <= tpPrice) {
            shouldClose = true
            closeReason = "take_profit"
          }
        }

        if (shouldClose) {
          console.log(`[v0] [LiveTradeProcessor] ${closeReason} hit for ${pos.symbol} ${direction}`)
          await closeLivePosition(this.connectionId, pos.id, currentPrice, connector)
          await logProgressionEvent(this.connectionId, "live_trade_closed", "info", `${closeReason} hit for ${pos.symbol}`, {
            positionId: pos.id,
            price: currentPrice,
            reason: closeReason,
          })
        }
      }
    } catch (error) {
      console.error(`[v0] [LiveTradeProcessor] SL/TP check error:`, error)
    }
  }

  private async updateMetrics(): Promise<void> {
    try {
      const client = getRedisClient()
      const key = `progression:${this.connectionId}`
      const openPositions = await getLivePositions(this.connectionId)
      const openCount = openPositions.filter(
        (p) => p.status === "open" || p.status === "filled" || p.status === "partially_filled",
      ).length
      await client.hset(key, "live_positions_open", String(openCount))
      await client.expire(key, 7 * 24 * 60 * 60)
    } catch (error) {
      console.error(`[v0] [LiveTradeProcessor] Metrics update error:`, error)
    }
  }
}
