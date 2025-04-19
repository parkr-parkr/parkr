"use client"

import { Button } from "@/components/shadcn/button"
import { Calendar } from "@/components/shadcn/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { CalendarIcon, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/components/shadcn/toast-context"
import { formatDateTimeForInput } from "../utils/date-utils"

// Define the props interface
interface CalendarSidebarProps {
  selectedDate: Date
  selectedView: "day" | "week" | "month"
  onSelectDate: (date: Date) => void
  onSetQuickBlock: (newBlock: any) => void
  addBlockedPeriod: (newBlock: any) => Promise<boolean>
}

// Export the component as a named export
export function CalendarSidebar({
  selectedDate,
  selectedView,
  onSelectDate,
  onSetQuickBlock,
  addBlockedPeriod,
}: CalendarSidebarProps) {
  const [isCreatingBlock, setIsCreatingBlock] = useState(false)
  const { toast } = useToast()

  // Update the handleBlockEntireView function to prevent duplicate submissions
  const handleBlockEntireView = async () => {
    // If already creating a block, don't allow another submission
    if (isCreatingBlock || !addBlockedPeriod) return

    // Set flag immediately to prevent duplicate submissions
    setIsCreatingBlock(true)

    try {
      let startDate: Date, endDate: Date, blockReason: string

      if (selectedView === "day") {
        // Block entire day
        startDate = new Date(selectedDate)
        startDate.setHours(0, 0, 0, 0)

        endDate = new Date(selectedDate)
        endDate.setHours(23, 59, 59, 999)

        blockReason = "Blocked entire day"
      } else if (selectedView === "week") {
        // Block entire week (Sunday to Saturday)
        startDate = new Date(selectedDate)
        const day = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
        startDate.setDate(startDate.getDate() - day) // Go back to Sunday
        startDate.setHours(0, 0, 0, 0)

        endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + 6) // Go to Saturday
        endDate.setHours(23, 59, 59, 999)

        blockReason = "Blocked entire week"
      } else {
        // Block entire month
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        startDate.setHours(0, 0, 0, 0)

        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)

        blockReason = "Blocked entire month"
      }

      const blockConfig = {
        start_datetime: formatDateTimeForInput(startDate),
        end_datetime: formatDateTimeForInput(endDate),
        is_recurring: false,
        block_type: "owner-block" as const,
        reason: blockReason,
        // Add a flag to suppress the default success message
        suppressDefaultToast: true,
      }

      // Call the API only once
      const success = await addBlockedPeriod(blockConfig)

      if (success) {
        toast({
          title: "Success",
          description: `${blockReason} successfully`,
        })
      }
    } catch (error) {
      console.error("Error creating block:", error)
      toast({
        title: "Error",
        description: "Failed to create block. Please try again.",
        variant: "destructive",
      })
    } finally {
      // Reset the flag after the operation completes
      setIsCreatingBlock(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onSelectDate(date)}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleBlockEntireView}
            disabled={isCreatingBlock}
          >
            {isCreatingBlock ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating block...
              </>
            ) : (
              <>
                <CalendarIcon className="h-4 w-4 mr-2" />
                Block Entire {selectedView === "day" ? "Day" : selectedView === "week" ? "Week" : "Month"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
