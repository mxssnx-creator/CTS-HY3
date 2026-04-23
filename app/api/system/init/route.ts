import { NextResponse } from "next/server"
import { initRedis, getRedisClient } from "@/lib/redis-db"
import { runMigrations } from "@/lib/redis-migrations"
import { getSettings, setSettings } from "@/lib/redis-db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] [Init] Starting system initialization...")
    
    // Step 1: Initialize Redis
    await initRedis()
    console.log("[v0] [Init] ✓ Redis initialized")
    
    // Step 2: Run migrations
    const migResult = await runMigrations()
    console.log(`[v0] [Init] ✓ Migrations completed (v${migResult.version})`)
    
    // Step 3: Initialize default settings if needed
    const existingSettings = await getSettings("app_settings")
    if (!existingSettings || Object.keys(existingSettings).length === 0) {
      await setSettings("app_settings", {
        system_initialized: true,
        initialized_at: new Date().toISOString(),
        version: "3.2.0"
      })
      console.log("[v0] [Init] ✓ Default settings created")
    }
    
    // Step 4: Verify system health
    const client = getRedisClient()
    const pingResult = await client.ping()
    const isHealthy = pingResult === "PONG"
    
    console.log("[v0] [Init] ✓ System initialization completed")
    
    return NextResponse.json({
      success: true,
      message: "System initialized successfully",
      data: {
        redis: isHealthy ? "connected" : "disconnected",
        migrations: `v${migResult.version}`,
        initialized: true,
        timestamp: new Date().toISOString(),
      }
    })
    
  } catch (error) {
    console.error("[v0] [Init] Initialization failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        message: "System initialization failed"
      },
      { status: 500 }
    )
  }
}
