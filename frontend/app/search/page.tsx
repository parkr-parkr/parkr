"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CarFront, Search, Calendar, Clock, Filter, Star } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Card, CardContent } from "@/components/shadcn/card"
import { LocationSearch, Prediction } from "@/components/features/location-search"
import { ApiClient } from "@/lib/api-client"


// Mock data for parking spots
const MOCK_PARKING_SPOTS = [
  {
    id: "1",
    name: "Spacious Driveway Near Downtown",
    address: "123 Main St, San Francisco, CA",
    price: 5,
    rating: 4.8,
    reviews: 24,
    image: "/placeholder.svg?height=200&width=300",
    distance: "0.5 miles away",
  },
  {
    id: "2",
    name: "Covered Parking in Residential Area",
    address: "456 Oak Ave, San Francisco, CA",
    price: 7.5,
    rating: 4.6,
    reviews: 18,
    image: "/placeholder.svg?height=200&width=300",
    distance: "0.8 miles away",
  },
  {
    id: "3",
    name: "Secure Garage Parking",
    address: "789 Pine St, San Francisco, CA",
    price: 10,
    rating: 4.9,
    reviews: 42,
    image: "/placeholder.svg?height=200&width=300",
    distance: "1.2 miles away",
  },
  {
    id: "4",
    name: "Convenient Street Parking",
    address: "321 Elm St, San Francisco, CA",
    price: 3,
    rating: 4.2,
    reviews: 15,
    image: "/placeholder.svg?height=200&width=300",
    distance: "0.3 miles away",
  },
  {
    id: "5",
    name: "Large Driveway for SUVs",
    address: "654 Maple Dr, San Francisco, CA",
    price: 8,
    rating: 4.7,
    reviews: 31,
    image: "/placeholder.svg?height=200&width=300",
    distance: "1.5 miles away",
  },
]

export default function SearchPage() {
  const router = useRouter()
  const [locationData, setLocationData] = useState<Prediction>()
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [duration, setDuration] = useState("")
  const [searchResults, setSearchResults] = useState(MOCK_PARKING_SPOTS)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSearching(true)

    // Simulate search delay
    setTimeout(() => {
      // In a real app, you would fetch results from an API using the location data
      // For now, we'll just use our mock data
      console.log("Searching with location data:", locationData)
      // Use api client to call get-listings-by-location/ with longitude and latitude parameters in location data AI!
      ApiClient.get(``)
      setSearchResults(MOCK_PARKING_SPOTS)
      setIsSearching(false)
    }, 1000)
  }

  const handleLocationSelect = (place: Prediction) => {
    setLocationData(place)
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
                        src={spot.image || "/placeholder.svg"}
                        alt={spot.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm font-medium">
                        ${spot.price}/hr
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium line-clamp-1">{spot.name}</h3>
                        <div className="flex items-center text-sm">
                          <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                          <span>{spot.rating}</span>
                          <span className="text-muted-foreground ml-1">({spot.reviews})</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{spot.address}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{spot.distance}</span>
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
