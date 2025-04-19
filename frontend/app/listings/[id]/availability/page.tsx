"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import { Button } from "@/components/shadcn/button"
import { Separator } from "@/components/shadcn/separator"
import { useToast } from "@/components/shadcn/toast-context"
import { useAuth } from "@/components/providers/auth-provider"
import { ApiClient } from "@/lib/api-client"
import { Loader2, ArrowLeft } from "lucide-react"
import CalendarBlockingModel from "./components/CalendarBlockingModel"
import Link from "next/link"

interface Listing {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip_code: string
}

export default function AvailabilityPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"blocking" | "bookings">("blocking")

  const id = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchListing()
    }
  }, [user, authLoading, router, id])

  const fetchListing = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { data, success, error: apiError } = await ApiClient.get<Listing>(`/api/places/listings/${id}/`)

      if (!success) {
        setError(apiError || "Failed to fetch listing")
        toast({
          title: "Error",
          description: "Failed to load listing details. Please try again later.",
          variant: "destructive",
        })
        return
      }

      setListing(data)
    } catch (err) {
      console.error("Error fetching listing:", err)
      setError("Failed to load listing details. Please try again later.")
      toast({
        title: "Error",
        description: "Failed to load listing details. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Listing</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchListing}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/listings" className="flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to My Listings
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Availability</h1>
          {listing && (
            <p className="text-muted-foreground">
              {listing.name} - {listing.address}, {listing.city}, {listing.state} {listing.zip_code}
            </p>
          )}
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "blocking" | "bookings")}>
          <TabsList>
            <TabsTrigger value="blocking">Blocking Model</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Separator className="mb-8" />

      {view === "blocking" && <CalendarBlockingModel listingId={id} />}

      {view === "bookings" && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center text-muted-foreground">No bookings for this parking space.</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
