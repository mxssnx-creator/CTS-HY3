"use client"

import type React from "react"
import { ConnectionStateProvider } from "@/lib/connection-state"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "sonner"
import { ErrorProvider } from "@/lib/error-context"
import { ErrorBanner } from "@/components/error-banner"

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ErrorProvider>
      <ConnectionStateProvider>
        <SidebarProvider>
          <div className="flex min-h-screen overflow-hidden bg-muted/20">
            <AppSidebar />
            <main className="relative flex-1 min-w-0 overflow-auto">
              <ErrorBanner />
              <div className="fixed top-3 left-3 z-40 md:hidden">
                <SidebarTrigger className="h-8 w-8 bg-background/90 border shadow-sm" />
              </div>
              {children}
            </main>
          </div>
          <Toaster />
        </SidebarProvider>
      </ConnectionStateProvider>
    </ErrorProvider>
  )
}
