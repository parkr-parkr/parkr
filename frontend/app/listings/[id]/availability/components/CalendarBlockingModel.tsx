"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/shadcn/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shadcn/tabs"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { formatDateTimeForInput } from "../utils/date-utils"
import { useBlockedPeriods } from "../hooks/use-blocked-periods"

// Import the components directly
import { BlockedPeriodsList } from "./BlockedPeriodsList"
import { AddBlockForm } from "./AddBlockForm"
import { ScheduleView } from "./ScheduleView"
import { CalendarSidebar } from "./CalendarSidebar"

// Define types for clarity
type CalendarView = "day" | "week" | "month"
type BlockType = "owner-block" | "maintenance" | "booking"

interface NewBlockedPeriod {
  start_datetime: string
  end_datetime: string
  is_recurring: boolean
  recurring_pattern?: "daily" | "weekly" | "weekdays" | "weekends"
  recurring_end_date?: string
  reason?: string
  block_type: BlockType
}

// Simplified useCalendarBlocks hook
function useCalendarBlocks(blockedPeriods: any[]) {
  console.log("useCalendarBlocks initialized with", blockedPeriods.length, "blocks")

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedView, setSelectedView] = useState<CalendarView>("week")

  // Simplified implementations with logging
  const getBlocksForSelectedDate = () => {
    console.log("getBlocksForSelectedDate called", {
      selectedDate: selectedDate.toISOString(),
      totalBlocks: blockedPeriods.length,
    })

    // Create a date object for the selected date and set to start of day (00:00:00)
    const selectedDateStart = new Date(selectedDate)
    selectedDateStart.setHours(0, 0, 0, 0)

    // Create a date object for the end of the selected date (23:59:59.999)
    const selectedDateEnd = new Date(selectedDate)
    selectedDateEnd.setHours(23, 59, 59, 999)

    const selectedDateStr = selectedDateStart.toISOString().split("T")[0] // Format as YYYY-MM-DD
    console.log("Looking for blocks on date:", selectedDateStr, {
      selectedDateStart: selectedDateStart.toISOString(),
      selectedDateEnd: selectedDateEnd.toISOString(),
    })

    // Log all blocks with their date ranges for debugging
    console.log(
      "All blocks:",
      blockedPeriods.map((block) => ({
        id: block.id,
        start: new Date(block.start_datetime).toISOString(),
        end: new Date(block.end_datetime).toISOString(),
      })),
    )

    const filteredBlocks = blockedPeriods.filter((block) => {
      // Create Date objects for easier comparison
      const blockStart = new Date(block.start_datetime)
      const blockEnd = new Date(block.end_datetime)

      // A block applies to this day if:
      // 1. Block starts during this day (blockStart >= selectedDateStart AND blockStart <= selectedDateEnd), OR
      // 2. Block ends during this day (blockEnd >= selectedDateStart AND blockEnd <= selectedDateEnd), OR
      // 3. Block spans over this day (blockStart < selectedDateStart AND blockEnd > selectedDateEnd)

      const startsOnDay = blockStart >= selectedDateStart && blockStart <= selectedDateEnd
      const endsOnDay = blockEnd >= selectedDateStart && blockEnd <= selectedDateEnd
      const spansOverDay = blockStart < selectedDateStart && blockEnd > selectedDateEnd

      const applies = startsOnDay || endsOnDay || spansOverDay

      console.log(
        `Block ${block.id} (${blockStart.toISOString()} to ${blockEnd.toISOString()}): ${applies ? "APPLIES" : "DOES NOT APPLY"} to ${selectedDateStr}`,
        {
          startsOnDay,
          endsOnDay,
          spansOverDay,
        },
      )

      return applies
    })

    console.log("Filtered blocks result:", {
      count: filteredBlocks.length,
      blocks: filteredBlocks.map((b) => ({
        id: b.id,
        start: new Date(b.start_datetime).toISOString(),
        end: new Date(b.end_datetime).toISOString(),
      })),
    })

    return filteredBlocks
  }

  const getRecurringBlocksForSelectedDate = () => {
    console.log("getRecurringBlocksForSelectedDate called", {
      selectedDate: selectedDate.toISOString(),
    })

    // Original implementation
    return blockedPeriods.filter(() => false)
  }

  const getBlocksByDay = () => {
    console.log("getBlocksByDay called", {
      selectedDate: selectedDate.toISOString(),
      selectedView,
    })

    // Get the start and end dates for the current view
    let startDate: Date, endDate: Date

    if (selectedView === "week") {
      // For week view, get Sunday to Saturday
      startDate = new Date(selectedDate)
      const day = startDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      startDate.setDate(startDate.getDate() - day) // Go back to Sunday
      startDate.setHours(0, 0, 0, 0)

      endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 6) // Go to Saturday
      endDate.setHours(23, 59, 59, 999)
    } else if (selectedView === "month") {
      // For month view, get first to last day of month
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)

      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Default to just the selected date for day view
      startDate = new Date(selectedDate)
      startDate.setHours(0, 0, 0, 0)

      endDate = new Date(selectedDate)
      endDate.setHours(23, 59, 59, 999)
    }

    console.log("View date range:", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    })

    // Generate an array of dates in the view
    const dates: Date[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      dates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(
      "Dates in view:",
      dates.map((d) => d.toISOString().split("T")[0]),
    )

    // For each date, find blocks that apply to that day
    const result = dates.map((date) => {
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)

      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)

      const dayStr = dayStart.toISOString().split("T")[0]
      console.log(`Finding blocks for ${dayStr}`)

      // Find blocks that overlap with this day
      const dayBlocks = blockedPeriods.filter((block) => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)

        // A block applies to this day if:
        // 1. Block starts during this day, OR
        // 2. Block ends during this day, OR
        // 3. Block spans over this day
        const startsOnDay = blockStart >= dayStart && blockStart <= dayEnd
        const endsOnDay = blockEnd >= dayStart && blockEnd <= dayEnd
        const spansOverDay = blockStart < dayStart && blockEnd > dayEnd

        const applies = startsOnDay || endsOnDay || spansOverDay

        if (applies) {
          console.log(`Block ${block.id} applies to ${dayStr}`)
        }

        return applies
      })

      // Find recurring blocks that apply to this day
      // For now, we'll just return an empty array since the original implementation does this
      const recurringBlocks: any[] = []

      return {
        date,
        blocks: dayBlocks,
        recurringBlocks,
      }
    })

    // Filter to only include days that have blocks
    const daysWithBlocks = result.filter((day) => day.blocks.length > 0 || day.recurringBlocks.length > 0)

    console.log("Days with blocks:", daysWithBlocks.length)

    return daysWithBlocks
  }

  // Update the isSelectedDateFullyBlocked function to properly check if a date is fully blocked

  const isSelectedDateFullyBlocked = () => {
    console.log("isSelectedDateFullyBlocked called", {
      selectedDate: selectedDate.toISOString(),
    })

    const selectedDateStart = new Date(selectedDate)
    selectedDateStart.setHours(0, 0, 0, 0)

    const selectedDateEnd = new Date(selectedDate)
    selectedDateEnd.setHours(23, 59, 59, 999)

    const selectedDateStr = selectedDateStart.toISOString().split("T")[0]

    // Check for blocks that span the entire day
    const fullDayBlocks = blockedPeriods.filter((block) => {
      const blockStart = new Date(block.start_datetime)
      const blockEnd = new Date(block.end_datetime)

      // If the block includes the selected date
      const startsBeforeOrOnDay = blockStart <= selectedDateEnd
      const endsAfterOrOnDay = blockEnd >= selectedDateStart

      // Check if the block overlaps with this day
      if (startsBeforeOrOnDay && endsAfterOrOnDay) {
        // For multi-day blocks, check if it fully contains this day
        const containsEntireDay = blockStart <= selectedDateStart && blockEnd >= selectedDateEnd

        if (containsEntireDay) {
          console.log(`Block ${block.id} fully blocks ${selectedDateStr} (multi-day block)`)
          return true
        }

        // For same-day blocks, check if they cover the entire day
        const isFullDay =
          blockStart.toISOString().split("T")[0] === selectedDateStr &&
          blockStart.getHours() <= 1 &&
          blockEnd.toISOString().split("T")[0] === selectedDateStr &&
          blockEnd.getHours() >= 23

        if (isFullDay) {
          console.log(`Block ${block.id} fully blocks ${selectedDateStr} (same-day block)`)
          return true
        }
      }

      return false
    })

    const result = fullDayBlocks.length > 0 ? fullDayBlocks[0] : null
    console.log("isSelectedDateFullyBlocked result:", result ? `Block ${result.id}` : "None")
    return result
  }

  // Also update the getSelectedDatePosition function to properly determine the position of a block relative to a date

  const getSelectedDatePosition = (block: any) => {
    console.log("getSelectedDatePosition called for block", block.id)

    const selectedDateStr = selectedDate.toISOString().split("T")[0]
    const blockStartDate = new Date(block.start_datetime).toISOString().split("T")[0]
    const blockEndDate = new Date(block.end_datetime).toISOString().split("T")[0]

    if (blockStartDate === selectedDateStr && blockEndDate === selectedDateStr) {
      return "full-day"
    } else if (blockStartDate === selectedDateStr) {
      return "start-date"
    } else if (blockEndDate === selectedDateStr) {
      return "end-date"
    } else {
      return "middle-date"
    }
  }

  // Log when selectedDate changes
  useEffect(() => {
    console.log("selectedDate changed to:", selectedDate.toISOString())
  }, [selectedDate])

  return {
    selectedDate,
    setSelectedDate,
    selectedView,
    setSelectedView,
    getBlocksForSelectedDate,
    getRecurringBlocksForSelectedDate,
    getBlocksByDay,
    isSelectedDateFullyBlocked,
    getSelectedDatePosition,
  }
}

export default function CalendarBlockingModel({ listingId }: { listingId: string }) {
  console.log("CalendarBlockingModel rendering with listingId:", listingId)

  const { blockedPeriods, isLoading, isSubmitting, deletingBlocks, addBlockedPeriod, removeBlockedPeriod } =
    useBlockedPeriods(listingId)

  // Log when blockedPeriods changes
  useEffect(() => {
    console.log("blockedPeriods updated:", {
      count: blockedPeriods.length,
      periods: blockedPeriods.map((b) => ({
        id: b.id,
        start: new Date(b.start_datetime).toISOString(),
        end: new Date(b.end_datetime).toISOString(),
      })),
    })
  }, [blockedPeriods])

  const {
    selectedDate,
    setSelectedDate,
    selectedView,
    setSelectedView,
    getBlocksForSelectedDate,
    getRecurringBlocksForSelectedDate,
    getBlocksByDay,
    isSelectedDateFullyBlocked,
    getSelectedDatePosition,
  } = useCalendarBlocks(blockedPeriods)

  const [newBlock, setNewBlock] = useState<NewBlockedPeriod>({
    start_datetime: formatDateTimeForInput(selectedDate),
    end_datetime: formatDateTimeForInput(new Date(selectedDate.getTime() + 2 * 60 * 60 * 1000)),
    is_recurring: false,
    block_type: "owner-block",
  })

  const updateNewBlock = (field: keyof NewBlockedPeriod, value: any) => {
    console.log(`updateNewBlock: ${field} = ${value}`)
    setNewBlock({ ...newBlock, [field]: value })
  }

  const handleAddBlock = async () => {
    console.log("handleAddBlock called with:", newBlock)
    const success = await addBlockedPeriod(newBlock)
    if (success) {
      console.log("Block added successfully, resetting form")
      const localEndDateTime = new Date(newBlock.end_datetime)
      const newEndDate = new Date(localEndDateTime.getTime() + 2 * 60 * 60 * 1000)
      setNewBlock({
        start_datetime: newBlock.end_datetime,
        end_datetime: formatDateTimeForInput(newEndDate),
        is_recurring: false,
        block_type: "owner-block",
      })
    } else {
      console.log("Failed to add block")
    }
  }

  const handleSetQuickBlock = (quickBlock: NewBlockedPeriod) => {
    console.log("handleSetQuickBlock called with:", quickBlock)
    setNewBlock(quickBlock)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading availability data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Calendar Blocking</h2>
        <div className="flex gap-2">
          <Select
            value={selectedView}
            onValueChange={(v) => {
              console.log("View changed to:", v)
              setSelectedView(v as CalendarView)
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Block Off Unavailable Times</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              defaultValue="list"
              onValueChange={(value) => {
                console.log("Tab changed to:", value)
              }}
            >
              <TabsList className="mb-4">
                <TabsTrigger value="list">Existing Blocks</TabsTrigger>
                <TabsTrigger value="add">Add New Block</TabsTrigger>
                <TabsTrigger value="today">
                  {selectedView === "day"
                    ? "Today's Schedule"
                    : selectedView === "week"
                      ? "Week's Schedule"
                      : "Month's Schedule"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list">
                <BlockedPeriodsList
                  blockedPeriods={blockedPeriods}
                  deletingBlocks={deletingBlocks}
                  onRemoveBlock={removeBlockedPeriod}
                />
              </TabsContent>

              <TabsContent value="add">
                <AddBlockForm
                  newBlock={newBlock}
                  isSubmitting={isSubmitting}
                  onUpdateNewBlock={updateNewBlock}
                  onAddBlock={handleAddBlock}
                />
              </TabsContent>

              <TabsContent value="today">
                <ScheduleView
                  selectedDate={selectedDate}
                  selectedView={selectedView}
                  blockedPeriods={blockedPeriods}
                  deletingBlocks={deletingBlocks}
                  isSelectedDateFullyBlocked={isSelectedDateFullyBlocked}
                  getSelectedDatePosition={getSelectedDatePosition}
                  getBlocksForSelectedDate={getBlocksForSelectedDate}
                  getRecurringBlocksForSelectedDate={getRecurringBlocksForSelectedDate}
                  getBlocksByDay={getBlocksByDay}
                  onRemoveBlock={removeBlockedPeriod}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <CalendarSidebar
          selectedDate={selectedDate}
          selectedView={selectedView}
          onSelectDate={(date) => {
            console.log("Date selected:", date.toISOString())
            setSelectedDate(date)
          }}
          onSetQuickBlock={handleSetQuickBlock}
          addBlockedPeriod={addBlockedPeriod}
        />
      </div>
    </div>
  )
}
