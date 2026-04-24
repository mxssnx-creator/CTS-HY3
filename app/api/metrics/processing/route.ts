/**
 * Processing Metrics API
 * Returns current processing metrics for a connection
 * NOW READS from the same canonical Redis keys as /stats endpoint
 * to ensure consistency across all dashboard components
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMetricsTracker } from '@/lib/processing-metrics'
import { getRedisClient } from '@/lib/redis-db'

export const dynamic = 'force-dynamic'

function n(v: unknown): number {
  const x = Number(v)
  return Number.isFinite(x) && x >= 0 ? x : 0
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const connectionId = request.nextUrl.searchParams.get('connectionId')
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId parameter' }, { status: 400 })
    }

    // Try to get data from canonical Redis keys (same as /stats endpoint)
    // This ensures consistency with StatisticsOverview and other components
    let canonicalMetrics = null
    try {
      const client = getRedisClient()
      const progKey = `progression:${connectionId}`
      const realtimeKey = `realtime:${connectionId}`

      const [progHashRaw, realtimeHashRaw] = await Promise.all([
        client.hgetall(progKey).catch(() => null),
        client.hgetall(realtimeKey).catch(() => null),
      ])

      const progHash = (progHashRaw as Record<string, string>) || {}
      const realtimeHash = (realtimeHashRaw as Record<string, string>) || {}

      // Build metrics from canonical keys
      canonicalMetrics = {
        phases: {
          prehistoric: {
            status: progHash.prehistoric_phase_active === 'true' ? 'running' : 'completed',
            cycleCount: n(progHash.prehistoric_cycles_completed),
            itemsProcessed: n(progHash.prehistoric_items_processed),
            itemsTotal: n(progHash.prehistoric_items_total),
            progress: n(progHash.prehistoric_progress),
            currentTimeframe: progHash.prehistoric_current_timeframe || '1m',
            duration: n(progHash.prehistoric_duration),
          },
          realtime: {
            status: 'running',
            cycleCount: n(progHash.realtime_cycle_count),
            itemsProcessed: n(progHash.realtime_items_processed),
            itemsTotal: n(progHash.realtime_items_total),
            progress: n(progHash.realtime_progress),
            currentTimeframe: progHash.realtime_current_timeframe || '1m',
            duration: n(progHash.realtime_duration),
          },
          indication: {
            status: n(progHash.indication_cycle_count) > 0 ? 'running' : 'idle',
            cycleCount: n(progHash.indication_cycle_count),
            itemsProcessed: n(progHash.indication_items_processed),
            itemsTotal: n(progHash.indication_items_total),
            progress: n(progHash.indication_progress),
            currentTimeframe: progHash.indication_current_timeframe || '1m',
            duration: n(progHash.indication_duration),
          },
          strategy: {
            status: n(progHash.strategy_cycle_count) > 0 ? 'running' : 'idle',
            cycleCount: n(progHash.strategy_cycle_count),
            itemsProcessed: n(progHash.strategy_items_processed),
            itemsTotal: n(progHash.strategy_items_total),
            progress: n(progHash.strategy_progress),
            currentTimeframe: progHash.strategy_current_timeframe || '1m',
            duration: n(progHash.strategy_duration),
          },
        },
        evaluationCounts: {
          indicationBase: n(progHash.indications_base_evaluated),
          indicationMain: n(progHash.indications_main_evaluated),
          indicationOptimal: n(progHash.indications_optimal_evaluated),
          strategyBase: n(progHash.strategies_base_evaluated),
          strategyMain: n(progHash.strategies_main_evaluated),
          strategyReal: n(progHash.strategies_real_evaluated),
        },
        pseudoPositions: {
          totalCreated: n(progHash.pseudo_positions_total_created),
          totalEvaluated: n(progHash.pseudo_positions_total_evaluated),
          currentActive: n(progHash.pseudo_positions_current_active),
        },
        performanceMetrics: {
          avgCycleDuration: n(realtimeHash.cycle_time_sum_ms) / Math.max(1, n(realtimeHash.cycle_count)),
          totalProcessingTime: n(progHash.total_processing_time_ms),
          lastUpdate: progHash.last_update || new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (redisError) {
      console.error('[API] Failed to fetch from canonical keys, falling back to tracker:', redisError)
    }

    // Fallback to ProcessingMetricsTracker if canonical keys are empty
    if (!canonicalMetrics) {
      const tracker = getMetricsTracker(connectionId)
      const metrics = tracker.getMetrics()
      canonicalMetrics = {
        ...metrics,
        timestamp: new Date().toISOString(),
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          current: canonicalMetrics,
          timestamp: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    )
  } catch (error) {
    console.error('[API] Processing metrics error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get processing metrics',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
