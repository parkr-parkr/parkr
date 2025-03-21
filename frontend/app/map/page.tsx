"use client"

import { useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { PreventTextEditing } from "../page-fix"

declare global {
  interface Window {
    google: any
  }
}

export default function MapPage() {
  const searchParams = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const location = searchParams.get("location")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  // Format dates for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  useEffect(() => {
    // Load Google Maps API
    const loadGoogleMaps = async () => {
      if (!window.google) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script")
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`
            script.async = true
            script.defer = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error("Failed to load Google Maps API"))
            document.head.appendChild(script)
          })
        } catch (err) {
          setError("Failed to load Google Maps API")
          setLoading(false)
          return
        }
      }

      // Initialize map
      if (!location) {
        setError("No location specified")
        setLoading(false)
        return
      }

      try {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode({ address: location }, (results, status) => {
          if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
            const position = results[0].geometry.location

            // Create map
            const mapOptions = {
              center: position,
              zoom: 15,
              mapTypeId: window.google.maps.MapTypeId.ROADMAP,
            }

            const map = new window.google.maps.Map(mapRef.current!, mapOptions)

            // Add marker
            const marker = new window.google.maps.Marker({
              position,
              map,
              title: location,
            })

            // Add info window with date information
            if (startDate) {
              const infoContent = `
                <div>
                  <h3 style="font-weight: bold; margin-bottom: 5px;">${location}</h3>
                  <p>From: ${formatDate(startDate)}</p>
                  ${endDate ? `<p>To: ${formatDate(endDate)}</p>` : ""}
                </div>
              `

              const infoWindow = new window.google.maps.InfoWindow({
                content: infoContent,
              })

              infoWindow.open(map, marker)
            }
          } else {
            setError("Could not geocode the location")
          }

          setLoading(false)
        })
      } catch (err) {
        setError("Error initializing map")
        setLoading(false)
      }
    }

    loadGoogleMaps()
  }, [location, startDate, endDate])

  return (
    <div className="flex min-h-screen flex-col">
      <PreventTextEditing />

      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto flex h-16 items-center">
          <Link href="/" className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className="font-medium">Back to Search</span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container max-w-6xl mx-auto py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Parking Near {location}</h1>
            {startDate && (
              <p className="text-muted-foreground">
                {formatDate(startDate)} {endDate ? `- ${formatDate(endDate)}` : ""}
              </p>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center h-[600px] bg-slate-100 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-[600px] bg-slate-100 rounded-lg">
              <div className="text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <Button asChild>
                  <Link href="/">Return to Search</Link>
                </Button>
              </div>
            </div>
          )}

          <div ref={mapRef} className={`h-[600px] rounded-lg ${loading || error ? "hidden" : ""}`}></div>
        </div>
      </main>
    </div>
  )
}

