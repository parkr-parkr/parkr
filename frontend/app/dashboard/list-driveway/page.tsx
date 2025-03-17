"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CarFront, ArrowLeft, MapPin, DollarSign, Clock, ImagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/components/auth-provider"
import { PreventTextEditing } from "@/app/page-fix"
import { useToast } from "@/components/ui/toast-context"

export default function ListDrivewayPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const { toast } = useToast()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingPermission, setIsCheckingPermission] = useState(true)
  const permissionCheckAttempts = useRef(0)
  const maxPermissionCheckAttempts = 3
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    price: "",
    description: "",
  })

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  // Check if user has permission to list driveways - with limits on attempts
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) return
      if (permissionCheckAttempts.current >= maxPermissionCheckAttempts) {
        console.log("Max permission check attempts reached, stopping checks")
        setIsCheckingPermission(false)
        // For development, assume permission is granted after max attempts
        if (process.env.NODE_ENV === "development") {
          setHasPermission(true)
        }
        return
      }

      setIsCheckingPermission(true)
      permissionCheckAttempts.current += 1

      try {
        console.log(`Permission check attempt ${permissionCheckAttempts.current}/${maxPermissionCheckAttempts}`)
        const response = await fetch("http://localhost:8000/api/auth/permissions/", {
          credentials: "include",
        })

        console.log("Permission check response:", response.status)

        if (response.ok) {
          try {
            const data = await response.json()
            console.log("Permission data:", data)
            setHasPermission(data.can_list_driveway)
          } catch (error) {
            console.error("Error parsing permission response:", error)
            // For development, optionally set to true
            if (process.env.NODE_ENV === "development") {
              setHasPermission(true)
            } else {
              setHasPermission(false)
            }
          }
        } else {
          setHasPermission(false)
        }
      } catch (error) {
        console.error("Error checking permissions:", error)
        setHasPermission(false)
      } finally {
        setIsCheckingPermission(false)
      }
    }

    // Only check permission once when the component mounts
    if (user && hasPermission === null) {
      checkPermission()
    }
  }, [user, hasPermission])

  // Redirect if not logged in - only check once
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard/list-driveway")
    }
  }, [user, authLoading, router])

  // Redirect if no permission - only after checking is complete
  useEffect(() => {
    if (!isCheckingPermission && hasPermission === false) {
      toast({
        title: "Permission Required",
        description: "You need permission to list a driveway. Redirecting...",
        variant: "destructive",
      })

      // Add a small delay before redirecting
      const redirectTimer = setTimeout(() => {
        router.push("/dashboard/become-host")
      }, 1500)

      return () => clearTimeout(redirectTimer)
    }
  }, [hasPermission, router, toast, isCheckingPermission])

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const loadingTimeout = setTimeout(() => {
      if (isCheckingPermission) {
        console.log("Loading timeout reached, stopping permission check")
        setIsCheckingPermission(false)
        // For development, assume permission is granted after timeout
        if (process.env.NODE_ENV === "development") {
          setHasPermission(true)
        }
      }
    }, 5000) // 5 second timeout

    return () => clearTimeout(loadingTimeout)
  }, [isCheckingPermission])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Skip permission check in development to avoid excessive API calls
      if (process.env.NODE_ENV !== "development") {
        // Double-check permission before submitting
        const permissionResponse = await fetch("http://localhost:8000/api/auth/permissions/", {
          credentials: "include",
        })

        if (permissionResponse.ok) {
          const permData = await permissionResponse.json()
          if (!permData.can_list_driveway) {
            toast({
              title: "Permission Required",
              description: "You need permission to list a driveway. Redirecting...",
              variant: "destructive",
            })

            setTimeout(() => {
              router.push("/dashboard/become-host")
            }, 1500)
            return
          }
        }
      }

      // Validate form data
      if (
        !formData.name ||
        !formData.address ||
        !formData.city ||
        !formData.state ||
        !formData.zip ||
        !formData.price
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // In a real app, you would submit the form data to your backend
      console.log("Submitting driveway listing:", formData)

      // For development, simulate a successful submission
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Success!",
        description: "Your driveway has been listed successfully",
      })

      // Redirect to dashboard with success message
      router.push("/dashboard?listed=true")
    } catch (error) {
      console.error("Error submitting listing:", error)
      toast({
        title: "Submission Failed",
        description: "There was an error listing your driveway. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking auth and permissions
  if (authLoading || (isCheckingPermission && hasPermission === null)) {
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Loading...</p>
            <p className="text-sm text-muted-foreground mt-2">
              {isCheckingPermission ? "Checking permissions..." : "Loading your account..."}
            </p>
          </div>
        </main>
      </div>
    )
  }

  // If user is not logged in, return null (will redirect via useEffect)
  if (!user) {
    return null
  }

  // If user doesn't have permission, return null (will redirect via useEffect)
  if (hasPermission === false) {
    return null
  }

  // Main content - only show when we have confirmed the user has permission
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
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-6xl mx-auto py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">List Your Driveway</h1>
          <p className="text-muted-foreground mb-8">Share your parking space and earn extra income</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Listing Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Spacious Driveway Near Downtown"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="address"
                    className="pl-10"
                    placeholder="123 Main St"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="San Francisco" value={formData.city} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CA" value={formData.state} onChange={handleChange} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input id="zip" placeholder="94105" value={formData.zip} onChange={handleChange} required />
                </div>
                <div>
                  <Label htmlFor="price">Price per Hour</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      min="1"
                      step="0.01"
                      className="pl-10"
                      placeholder="5.00"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your parking space. Include details like size, access instructions, and any restrictions."
                  className="min-h-[120px]"
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label>Photos</Label>
                <div className="mt-2 border-2 border-dashed rounded-md border-muted p-8 text-center">
                  <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Drag and drop photos here, or click to upload</p>
                  <Button type="button" variant="outline" size="sm">
                    Upload Photos
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="availability">Availability</Label>
                <div className="mt-2 p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monday - Friday</span>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">9:00 AM - 5:00 PM</span>
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full">
                    Set Custom Hours
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Listing..." : "Create Listing"}
              </Button>
            </div>
          </form>
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

