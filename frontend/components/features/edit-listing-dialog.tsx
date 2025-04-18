"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/shadcn/dialog"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Textarea } from "@/components/shadcn/textarea"
import { Label } from "@/components/shadcn/label"
import { DollarSign, Loader2 } from "lucide-react"
import { LocationSearch, type Prediction } from "@/components/features/location-search"
import { ApiClient } from "@/lib/api-client"
import { useToast } from "@/components/shadcn/toast-context"

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

interface EditListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  listing: ParkingSpot | null
  onListingUpdated: (updatedListing: ParkingSpot) => void
}

export function EditListingDialog({ open, onOpenChange, listing, onListingUpdated }: EditListingDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<Partial<ParkingSpot>>({})
  const [locationData, setLocationData] = useState<Prediction | null>(null)
  const [errors, setErrors] = useState<{
    name?: string
    address?: string
    price_per_hour?: string
    description?: string
  }>({})

  // Reset form data when listing changes
  useEffect(() => {
    if (listing) {
      setFormData({
        name: listing.name,
        description: listing.description || "",
        address: listing.address,
        price_per_hour: listing.price_per_hour,
      })

      // Set location data if available
      if (listing.latitude && listing.longitude) {
        setLocationData({
          latitude: listing.latitude,
          longitude: listing.longitude,
          formattedAddress: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip_code}`,
          displayName: listing.name,
          place_id: `listing-${listing.id}`,
        })
      } else {
        setLocationData(null)
      }
    }
  }, [listing])

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))

    // Clear error when field is edited
    if (errors[id as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }))
    }

    // Validate specific fields
    if (id === "name" && value.trim() === "") {
      setErrors((prev) => ({ ...prev, name: "Listing name is required" }))
    }

    if (id === "price_per_hour") {
      if (value === "") {
        setErrors((prev) => ({ ...prev, price_per_hour: "Price is required" }))
      } else if (isNaN(Number(value)) || Number(value) <= 0) {
        setErrors((prev) => ({ ...prev, price_per_hour: "Price must be a positive number" }))
      }
    }
  }

  // Handle location selection
  const handleLocationSelect = (prediction: Prediction) => {
    setLocationData(prediction)
    setFormData((prev) => ({
      ...prev,
      address: prediction.formattedAddress,
    }))

    // Clear address error when location is selected
    if (errors.address) {
      setErrors((prev) => ({ ...prev, address: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!listing) return

    // Validate all fields
    const newErrors: typeof errors = {}

    if (!formData.name || formData.name.trim() === "") {
      newErrors.name = "Listing name is required"
    }

    if (!locationData) {
      newErrors.address = "Please select a valid address"
    }

    if (!formData.price_per_hour) {
      newErrors.price_per_hour = "Price is required"
    } else if (isNaN(Number(formData.price_per_hour)) || Number(formData.price_per_hour) <= 0) {
      newErrors.price_per_hour = "Price must be a positive number"
    }

    // If there are validation errors, show them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare data for API
      const updateData = {
        name: formData.name,
        address: formData.address || locationData.formattedAddress,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        price_per_hour: formData.price_per_hour,
        description: formData.description || "",
      }

      // Submit the form data using our API client's updateListing method
      const updatedListing = await ApiClient.updateListing(listing.id, updateData)

      toast({
        title: "Success!",
        description: "Your listing has been updated successfully",
      })

      // Notify parent component with the updated listing
      onListingUpdated(updatedListing)

      // Close the dialog
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating listing:", error)
      toast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "There was an error updating your listing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
          <DialogDescription>Update the details of your parking space listing.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Listing Name</Label>
            <Input
              id="name"
              placeholder="e.g., Spacious Driveway Near Downtown"
              value={formData.name || ""}
              onChange={handleChange}
              required
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <LocationSearch
              onLocationSelect={handleLocationSelect}
              initialValue={formData.address}
              initialPrediction={locationData || undefined}
            />
            {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_per_hour">Price per Hour</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="price_per_hour"
                min="1"
                className={`pl-10 ${errors.price_per_hour ? "border-red-500" : ""}`}
                placeholder="5.00"
                value={formData.price_per_hour || ""}
                onChange={handleChange}
                required
              />
            </div>
            {errors.price_per_hour && <p className="text-sm text-red-500 mt-1">{errors.price_per_hour}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your parking space. Include details like size, access instructions, and any restrictions."
              className={`min-h-[120px] ${errors.description ? "border-red-500" : ""}`}
              value={formData.description || ""}
              onChange={handleChange}
            />
            {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
