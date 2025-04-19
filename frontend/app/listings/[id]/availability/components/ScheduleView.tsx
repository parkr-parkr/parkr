"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { AlertCircle, RepeatIcon, TrashIcon, Loader2 } from "lucide-react"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { formatDateRange, formatDayHeader, formatTimeRange } from "../utils/date-utils"
import { useEffect } from "react"

interface ScheduleViewProps {
  selectedDate: Date
  selectedView: string
  blockedPeriods: any[]
  deletingBlocks: Record<number, boolean>
  isSelectedDateFullyBlocked: () => any
  getSelectedDatePosition: (block: any) => string
  getBlocksForSelectedDate: () => any[]
  getRecurringBlocksForSelectedDate: () => any[]
  getBlocksByDay: () => { date: Date; blocks: any[]; recurringBlocks: any[] }[]
  onRemoveBlock: (id: number) => void
}

export function ScheduleView({
  selectedDate,
  selectedView,
  blockedPeriods,
  deletingBlocks,
  isSelectedDateFullyBlocked,
  getSelectedDatePosition,
  getBlocksForSelectedDate,
  getRecurringBlocksForSelectedDate,
  getBlocksByDay,
  onRemoveBlock,
}: ScheduleViewProps) {
  console.log("ScheduleView rendering", {
    selectedDate: selectedDate.toISOString(),
    selectedView,
    totalBlockedPeriods: blockedPeriods.length,
  })

  // Log when the component's props change
  useEffect(() => {
    console.log("ScheduleView props changed", {
      selectedDate: selectedDate.toISOString(),
      selectedView,
      totalBlockedPeriods: blockedPeriods.length,
    })
  }, [selectedDate, selectedView, blockedPeriods])

  // Get blocks for the current view and log the results
  const blocksForSelectedDate = getBlocksForSelectedDate()
  console.log("blocksForSelectedDate result:", blocksForSelectedDate.length, "blocks")

  const recurringBlocksForSelectedDate = getRecurringBlocksForSelectedDate()
  console.log("recurringBlocksForSelectedDate result:", recurringBlocksForSelectedDate.length, "blocks")

  const blocksByDay = getBlocksByDay()
  console.log("blocksByDay result:", blocksByDay.length, "days with blocks")

  const fullyBlockedDay = isSelectedDateFullyBlocked()
  console.log("fullyBlockedDay result:", fullyBlockedDay ? `Block ${fullyBlockedDay.id}` : "None")

  // Update the isDateFullyBlocked function to correctly identify fully blocked days
  const isDateFullyBlocked = (day: Date) => {
    const dayStart = new Date(day)
    dayStart.setHours(0, 0, 0, 0)

    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const dayStr = dayStart.toISOString().split("T")[0]
    console.log(`Checking if date ${dayStr} is fully blocked`)

    // Check for blocks that span the entire day
    const fullDayBlocks = blockedPeriods.filter((block) => {
      const blockStart = new Date(block.start_datetime)
      const blockEnd = new Date(block.end_datetime)

      // If the block includes the selected date
      const startsBeforeOrOnDay = blockStart <= dayEnd
      const endsAfterOrOnDay = blockEnd >= dayStart

      // Check if the block overlaps with this day
      if (startsBeforeOrOnDay && endsAfterOrOnDay) {
        // For multi-day blocks, check if it fully contains this day
        const containsEntireDay = blockStart <= dayStart && blockEnd >= dayEnd

        if (containsEntireDay) {
          console.log(
            `Block ${block.id}: (${blockStart.toISOString()} to ${blockEnd.toISOString()}) FULLY BLOCKS ${dayStr}`,
          )
          return true
        }

        // For same-day blocks, check if they cover the entire day
        const isFullDay =
          blockStart.toISOString().split("T")[0] === dayStr &&
          blockStart.getHours() <= 1 &&
          blockEnd.toISOString().split("T")[0] === dayStr &&
          blockEnd.getHours() >= 23

        if (isFullDay) {
          console.log(
            `Block ${block.id}: Same-day block with hours ${blockStart.getHours()}:${blockStart.getMinutes()} to ${blockEnd.getHours()}:${blockEnd.getMinutes()} FULLY BLOCKS ${dayStr}`,
          )
          return true
        }

        console.log(
          `Block ${block.id}: Block (${blockStart.toISOString()} to ${blockEnd.toISOString()}) overlaps with but does NOT fully block ${dayStr}`,
        )
      }

      return false
    })

    const result = fullDayBlocks.length > 0 ? fullDayBlocks[0] : null
    console.log(`Date ${dayStr} fully blocked result:`, result ? `Block ${result.id}` : "Not fully blocked")
    return result
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-lg">
        {selectedView === "day" &&
          selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        {selectedView === "week" &&
          (() => {
            const weekStart = new Date(selectedDate)
            const day = weekStart.getDay()
            weekStart.setDate(weekStart.getDate() - day) // Go back to Sunday

            const weekEnd = new Date(weekStart)
            weekEnd.setDate(weekEnd.getDate() + 6) // Go to Saturday

            return `Week of ${weekStart.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })} - ${weekEnd.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}`
          })()}
        {selectedView === "month" &&
          selectedDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        {selectedView !== "day" &&
          selectedView !== "week" &&
          selectedView !== "month" &&
          selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
      </h3>

      {/* Add alert for fully blocked days */}
      {selectedView === "day" && isDateFullyBlocked(selectedDate) && (
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertTitle className="text-red-500">This day is completely blocked</AlertTitle>
          <AlertDescription>
            {(() => {
              const blockedPeriod = isDateFullyBlocked(selectedDate)
              const startDate = new Date(blockedPeriod.start_datetime)
              const endDate = new Date(blockedPeriod.end_datetime)
              const isMultiDayBlock = startDate.toDateString() !== endDate.toDateString()

              // Only show the period information if it's a multi-day block
              if (isMultiDayBlock) {
                return (
                  <>
                    This day is part of a blocked period:{" "}
                    {formatDateRange(blockedPeriod.start_datetime, blockedPeriod.end_datetime)}
                  </>
                )
              }

              return null
            })()}
            {isDateFullyBlocked(selectedDate).reason && (
              <span className="block mt-1">Reason: {isDateFullyBlocked(selectedDate).reason}</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {selectedView === "day" ? (
        // Day view
        getBlocksForSelectedDate().length === 0 && getRecurringBlocksForSelectedDate().length === 0 ? (
          <div className="py-8 text-center">
            <Badge className="bg-green-500 text-white text-lg py-1 px-3">Available All Day</Badge>
            <p className="mt-2 text-muted-foreground">This parking space is available for the entire day.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Unavailable during:</h4>

            {getBlocksForSelectedDate().map((block) => {
              console.log(`Rendering block ${block.id} for day view`)
              const position = getSelectedDatePosition(block)
              const isMultiDay =
                new Date(block.start_datetime).toDateString() !== new Date(block.end_datetime).toDateString()

              return (
                <div key={block.id} className="p-3 border rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-medium">{formatTimeRange(block.start_datetime, block.end_datetime)}</span>

                    {/* Show date range context for multi-day blocks */}
                    {isMultiDay && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {position === "start-date" && "First day of block: "}
                        {position === "end-date" && "Last day of block: "}
                        {position === "middle-date" && "Part of block: "}
                        <span className="font-medium">{formatDateRange(block.start_datetime, block.end_datetime)}</span>
                      </p>
                    )}

                    {block.reason && <p className="text-sm text-muted-foreground">{block.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        block.block_type === "booking"
                          ? "bg-blue-500"
                          : block.block_type === "maintenance"
                            ? "bg-amber-500"
                            : "bg-gray-500"
                      }
                    >
                      {block.block_type === "booking"
                        ? "Booking"
                        : block.block_type === "maintenance"
                          ? "Maintenance"
                          : "Owner Block"}
                    </Badge>
                    {block.block_type !== "booking" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveBlock(block.id)}
                        disabled={deletingBlocks[block.id]}
                      >
                        {deletingBlocks[block.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}

            {getRecurringBlocksForSelectedDate().map((block) => {
              console.log(`Rendering recurring block ${block.id} for day view`)
              return (
                <div key={`recurring-${block.id}`} className="p-3 border rounded-md flex justify-between items-center">
                  <div>
                    <span className="font-medium">{formatTimeRange(block.start_datetime, block.end_datetime)}</span>
                    <p className="text-sm text-muted-foreground">
                      <RepeatIcon className="h-3 w-3 inline mr-1" />
                      Recurring {block.recurring_pattern} block
                      {block.reason && `: ${block.reason}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-gray-500">Recurring</Badge>
                    {block.block_type !== "booking" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveBlock(block.id)}
                        disabled={deletingBlocks[block.id]}
                      >
                        {deletingBlocks[block.id] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        // Week or Month view - grouped by day
        <div className="space-y-6">
          {getBlocksByDay().length === 0 ? (
            <div className="py-8 text-center">
              <Badge className="bg-green-500 text-white text-lg py-1 px-3">Fully Available</Badge>
              <p className="mt-2 text-muted-foreground">
                This parking space is available for the entire {selectedView}.
              </p>
            </div>
          ) : (
            getBlocksByDay().map((dayBlock) => {
              console.log(`Rendering day block for ${dayBlock.date.toISOString().split("T")[0]}`)
              return (
                <div key={dayBlock.date.toISOString()} className="space-y-2">
                  <h4 className="font-medium text-base bg-gray-100 p-2 rounded-md">
                    {formatDayHeader(dayBlock.date)}
                    {/* Add indicator if this day is fully blocked */}
                    {(() => {
                      const dayFullyBlocked = isDateFullyBlocked(dayBlock.date)
                      if (dayFullyBlocked) {
                        return <Badge className="ml-2 bg-red-500">Fully Blocked</Badge>
                      }
                      return null
                    })()}
                  </h4>

                  {dayBlock.blocks.length === 0 && dayBlock.recurringBlocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground pl-2">
                      {isDateFullyBlocked(dayBlock.date) ? (
                        <span className="text-sm">
                          Part of block:{" "}
                          {formatDateRange(
                            isDateFullyBlocked(dayBlock.date).start_datetime,
                            isDateFullyBlocked(dayBlock.date).end_datetime,
                          )}
                          {isDateFullyBlocked(dayBlock.date).reason && (
                            <span className="block">{isDateFullyBlocked(dayBlock.date).reason}</span>
                          )}
                        </span>
                      ) : (
                        "Available all day"
                      )}
                    </p>
                  ) : (
                    <div className="space-y-2 pl-2">
                      {dayBlock.blocks.map((block) => {
                        console.log(`Rendering block ${block.id} for week/month view`)
                        const isMultiDay =
                          new Date(block.start_datetime).toDateString() !== new Date(block.end_datetime).toDateString()

                        return (
                          <div key={block.id} className="p-3 border rounded-md flex justify-between items-center">
                            <div>
                              <span className="font-medium">
                                {formatTimeRange(block.start_datetime, block.end_datetime)}
                              </span>

                              {/* Show date range context for multi-day blocks */}
                              {isMultiDay && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Part of block:{" "}
                                  <span className="font-medium">
                                    {formatDateRange(block.start_datetime, block.end_datetime)}
                                  </span>
                                </p>
                              )}

                              {block.reason && <p className="text-sm text-muted-foreground">{block.reason}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={
                                  block.block_type === "booking"
                                    ? "bg-blue-500"
                                    : block.block_type === "maintenance"
                                      ? "bg-amber-500"
                                      : "bg-gray-500"
                                }
                              >
                                {block.block_type === "booking"
                                  ? "Booking"
                                  : block.block_type === "maintenance"
                                    ? "Maintenance"
                                    : "Owner Block"}
                              </Badge>
                              {block.block_type !== "booking" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveBlock(block.id)}
                                  disabled={deletingBlocks[block.id]}
                                >
                                  {deletingBlocks[block.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}

                      {dayBlock.recurringBlocks.map((block) => {
                        console.log(`Rendering recurring block ${block.id} for week  => {
                        console.log(\`Rendering recurring block ${block.id} for week/month view`)
                        return (
                          <div
                            key={`recurring-${block.id}-${dayBlock.date.toISOString()}`}
                            className="p-3 border rounded-md flex justify-between items-center"
                          >
                            <div>
                              <span className="font-medium">
                                {formatTimeRange(block.start_datetime, block.end_datetime)}
                              </span>
                              <p className="text-sm text-muted-foreground">
                                <RepeatIcon className="h-3 w-3 inline mr-1" />
                                Recurring {block.recurring_pattern} block
                                {block.reason && `: ${block.reason}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gray-500">Recurring</Badge>
                              {block.block_type !== "booking" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onRemoveBlock(block.id)}
                                  disabled={deletingBlocks[block.id]}
                                >
                                  {deletingBlocks[block.id] ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <TrashIcon className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
