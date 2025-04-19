"use client"

import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Loader2, RepeatIcon, TrashIcon } from "lucide-react"

interface BlockedPeriodsListProps {
  blockedPeriods: any[]
  deletingBlocks: Record<number, boolean>
  onRemoveBlock: (id: number) => void
}

export function BlockedPeriodsList({ blockedPeriods, deletingBlocks, onRemoveBlock }: BlockedPeriodsListProps) {
  if (blockedPeriods.length === 0) {
    return (
      <p className="text-center py-8 text-muted-foreground">No blocked periods yet. Your space is always available.</p>
    )
  }

  // Helper function to format date and time display
  const formatBlockDateTimeDisplay = (block: any) => {
    const startDate = new Date(block.start_datetime)
    const endDate = new Date(block.end_datetime)

    // Format dates in MM/DD format
    const formatShortDate = (date: Date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    // Format times in 12-hour format
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }

    // Check if it's a full day block
    const isFullDay =
      startDate.getHours() === 0 &&
      startDate.getMinutes() === 0 &&
      endDate.getHours() === 23 &&
      (endDate.getMinutes() === 59 || endDate.getMinutes() === 0)

    // Check if start and end dates are the same day
    const isSameDay = startDate.toDateString() === endDate.toDateString()

    if (isSameDay) {
      // Same day block
      if (isFullDay) {
        return `${formatShortDate(startDate)} (All day)`
      } else {
        return `${formatShortDate(startDate)}, ${formatTime(startDate)} - ${formatTime(endDate)}`
      }
    } else {
      // Multi-day block
      if (isFullDay) {
        return `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
      } else {
        return `${formatShortDate(startDate)}, ${formatTime(startDate)} - ${formatShortDate(endDate)}, ${formatTime(endDate)}`
      }
    }
  }

  return (
    <div className="space-y-4">
      {blockedPeriods.map((period) => (
        <div key={period.id} className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium">{formatBlockDateTimeDisplay(period)}</h3>
              {period.is_recurring && (
                <p className="text-sm text-muted-foreground flex items-center mt-1">
                  <RepeatIcon className="h-3 w-3 mr-1" />
                  Repeats {period.recurring_pattern}
                  {period.recurring_end_date && ` until ${new Date(period.recurring_end_date).toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="flex items-center">
              <Badge
                className={
                  period.block_type === "booking"
                    ? "bg-blue-500"
                    : period.block_type === "maintenance"
                      ? "bg-amber-500"
                      : "bg-gray-500"
                }
              >
                {period.block_type === "booking"
                  ? "Booking"
                  : period.block_type === "maintenance"
                    ? "Maintenance"
                    : "Owner Block"}
              </Badge>
              {period.block_type !== "booking" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveBlock(period.id)}
                  className="ml-2"
                  disabled={deletingBlocks[period.id]}
                >
                  {deletingBlocks[period.id] ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TrashIcon className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
          {period.reason && <p className="text-sm">{period.reason}</p>}
        </div>
      ))}
    </div>
  )
}
