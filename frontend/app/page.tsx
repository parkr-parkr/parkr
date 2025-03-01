import Link from "next/link"
import { CalendarIcon, CarFront, ChevronRight, MapPin, Search, Star } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DatePickerWithRange } from "@/components/date-picker-with-range"
import { LocationSearch } from "@/components/location-search"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <CarFront className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">PARKR</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              List Your Driveway
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              How It Works
            </Link>
            <Link href="#" className="text-sm font-medium hover:underline underline-offset-4">
              Help
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="#" className="hidden md:block text-sm font-medium hover:underline underline-offset-4">
              Sign Up
            </Link>
            <Button>Log In</Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 z-10" />
          <div
            className="h-[500px] bg-cover bg-center"
            style={{ backgroundImage: "url('/placeholder.svg?height=500&width=1200')" }}
          />
          <div className="absolute inset-0 flex items-center z-20">
            <div className="container max-w-7xl mx-auto">
              <div className="max-w-lg space-y-4">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Find the perfect parking spot</h1>
                <p className="text-lg text-muted-foreground">
                  Rent private driveways, garages, and parking spaces in your neighborhood.
                </p>
              </div>
            </div>
          </div>
          <div className="container max-w-7xl mx-auto relative -mt-24 z-30">
            <div className="rounded-xl border bg-card p-6 shadow-lg">
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <MapPin className="mr-1 h-4 w-4" />
                    Location
                  </div>
                  <LocationSearch />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm font-medium">
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    Dates
                  </div>
                  <DatePickerWithRange />
                </div>
                <div className="flex items-end">
                  <Button size="lg" className="w-full">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-muted/50 py-12 md:py-24">
          <div className="container max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight">How PARKR Works</h2>
              <p className="text-muted-foreground mt-2">Find, book, and park in three simple steps</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {howItWorks.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        

        <section className="bg-primary text-primary-foreground py-12 md:py-24">
          <div className="container max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-md">
                <h2 className="text-3xl font-bold tracking-tight mb-4">Ready to earn with your driveway?</h2>
                <p className="mb-6">
                  Turn your unused parking space into extra income. Join thousands of hosts earning money with
                  PARKR.
                </p>
                <Button variant="secondary" size="lg">
                  List Your Space
                </Button>
              </div>
              <div className="w-full max-w-md rounded-xl overflow-hidden">
                <img
                  src="/placeholder.svg?height=300&width=500&text=Earn+with+your+driveway"
                  alt="Earn with your driveway"
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t bg-muted/50">
        <div className="container max-w-7xl mx-auto py-8 md:py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <CarFront className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold">PARKR</span>
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
              © {new Date().getFullYear()} PARKR, Inc. All rights reserved.
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
    </div>
  )
}



const howItWorks = [
  {
    icon: <Search className="h-8 w-8 text-primary" />,
    title: "Find a Spot",
    description: "Search for parking spaces by location, date, and time. Filter by price, features, and ratings.",
  },
  {
    icon: <CalendarIcon className="h-8 w-8 text-primary" />,
    title: "Book & Pay",
    description: "Reserve your spot in advance with secure payment. Receive instant confirmation and directions.",
  },
  {
    icon: <CarFront className="h-8 w-8 text-primary" />,
    title: "Park with Ease",
    description: "Follow the directions to your reserved spot. No more circling blocks looking for parking.",
  },
]

const testimonials = [
  {
    rating: 5,
    text: "I've been using PARKR for my daily commute and it's saved me so much time and stress. No more hunting for parking!",
    name: "Sarah Johnson",
    location: "New York",
  },
  {
    rating: 5,
    text: "As a host, I'm earning extra income from my unused driveway. The platform makes it easy to manage bookings and payments.",
    name: "Michael Chen",
    location: "San Francisco",
  },
  {
    rating: 4,
    text: "Found a perfect spot near the concert venue last weekend. Much cheaper than the venue parking and just a short walk away.",
    name: "Jessica Williams",
    location: "Chicago",
  },
]

