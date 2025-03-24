"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CarFront, Car, Calendar } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card"
import { useAuth } from "@/components/providers/auth-provider"
import { PreventTextEditing } from "../page-fix"

// Import the ListDrivewayButton component
import { ListDrivewayButton } from "@/components/features/list-driveway-button"

export default function DashboardPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [canListDriveway, setCanListDriveway] = useState(false)

  // We no longer need to check permissions here since that will happen on the list-driveway page
  useEffect(() => {
    // This effect is intentionally left empty as we're moving permission checks to the list-driveway page
  }, [user])

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <CarFront className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">ParkShare</span>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-lg">Loading...</div>
        </main>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PreventTextEditing />

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <CarFront className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ParkShare</span>
            </Link>
          </div>
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground mb-8">Manage your bookings and listings</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>Manage your parking reservations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-md border-muted">
                <div className="text-center">
                  <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No bookings yet</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/search">Find Parking</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Listings</CardTitle>
              <CardDescription>Manage your driveway listings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-md border-muted">
                <div className="text-center">
                  <Car className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No listings yet</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <ListDrivewayButton className="w-full" />
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container max-w-6xl mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} ParkShare, Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

