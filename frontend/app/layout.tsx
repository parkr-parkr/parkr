import type React from "react"
import type { Metadata } from "next"
import { ToastProvider } from "@/components/shadcn/toast-context"
import { AuthProvider } from "@/components/providers/auth-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "ParkShare - Find and Share Parking Spaces",
  description: "Rent private driveways, garages, and parking spaces in your neighborhood.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

