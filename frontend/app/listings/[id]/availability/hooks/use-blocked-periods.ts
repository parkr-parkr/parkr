"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/shadcn/toast-context"
import { ApiClient } from "@/lib/api-client"
import type { BlockedPeriod, BlockedPeriodWithMeta, NewBlockedPeriod } from "../types/calendar-blocking"

export function useBlockedPeriods(listingId: string) {
  const { toast } = useToast()
  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingBlocks, setDeletingBlocks] = useState<Record<number, boolean>>({})

  const fetchBlockedPeriods = async () => {
    setIsLoading(true)
    try {
      const { data, success, error } = await ApiClient.get<BlockedPeriod[]>(
        `/api/places/blocked-periods/?place_id=${listingId}`,
      )

      if (success && data) {
        // Update the state without changing the active tab
        setBlockedPeriods(data)
      } else {
        toast({
          title: "Error",
          description: error || "Failed to load blocked periods",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error fetching blocked periods:", err)
      toast({
        title: "Error",
        description: "Failed to load blocked periods. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the addBlockedPeriod function to handle reason merging better
  const addBlockedPeriod = async (newBlock: NewBlockedPeriod & { suppressDefaultToast?: boolean }) => {
    setIsSubmitting(true)
    try {
      // Create Date objects from the input values
      const startDateTime = new Date(newBlock.start_datetime)
      const endDateTime = new Date(newBlock.end_datetime)

      // Add client-side validation before making the API call
      if (endDateTime <= startDateTime) {
        toast({
          title: "Invalid Time Range",
          description: "End time must be after start time",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return false
      }

      // Format the dates with timezone information
      const formattedStartDateTime = startDateTime.toISOString()
      const formattedEndDateTime = endDateTime.toISOString()

      // Check for existing blocks that completely contain this time period
      // This is a client-side check to prevent duplicate API calls
      const existingBlock = blockedPeriods.find((block) => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)

        // Check if the new block is completely contained within an existing block
        return blockStart <= startDateTime && blockEnd >= endDateTime
      })

      if (existingBlock) {
        toast({
          title: "Information",
          description: "This time period is already blocked",
        })
        setIsSubmitting(false)
        return true
      }

      // Extract suppressDefaultToast flag and remove it from the payload
      const { suppressDefaultToast, ...blockData } = newBlock

      const { data, success, error } = await ApiClient.post<BlockedPeriodWithMeta>("/api/places/blocked-periods/", {
        place_id: listingId,
        // Send ISO strings to ensure timezone information is preserved
        start_datetime: formattedStartDateTime,
        end_datetime: formattedEndDateTime,
        block_type: blockData.block_type,
        reason: blockData.reason || "",
        is_recurring: blockData.is_recurring,
        recurring_pattern: blockData.recurring_pattern,
        recurring_end_date: blockData.recurring_end_date
          ? new Date(blockData.recurring_end_date).toISOString().split("T")[0]
          : undefined,
      })

      if (success && data) {
        if (data.contained) {
          // Block already exists, no need to update state
          if (!suppressDefaultToast) {
            toast({
              title: "Information",
              description: data.message || "This time period is already blocked",
            })
          }
          return true
        } else if (data.merged && data.deleted_block_ids) {
          // Remove the deleted blocks from the state
          setBlockedPeriods(blockedPeriods.filter((period) => !data.deleted_block_ids?.includes(period.id)))

          // Add the new merged block
          setBlockedPeriods((prev) => [...prev, data])

          if (!suppressDefaultToast) {
            toast({
              title: "Success",
              description: data.message || "Blocks merged successfully",
            })
          }
        } else {
          // Just add the new block
          setBlockedPeriods([...blockedPeriods, data])

          if (!suppressDefaultToast) {
            toast({
              title: "Success",
              description: "Blocked period added successfully",
            })
          }
        }
        return true
      } else {
        toast({
          title: "Error",
          description: error || "Failed to add blocked period",
          variant: "destructive",
        })
        return false
      }
    } catch (err) {
      console.error("Error adding blocked period:", err)
      toast({
        title: "Error",
        description: "Failed to add blocked period. Please try again later.",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const removeBlockedPeriod = async (id: number) => {
    // Check if this block is already being deleted
    if (deletingBlocks[id]) {
      return
    }

    try {
      // Mark this block as being deleted
      setDeletingBlocks((prev) => ({ ...prev, [id]: true }))

      // Optimistically remove from UI first
      setBlockedPeriods(blockedPeriods.filter((period) => period.id !== id))

      const { success, error, status } = await ApiClient.delete(`/api/places/blocked-periods/${id}/`)

      if (success) {
        toast({
          title: "Success",
          description: "Blocked period removed successfully",
        })
      } else {
        // If it's a 404, the block was already deleted
        if (status === 404) {
          toast({
            title: "Information",
            description: "This block has already been deleted",
          })
        } else {
          // For other errors, show the error and restore the block in the UI
          toast({
            title: "Error",
            description: error || "Failed to remove blocked period",
            variant: "destructive",
          })

          // Refetch blocks to restore correct state
          fetchBlockedPeriods()
        }
      }
    } catch (err) {
      console.error("Error removing blocked period:", err)
      toast({
        title: "Error",
        description: "Failed to remove blocked period. Please try again later.",
        variant: "destructive",
      })

      // Refetch blocks to restore correct state
      fetchBlockedPeriods()
    } finally {
      // Clear the deleting state for this block
      setDeletingBlocks((prev) => {
        const updated = { ...prev }
        delete updated[id]
        return updated
      })
    }
  }

  useEffect(() => {
    if (listingId) {
      fetchBlockedPeriods()

      // No event listeners needed
    }
  }, [listingId])

  return {
    blockedPeriods,
    isLoading,
    isSubmitting,
    deletingBlocks,
    fetchBlockedPeriods,
    addBlockedPeriod,
    removeBlockedPeriod,
  }
}
