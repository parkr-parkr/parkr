"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CarFront, Search, Calendar, Clock, Filter, Star, MapPin } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Card, CardContent } from "@/components/shadcn/card"
import { LocationSearch, Prediction } from "@/components/features/location-search"
import { ApiClient } from "@/lib/api-client"

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

// Define the Prediction type


// Mock data for parking spots based on the provided contract
// const MOCK_PARKING_SPOTS: ParkingSpot[] = [
//   {
//     id: 10,
//     name: "Spacious Driveway Near Downtown",
//     description: "Convenient parking spot close to downtown attractions",
//     address: "449 Albany Ave.",
//     city: "El Paso",
//     state: "TX",
//     zip_code: "79930",
//     latitude: "37.664311",
//     longitude: "-121.852746",
//     price_per_hour: "5.00",
//     created_at: "2025-04-05T05:55:18.997613Z",
//     updated_at: "2025-04-05T05:55:18.997647Z",
//     images: [
//       {
//         id: 4,
//         image_key: "listings/10/download_1264d38f.png",
//         is_primary: true,
//         url: "https://parkr-datastore.s3.us-east-2.amazonaws.com/listings/10/download_1264d38f.png",
//         created_at: "2025-04-05T05:55:19.766282Z",
//       },
//     ],
//   },
//   {
//     id: 11,
//     name: "Covered Parking in Residential Area",
//     description: "Secure covered parking in a quiet neighborhood",
//     address: "123 Main St",
//     city: "San Francisco",
//     state: "CA",
//     zip_code: "94105",
//     latitude: "37.789",
//     longitude: "-122.401",
//     price_per_hour: "7.50",
//     created_at: "2025-04-05T05:55:18.997613Z",
//     updated_at: "2025-04-05T05:55:18.997647Z",
//     images: [
//       {
//         id: 5,
//         image_key: "listings/11/parking_spot.jpg",
//         is_primary: true,
//         url: "/placeholder.svg?height=200&width=300",
//         created_at: "2025-04-05T05:55:19.766282Z",
//       },
//     ],
//   },
//   {
//     id: 12,
//     name: "Secure Garage Parking",
//     description: "Private garage parking with 24/7 access",
//     address: "789 Pine St",
//     city: "San Francisco",
//     state: "CA",
//     zip_code: "94111",
//     latitude: "37.792",
//     longitude: "-122.410",
//     price_per_hour: "10.00",
//     created_at: "2025-04-05T05:55:18.997613Z",
//     updated_at: "2025-04-05T05:55:18.997647Z",
//     images: [
//       {
//         id: 6,
//         image_key: "listings/12/garage.jpg",
//         is_primary: true,
//         url: "/placeholder.svg?height=200&width=300",
//         created_at: "2025-04-05T05:55:19.766282Z",
//       },
//     ],
//   },
//   {
//     id: 13,
//     name: "Convenient Street Parking",
//     description: "Easy access street parking near public transit",
//     address: "321 Elm St",
//     city: "San Francisco",
//     state: "CA",
//     zip_code: "94102",
//     latitude: "37.775",
//     longitude: "-122.419",
//     price_per_hour: "3.00",
//     created_at: "2025-04-05T05:55:18.997613Z",
//     updated_at: "2025-04-05T05:55:18.997647Z",
//     images: [
//       {
//         id: 7,
//         image_key: "listings/13/street.jpg",
//         is_primary: true,
//         url: "/placeholder.svg?height=200&width=300",
//         created_at: "2025-04-05T05:55:19.766282Z",
//       },
//     ],
//   },
//   {
//     id: 14,
//     name: "Large Driveway for SUVs",
//     description: "Spacious driveway that can accommodate large vehicles",
//     address: "654 Maple Dr",
//     city: "San Francisco",
//     state: "CA",
//     zip_code: "94118",
//     latitude: "37.782",
//     longitude: "-122.460",
//     price_per_hour: "8.00",
//     created_at: "2025-04-05T05:55:18.997613Z",
//     updated_at: "2025-04-05T05:55:18.997647Z",
//     images: [
//       {
//         id: 8,
//         image_key: "listings/14/driveway.jpg",
//         is_primary: true,
//         url: "/placeholder.svg?height=200&width=300",
//         created_at: "2025-04-05T05:55:19.766282Z",
//       },
//     ],
//   },
// ]

export default function SearchPage() {
  const router = useRouter()
  const [location, setLocation] = useState("")
  const [locationData, setLocationData] = useState<Prediction>()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("")
  const [searchResults, setSearchResults] = useState<ParkingSpot[]>([])
  const [isSearching, setIsSearching] = useState(false)

 
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)

    // Simulate search delay
    setTimeout(() => {
      // In a real app, you would fetch results from an API using the location data
      // In a real app, you would fetch results from an API using the location data
      // For now, we'll just use our mock data
      console.log("Searching with location data:", locationData)
      ApiClient.get(`/api/places/get-listings-by-location/?latitude=${locationData?.latitude}&longitude=${locationData?.longitude}&latitude_range=0.01&longitude_range=0.01`)
        .then(response => {
          setSearchResults(response as any); // Type casting to 'any' to avoid type errors
        })
        .catch(error => {
          console.error("Error fetching parking spots:", error);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 1000)
  }

  const handleLocationSelect = (place: Prediction) => {
    setLocationData(place)
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

            <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-md p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <LocationSearch onLocationSelect={handleLocationSelect} />
                </div>

                <div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="date" className="pl-10" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="time" className="pl-10" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>
                </div>

                <div>
                  <Button type="submit" className="w-full" disabled={isSearching}>
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

            {searchResults.length === 0 ? (
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

