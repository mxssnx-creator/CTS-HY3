import { NextResponse } from "next/server"
import { getRedisClient } from "@/lib/redis-db"
import { SystemLogger } from "@/lib/system-logger"

export async function GET() {
  try {
    console.log("[v0] Fetching detailed trading statistics (Redis-based)")
    
    const redis = getRedisClient()
    
    // Safe default response
    const defaultStats = {
      last250: { total: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, totalProfit: 0 },
      last50: { total: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, totalProfit: 0 },
      last32h: { total: 0, totalProfit: 0, profitFactor: 0 },
    }
    
    try {
      // Get all positions from Redis
      const posIds = await redis.smembers("positions:all").catch(() => []) || []
      const positions: any[] = []
      
      for (const posId of posIds.slice(0, 250)) {
        try {
          const pos = await redis.hgetall(`position:${posId}`)
          if (pos && Object.keys(pos).length > 0) {
            positions.push(pos)
          }
        } catch { /* skip */ }
      }
      
      // Calculate stats for last 250
      const last250Positions = positions.slice(0, 250)
      const last250Total = last250Positions.length
      const last250Wins = last250Positions.filter(p => parseFloat(p.pnl || "0") > 0).length
      const last250Losses = last250Positions.filter(p => parseFloat(p.pnl || "0") < 0).length
      const last250WinRate = last250Total > 0 ? last250Wins / last250Total : 0
      const last250Profit = last250Positions.reduce((sum, p) => sum + parseFloat(p.pnl || "0"), 0)
      
      // Calculate stats for last 50
      const last50Positions = positions.slice(0, 50)
      const last50Total = last50Positions.length
      const last50Wins = last50Positions.filter(p => parseFloat(p.pnl || "0") > 0).length
      const last50Losses = last50Positions.filter(p => parseFloat(p.pnl || "0") < 0).length
      const last50WinRate = last50Total > 0 ? last50Wins / last50Total : 0
      const last50Profit = last50Positions.reduce((sum, p) => sum + parseFloat(p.pnl || "0"), 0)
      
      // Calculate last 32h (need to check created_at within 32h)
      const thirtyTwoHoursAgo = Date.now() - (32 * 60 * 60 * 1000)
      const last32hPositions = positions.filter(p => {
        const created = new Date(p.created_at || 0).getTime()
        return created >= thirtyTwoHoursAgo
      })
      const last32hTotal = last32hPositions.length
      const last32hProfit = last32hPositions.reduce((sum, p) => sum + parseFloat(p.pnl || "0"), 0)
      
      return NextResponse.json({
        last250: {
          total: last250Total,
          wins: last250Wins,
          losses: last250Losses,
          winRate: last250WinRate,
          profitFactor: last250Wins > 0 ? last250Profit / Math.abs(last250Profit - last250Profit) : 0,
          totalProfit: last250Profit,
        },
        last50: {
          total: last50Total,
          wins: last50Wins,
          losses: last50Losses,
          winRate: last50WinRate,
          profitFactor: last50Wins > 0 ? last50Profit / Math.abs(last50Profit - last50Profit) : 0,
          totalProfit: last50Profit,
        },
        last32h: {
          total: last32hTotal,
          totalProfit: last32hProfit,
          profitFactor: last32hTotal > 0 ? last32hProfit / last32hTotal : 0,
        },
      })
    } catch (dbError) {
      console.warn("[v0] Redis stats not available:", dbError)
      return NextResponse.json(defaultStats)
    }
  } catch (error) {
    console.error("[v0] Failed to fetch stats:", error)
    await SystemLogger.logError(error, "api", "GET /api/trading/stats").catch(() => {})
    return NextResponse.json({
      last250: { total: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, totalProfit: 0 },
      last50: { total: 0, wins: 0, losses: 0, winRate: 0, profitFactor: 0, totalProfit: 0 },
      last32h: { total: 0, totalProfit: 0, profitFactor: 0 },
    })
  }
}
