"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/shadcn/dialog"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { Textarea } from "@/components/shadcn/textarea"
import { fetchWithCsrf } from "@/lib/csrf"
import { useToast } from "@/components/shadcn/toast-context"
import { X, PlusCircle, AlertTriangle, Star } from "lucide-react"

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

interface EditListingDialogProps {
  listing: Listing | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onListingUpdated: (updatedListing: Listing) => void
}

export function EditListingDialog({ listing, open, onOpenChange, onListingUpdated }: EditListingDialogProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<Partial<Listing>>({})
  const [hasChanges, setHasChanges] = useState(false)
  const [images, setImages] = useState<Listing["images"]>([])
  const [newImages, setNewImages] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const originalFormData = useRef<Partial<Listing>>({})

  // Confirmation dialog states
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<number | null>(null)

  // Initialize form data when listing changes or dialog opens
  useEffect(() => {
    if (listing && open) {
      const initialData = {
        name: listing.name,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip_code: listing.zip_code,
        price_per_hour: listing.price_per_hour,
        description: listing.description,
      }
      setFormData(initialData)
      originalFormData.current = initialData
      setImages(listing.images || [])
      setNewImages([])
      setHasChanges(false)
    }
  }, [listing, open])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    const newValue = name === "price_per_hour" ? Number.parseFloat(value) : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Check if this change makes the form different from original
    setHasChanges(true)
  }

  const handleCloseRequest = () => {
    if (hasChanges || newImages.length > 0) {
      setShowCloseConfirm(true)
    } else {
      onOpenChange(false)
    }
  }

  const confirmClose = () => {
    setShowCloseConfirm(false)
    onOpenChange(false)
  }

  const cancelClose = () => {
    setShowCloseConfirm(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files)
      setNewImages((prev) => [...prev, ...filesArray])
      setHasChanges(true)
    }
  }

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = async (imageId: number) => {
    if (!listing) return

    setImageToDelete(imageId)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteImage = async () => {
    if (imageToDelete === null) return

    try {
      const response = await fetchWithCsrf(`http://localhost:8000/api/places/images/${imageToDelete}/`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete image")
      }

      setImages((prev) => prev.filter((img) => img.id !== imageToDelete))
      toast({
        title: "Success",
        description: "Image deleted successfully",
      })
    } catch (err) {
      console.error("Error deleting image:", err)
      toast({
        title: "Error",
        description: "Failed to delete image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setShowDeleteConfirm(false)
      setImageToDelete(null)
    }
  }

  const cancelDeleteImage = () => {
    setShowDeleteConfirm(false)
    setImageToDelete(null)
  }

  const handleSetPrimary = async (imageId: number) => {
    if (!listing) return

    try {
      const response = await fetchWithCsrf(`http://localhost:8000/api/places/images/${imageId}/set-primary/`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to set primary image")
      }

      // Update local state to reflect the change
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_primary: img.id === imageId,
        })),
      )

      toast({
        title: "Success",
        description: "Primary image updated",
      })
    } catch (err) {
      console.error("Error setting primary image:", err)
      toast({
        title: "Error",
        description: "Failed to set primary image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const uploadImages = async (listingId: number): Promise<boolean> => {
    if (newImages.length === 0) return true

    setIsUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < newImages.length; i++) {
        const formData = new FormData()
        formData.append("image", newImages[i])
        formData.append("place_id", listingId.toString())
        formData.append("is_primary", (images.length === 0 && i === 0).toString())

        const response = await fetchWithCsrf(`http://localhost:8000/api/places/images/`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload image ${i + 1}`)
        }

        // Update progress
        setUploadProgress(Math.round(((i + 1) / newImages.length) * 100))
      }

      return true
    } catch (err) {
      console.error("Error uploading images:", err)
      toast({
        title: "Error",
        description: "Failed to upload one or more images. Please try again.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!listing) return

    setIsLoading(true)

    try {
      // First update the listing details
      const response = await fetchWithCsrf(`http://localhost:8000/api/places/listings/${listing.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update listing")
      }

      const updatedListing = await response.json()

      // Then upload any new images
      const imagesUploaded = await uploadImages(listing.id)

      if (imagesUploaded) {
        // Fetch the updated listing with new images
        const refreshResponse = await fetchWithCsrf(`http://localhost:8000/api/places/listings/${listing.id}/`)

        if (refreshResponse.ok) {
          const refreshedListing = await refreshResponse.json()
          onListingUpdated(refreshedListing)
        } else {
          // If refresh fails, still update with what we have
          onListingUpdated({
            ...listing,
            ...updatedListing,
            images: images,
          })
        }

        toast({
          title: "Success",
          description: "Listing updated successfully",
        })

        setHasChanges(false)
        setNewImages([])
        onOpenChange(false)
      }
    } catch (err) {
      console.error("Error updating listing:", err)
      toast({
        title: "Error",
        description: "Failed to update listing. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getImageUrl = (image: Listing["images"][0]) => {
    return image.url || image.image || "/placeholder.svg?height=200&width=400"
  }

  if (!listing) return null

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseRequest}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Listing Name</Label>
                <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price_per_hour">Price per Hour ($)</Label>
                <Input
                  id="price_per_hour"
                  name="price_per_hour"
                  min="0"
                  value={formData.price_per_hour || ""}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={formData.address || ""} onChange={handleChange} required />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={formData.city || ""} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" value={formData.state || ""} onChange={handleChange} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">ZIP Code</Label>
                <Input id="zip_code" name="zip_code" value={formData.zip_code || ""} onChange={handleChange} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description || ""}
                onChange={handleChange}
              />
            </div>

            {/* Images Section */}
            <div className="space-y-4">
              <Label>Images</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={isLoading || isUploading}
              />

              {/* Combined Images Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {/* Existing Images */}
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                      <img
                        src={getImageUrl(image) || "/placeholder.svg"}
                        alt="Listing"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=200&width=200"
                        }}
                      />
                    </div>

                    {/* Always visible delete button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                      onClick={() => handleRemoveExistingImage(image.id)}
                      disabled={isLoading || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {/* Set as primary button - only show if not already primary */}
                    {!image.is_primary && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="absolute bottom-2 left-2 text-xs px-2 py-1 h-auto flex items-center gap-1 bg-white/90 hover:bg-white shadow-md"
                        onClick={() => handleSetPrimary(image.id)}
                        disabled={isLoading || isUploading}
                      >
                        <Star className="h-3 w-3" />
                        Set as Main
                      </Button>
                    )}

                    {/* Primary badge */}
                    {image.is_primary && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                        <Star className="h-3 w-3 fill-current" />
                        Main Photo
                      </div>
                    )}
                  </div>
                ))}

                {/* New Images */}
                {newImages.map((file, index) => (
                  <div key={`new-${index}`} className="relative group">
                    <div className="aspect-square overflow-hidden rounded-md border bg-muted">
                      <img
                        src={URL.createObjectURL(file) || "/placeholder.svg"}
                        alt="New upload"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    {/* Always visible delete button */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                      onClick={() => handleRemoveNewImage(index)}
                      disabled={isLoading || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>

                    {/* Will be primary badge */}
                    {images.length === 0 && index === 0 && (
                      <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                        <Star className="h-3 w-3 fill-current" />
                        Will be Main
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Image Card with Button */}
                <div className="aspect-square rounded-md border border-dashed bg-muted flex flex-col items-center justify-center">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                    disabled={isLoading || isUploading}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Image
                  </Button>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading images...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseRequest} disabled={isLoading || isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isUploading}>
                {isLoading || isUploading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to close without saving? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={cancelClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmClose}>
              Discard Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Image Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Image
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={cancelDeleteImage}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteImage}>
              Delete Image
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

