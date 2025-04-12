"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CarFront, Search, Filter, Star, MapPin, AlertCircle } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Card, CardContent } from "@/components/shadcn/card"
import { LocationSearch, type Prediction } from "@/components/features/location-search"
import { DatePickerWithRange } from "@/components/features/date-picker-with-range"
import { ApiClient } from "@/lib/api-client"
import type { DateRange } from "react-day-picker"

// Define the ParkingSpot interface based on the provided contract
interface ParkingSpotImage {
  id: number
  image_key: string
  is_primary: boolean
  url: string
  created_at: string
}

interface ParkingSpot {
  id: number
  name: string
  description: string
  address: string
  city: string
  state: string
  zip_code: string
  latitude: string
  longitude: string
  price_per_hour: string
  created_at: string
  updated_at: string
  images: ParkingSpotImage[]
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [locationData, setLocationData] = useState<Prediction | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [searchResults, setSearchResults] = useState<ParkingSpot[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showLocationError, setShowLocationError] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [hasSelectedLocation, setHasSelectedLocation] = useState(false)
  const [initialSearchDone, setInitialSearchDone] = useState(false)

  // Create a state to force re-render of the LocationSearch component
  const [locationKey, setLocationKey] = useState(Date.now())

  // Parse URL parameters on page load
  useEffect(() => {
    // Get location data from URL
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const address = searchParams.get("address")
    const place_id = searchParams.get("place_id") || ""
    const displayName = searchParams.get("displayName") || ""

    // Get date range from URL
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")

    // Set location data if all parameters are present
    if (lat && lng && address) {
      const predictionFromUrl: Prediction = {
        latitude: lat,
        longitude: lng,
        formattedAddress: address,
        displayName: displayName || address,
        place_id: place_id,
      }

      setLocationData(predictionFromUrl)
      setHasSelectedLocation(true)

      // Force re-render of LocationSearch component
      setLocationKey(Date.now())
    }

    // Set date range if parameters are present
    if (startDateStr || endDateStr) {
      const newDateRange: DateRange = {}

      if (startDateStr) {
        newDateRange.from = new Date(startDateStr)
      }

      if (endDateStr) {
        newDateRange.to = new Date(endDateStr)
      }

      setDateRange(newDateRange)
    }
  }, [searchParams])

  // Trigger search when locationData is set from URL parameters
  useEffect(() => {
    if (locationData && hasSelectedLocation && !initialSearchDone) {
      handleSearch(true)
      setInitialSearchDone(true)
    }
  }, [locationData, hasSelectedLocation])

  const handleSearch = (isInitialSearch = false) => {
    if (!isInitialSearch) {
      // Only validate for manual searches, not the initial auto-search
      if (!locationData || !hasSelectedLocation) {
        setShowLocationError(true)
        return
      }
    }

    setIsSearching(true)
    setShowLocationError(false)

    // Update URL with current search parameters
    if (!isInitialSearch && locationData) {
      const params = new URLSearchParams()

      params.append("lat", locationData.latitude)
      params.append("lng", locationData.longitude)
      params.append("address", locationData.formattedAddress)
      params.append("place_id", locationData.place_id)
      params.append("displayName", locationData.displayName)

      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString())
      }

      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString())
      }

      // Update URL without reloading the page
      router.push(`/search?${params.toString()}`, { scroll: false })
    }

    // Make API call to fetch parking spots
    if (locationData) {
      ApiClient.get(
        `/api/places/get-listings-by-location/?latitude=${locationData.latitude}&longitude=${locationData.longitude}&latitude_range=0.25&longitude_range=0.25`,
      )
        .then((response) => {
          setSearchResults(response as any) // Type casting to 'any' to avoid type errors
        })
        .catch((error) => {
          console.error("Error fetching parking spots:", error)
        })
        .finally(() => {
          setIsSearching(false)
        })
    } else {
      setIsSearching(false)
    }
  }

  const handleLocationSelect = (place: Prediction) => {
    setLocationData(place)
    setShowLocationError(false)
    setHasSelectedLocation(true)
    setIsTyping(false)
  }

  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range)
  }

  // Helper function to get the primary image URL or a fallback
  const getPrimaryImageUrl = (spot: ParkingSpot): string => {
    const primaryImage = spot.images.find((img) => img.is_primary)
    return primaryImage?.url || spot.images[0]?.url || "/placeholder.svg?height=200&width=300"
  }

  // Helper function to format the full address
  const getFullAddress = (spot: ParkingSpot): string => {
    return `${spot.address}, ${spot.city}, ${spot.state} ${spot.zip_code}`
  }

  // Helper function to calculate distance (would be replaced with actual calculation)
  const getDistance = (spot: ParkingSpot): string => {
    // This is a placeholder - in a real app, you would calculate the actual distance
    // using the Haversine formula or a mapping service
    return "0.5 miles away"
  }

  // Check if search button should be disabled
  const isSearchDisabled = isSearching || !locationData || isTyping || !hasSelectedLocation

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
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/dashboard/list-driveway" className="text-sm font-medium hover:text-primary">
              List Your Driveway
            </Link>
            <Link href="/login" className="text-sm font-medium hover:text-primary">
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-primary/5 py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <h1 className="text-3xl font-bold mb-6">Find Parking Near You</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSearch()
              }}
              className="bg-white rounded-lg shadow-md p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  {/* Add key to force re-render when locationData changes */}
                  <LocationSearch
                    key={locationKey}
                    onLocationSelect={handleLocationSelect}
                    initialPrediction={locationData}
                  />
                  {showLocationError && (
                    <div className="mt-2 flex items-center text-red-500 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Please select a location from the dropdown
                    </div>
                  )}
                </div>

                <div>
                  <DatePickerWithRange onDateChange={handleDateChange} initialDateRange={dateRange} />
                </div>

                <div>
                  <Button type="submit" className="w-full" disabled={isSearchDisabled}>
                    {isSearching ? "Searching..." : "Search Parking"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="py-8">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Available Parking Spots</h2>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>

            {isSearching ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg">Searching for parking spots...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">No parking spots found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((spot) => (
                  <Card key={spot.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video relative">
                      <img
                        src={getPrimaryImageUrl(spot) || "/placeholder.svg"}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                        ${Number.parseFloat(spot.price_per_hour).toFixed(2)}/hr
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium line-clamp-1">{spot.name}</h3>
                        {/* Rating would come from your API - using placeholder for now */}
                        <div className="flex items-center text-sm">
                          <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                          <span>4.7</span>
                          <span className="text-muted-foreground ml-1">(15)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-1 mb-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground line-clamp-2">{getFullAddress(spot)}</p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{getDistance(spot)}</span>
                        <Button size="sm" onClick={() => router.push(`/parking/${spot.id}`)}>
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>
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
