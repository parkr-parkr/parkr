"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CarFront, ArrowLeft, MapPin, DollarSign, ImagePlus, ShieldAlert, X } from "lucide-react"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Textarea } from "@/components/shadcn/textarea"
import { Label } from "@/components/shadcn/label"
import { useAuth } from "@/components/providers/auth-provider"
import { useToast } from "@/components/shadcn/toast-context"
import { ApiClient } from "@/lib/api-client"

export default function ListDrivewayPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, checkAuth } = useAuth()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    price: "",
    description: "",
  })

  // Add state for photos
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files)

      // Limit to 5 photos total
      const totalPhotos = [...photos, ...newFiles]
      if (totalPhotos.length > 5) {
        toast({
          title: "Too many photos",
          description: "You can upload a maximum of 5 photos",
          variant: "destructive",
        })
        return
      }

      // Create preview URLs for the new files
      const newPreviewUrls = newFiles.map((file) => URL.createObjectURL(file))

      // Update state
      setPhotos((prev) => [...prev, ...newFiles])
      setPhotoPreviewUrls((prev) => [...prev, ...newPreviewUrls])
    }
  }

  // Handle photo removal
  const handleRemovePhoto = (index: number) => {
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(photoPreviewUrls[index])

    // Remove the photo and its preview URL
    setPhotos((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // Trigger file input click when the upload button is clicked
  const handleUploadButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard/list-driveway")
    }
  }, [user, authLoading, router])

  // Redirect if no permission - directly check user.can_list_driveway
  useEffect(() => {
    if (!authLoading && user && user.can_list_driveway === false) {
      toast({
        title: "Permission Required",
        description: "You need to become a host before listing a driveway.",
        variant: "destructive",
      })

      // Add a small delay before redirecting
      const redirectTimer = setTimeout(() => {
        router.push("/dashboard/become-host")
      }, 1500)

      return () => clearTimeout(redirectTimer)
    }
  }, [user, authLoading, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
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

      console.log("Submitting form with photos:", photos.length)

      // Submit the form data using our API client
      await ApiClient.listDriveway({
        name: formData.name,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip,
        price_per_hour: formData.price,
        photos: photos,
      })

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
        description:
          error instanceof Error ? error.message : "There was an error listing your driveway. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state while checking auth
  if (authLoading) {
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
            <p className="text-sm text-muted-foreground mt-2">Loading your account...</p>
          </div>
        </main>
      </div>
    )
  }

  // If user is not logged in, return null (will redirect via useEffect)
  if (!user) {
    return null
  }

  // If user doesn't have permission, show a message with a button to become a host
  if (user.can_list_driveway === false) {
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
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <div className="rounded-full bg-yellow-100 p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Host Permission Required</h2>
            <p className="text-muted-foreground mb-6">
              You need to become a host before you can list your driveway. Becoming a host allows you to list your
              parking spaces and earn extra income.
            </p>
            <Button onClick={() => router.push("/dashboard/become-host")}>Become a Host</Button>
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

  // Main content - only show when we have confirmed the user has permission
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
                      min="1"
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
                <div className="mt-2 border-2 border-dashed rounded-md border-muted p-6">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  {/* Photo preview area */}
                  {photoPreviewUrls.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {photoPreviewUrls.map((url, index) => (
                          <div key={index} className="relative group">
                            <div className="aspect-square rounded-md overflow-hidden border">
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`Driveway photo ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}

                        {/* Add more photos button */}
                        {photoPreviewUrls.length < 5 && (
                          <button
                            type="button"
                            onClick={handleUploadButtonClick}
                            className="aspect-square rounded-md border-2 border-dashed border-muted flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                          >
                            <ImagePlus className="h-8 w-8 mb-2" />
                            <span className="text-xs">Add Photo</span>
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground text-center">
                        {photoPreviewUrls.length} of 5 photos added
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-4">Add up to 5 photos of your driveway</p>
                      <Button type="button" variant="outline" size="sm" onClick={handleUploadButtonClick}>
                        Upload Photos
                      </Button>
                    </div>
                  )}
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

