"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CalendarIcon, CarFront, MapPin, Search, CheckCircle2, DollarSign, Clock, ParkingCircle } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { Separator } from "@/components/shadcn/separator"
import { DatePickerWithRange } from "@/components/features/date-picker-with-range"
import { LocationSearch, type Prediction } from "@/components/features/location-search"
import { useAuth } from "@/components/providers/auth-provider"
import { ListDrivewayButton } from "@/components/features/list-driveway-button"
import { NavBar } from "@/components/features/nav-bar"
import type { DateRange } from "react-day-picker"

export default function Home() {
  const router = useRouter()
  const { user, isLoading, logout } = useAuth()
  const [selectedLocation, setSelectedLocation] = useState<Prediction | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(new Date().setDate(new Date().getDate() + 2)),
  })

  // Update the handleSearch function to properly serialize the location data
  const handleSearch = () => {
    if (!selectedLocation) {
      alert("Please select a location")
      return
    }

    // Construct query parameters with properly serialized location data
    const params = new URLSearchParams()

    // Add location data as separate parameters
    params.append("lat", selectedLocation.latitude)
    params.append("lng", selectedLocation.longitude)
    params.append("address", selectedLocation.formattedAddress)
    params.append("place_id", selectedLocation.place_id)
    params.append("displayName", selectedLocation.displayName)

    // Add date range parameters
    if (dateRange?.from) {
      params.append("startDate", dateRange.from.toISOString())
    }

    if (dateRange?.to) {
      params.append("endDate", dateRange.to.toISOString())
    }

    // Navigate to the search page with query parameters
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        showListDriveway={true}
        navItems={[
          { label: "How It Works", href: "#" },
          { label: "Help", href: "#" },
        ]}
      />

      <main className="flex-1">
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 z-10" />
          <div
            className="h-[500px] bg-cover bg-center"
            style={{ backgroundImage: "url('/placeholder.svg?height=500&width=1200')" }}
          />
          <div className="absolute inset-0 flex items-center z-20">
            <div className="container max-w-4xl mx-auto">
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find the perfect parking spot</h1>
                <p className="text-lg text-muted-foreground">
                  Rent private driveways, garages, and parking spaces in your neighborhood.
                </p>
              </div>
            </div>
          </div>
          <div className="container relative -mt-24 z-30 max-w-4xl mx-auto">
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <MapPin className="mr-1 h-4 w-4" />
                    Location
                  </div>
                  <LocationSearch onLocationSelect={setSelectedLocation} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    Dates
                  </div>
                  <DatePickerWithRange onDateChange={setDateRange} />
                </div>
                <div className="flex items-end">
                  <Button size="lg" className="w-full" onClick={handleSearch}>
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The rest of your sections remain unchanged */}
        <section className="py-24 bg-slate-50">
          <div className="container max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">How ParkShare Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Finding or sharing a parking space has never been easier. Join our community of hosts and drivers today.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Find a Space</h3>
                <p className="text-muted-foreground">
                  Search for available parking spaces in your desired location and book instantly.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Park with Ease</h3>
                <p className="text-muted-foreground">
                  Arrive at your reserved spot at the scheduled time. No hunting for parking required.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-6">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
                <p className="text-muted-foreground">
                  Verified hosts, secure payments, and 24/7 customer support for peace of mind.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24">
          <div className="container max-w-6xl mx-auto">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight mb-4">List Your Driveway</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Turn your empty driveway into extra income. Join thousands of hosts earning money by sharing their
                parking spaces.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Earn Extra Income</h3>
                    <p className="text-muted-foreground">Make money from your unused parking space.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Flexible Schedule</h3>
                    <p className="text-muted-foreground">Choose when your space is available.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ParkingCircle className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">Easy Management</h3>
                    <p className="text-muted-foreground">Simple tools to manage your listings and bookings.</p>
                  </div>
                </div>
              </div>
              {/* Replace the Button with ListDrivewayButton */}
              <ListDrivewayButton size="lg" className="mt-8">
                Start Hosting
              </ListDrivewayButton>
            </div>
          </div>
        </section>
        <footer className="border-t bg-muted/50">
          <div className="container max-w-8xl mx-auto py-8 md:py-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
              <div className="col-span-2 lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <CarFront className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">ParkShare</span>
                </div>
                <p className="text-muted-foreground max-w-xs">
                  The easiest way to find and book parking spaces in your neighborhood.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      About
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Press
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Blog
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Safety
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Cancellation
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      COVID-19
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Terms
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Privacy
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Cookies
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-muted-foreground hover:text-foreground">
                      Licenses
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <Separator className="my-8" />
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} ParkShare, Inc. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  <span className="sr-only">Facebook</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                  <span className="sr-only">Instagram</span>
                </Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                  <span className="sr-only">Twitter</span>
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
