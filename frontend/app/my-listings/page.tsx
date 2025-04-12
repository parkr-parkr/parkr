"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CarFront, Edit, Trash2, Loader2, AlertCircle, PlusCircle, ImageIcon } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Separator } from "@/components/shadcn/separator"
import { useAuth } from "@/components/providers/auth-provider"
import { ListDrivewayButton } from "@/components/features/list-driveway-button"
import { useToast } from "@/components/shadcn/toast-context"
import { fetchWithCsrf } from "@/lib/csrf"
import { EditListingDialog } from "@/components/features/edit-listing-dialog"

// Define the listing type based on your API response
interface Listing {
  id: number
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  price_per_hour: number
  description: string
  images: {
    id: number
    image: string
    image_key?: string
    url?: string
    is_primary: boolean
  }[]
  created_at: string
}

export default function MyListingsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchListings()
    }
  }, [user, authLoading, router])

  const fetchListings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchWithCsrf("http://localhost:8000/api/places/my-listings/")

      if (!response.ok) {
        throw new Error("Failed to fetch listings")
      }

      const data = await response.json()
      console.log("Listings data:", data)

      setListings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching listings:", err)
      setError("Failed to load your listings. Please try again later.")
      toast({
        title: "Error",
        description: "Failed to load your listings. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteListing = async (id: number) => {
    if (!confirm("Are you sure you want to delete this listing?")) {
      return
    }

    try {
      const response = await fetchWithCsrf(`http://localhost:8000/api/places/listings/${id}/`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete listing")
      }

      setListings(listings.filter((listing) => listing.id !== id))

      toast({
        title: "Success",
        description: "Listing deleted successfully",
      })
    } catch (err) {
      console.error("Error deleting listing:", err)
      toast({
        title: "Error",
        description: "Failed to delete listing. Please try again later.",
        variant: "destructive",
      })
    }
  }

  // Updated to open the dialog instead of navigating
  const handleEditListing = (listing: Listing) => {
    setSelectedListing(listing)
    setIsEditDialogOpen(true)
  }

  // New function to handle listing updates
  const handleListingUpdated = (updatedListing: Listing) => {
    setListings(listings.map((listing) => (listing.id === updatedListing.id ? updatedListing : listing)))
  }

  // Keeping your original getImageUrl function
  const getImageUrl = (listing: Listing) => {
    if (!listing.images || listing.images.length === 0) {
      return "/placeholder.svg?height=200&width=400"
    }

    const primaryImage = listing.images.find((img) => img.is_primary === true)

    if (primaryImage && primaryImage.url) {
      return primaryImage.url
    }

    if (listing.images[0] && listing.images[0].url) {
      return listing.images[0].url
    }

    return "/placeholder.svg?height=200&width=400"
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container max-w-6xl mx-auto flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <CarFront className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">ParkShare</span>
            </div>
          </div>
        </header>
        <main className="flex-1 container max-w-6xl mx-auto py-8">
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading...</span>
          </div>
        </main>
      </div>
    )
  }

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
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium hover:underline underline-offset-4">
              Home
            </Link>
            <Link href="/dashboard" className="text-sm font-medium hover:underline underline-offset-4">
              My Bookings
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Listings</h1>
        </div>

        <Separator className="mb-8" />

        {isLoading ? (
          <div className="flex justify-center items-center h-[40vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading your listings...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Failed to load listings</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchListings}>Try Again</Button>
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[40vh] text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <CarFront className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No listings yet</h2>
            <p className="text-muted-foreground mb-4">
              You haven't listed any driveways yet. Start earning by sharing your parking space.
            </p>
            <ListDrivewayButton>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Listing
            </ListDrivewayButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="overflow-hidden border-dashed hover:border-primary/50 transition-colors">
              <div className="aspect-video w-full bg-muted/50 flex flex-col items-center justify-center">
                <CarFront className="h-16 w-16 text-primary/60" />
              </div>
              <CardFooter className="flex justify-center p-6">
                <ListDrivewayButton variant="default" className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add New Listing
                </ListDrivewayButton>
              </CardFooter>
            </Card>

            {listings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="aspect-video w-full overflow-hidden bg-muted relative">
                  <img
                    src={getImageUrl(listing) || "/placeholder.svg"}
                    alt={listing.name}
                    className="h-full w-full object-cover transition-all hover:scale-105"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=200&width=400"
                    }}
                  />
                  {(!listing.images || listing.images.length === 0) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                    </div>
                  )}
                </div>
                <CardHeader>
                  <CardTitle>{listing.name}</CardTitle>
                  <CardDescription>
                    {listing.address}, {listing.city}, {listing.state} {listing.zip_code}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">${listing.price_per_hour}/hour</span>
                    <span className="text-sm text-muted-foreground">
                      Listed on {new Date(listing.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground line-clamp-2">
                    {listing.description && listing.description !== "undefined" ? (
                      listing.description
                    ) : (
                      <em>No description</em>
                    )}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => handleEditListing(listing)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteListing(listing.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Add the edit dialog */}
        <EditListingDialog
          listing={selectedListing}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onListingUpdated={handleListingUpdated}
        />
      </main>

      <footer className="border-t bg-muted/50 py-6">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <CarFront className="h-5 w-5 text-primary" />
              <span className="font-semibold">ParkShare</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ParkShare, Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

