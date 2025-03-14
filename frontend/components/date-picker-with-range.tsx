"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { CalendarIcon, Clock } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  onDateChange?: (dateRange: DateRange | undefined) => void
}

export function DatePickerWithRange({ className, onDateChange }: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 2),
  })

  // Time state for start and end times
  const [startTime, setStartTime] = React.useState({
    hour: new Date().getHours().toString().padStart(2, "0"),
    minute: new Date().getMinutes().toString().padStart(2, "0"),
  })

  const [endTime, setEndTime] = React.useState({
    hour: new Date().getHours().toString().padStart(2, "0"),
    minute: new Date().getMinutes().toString().padStart(2, "0"),
  })

  // Notify parent component when date changes
  React.useEffect(() => {
    if (onDateChange) {
      onDateChange(date)
    }
  }, [date, onDateChange])

  // Handle date selection separately from time
  const handleDateSelect = (newDateRange: DateRange | undefined) => {
    if (!newDateRange) {
      setDate(undefined)
      return
    }

    // Preserve the time when changing dates
    const newRange: DateRange = {}

    if (newDateRange.from) {
      const newFrom = new Date(newDateRange.from)
      if (date?.from) {
        // Keep the previous time
        newFrom.setHours(date.from.getHours())
        newFrom.setMinutes(date.from.getMinutes())
      } else {
        // Set the time from our time state
        newFrom.setHours(Number.parseInt(startTime.hour))
        newFrom.setMinutes(Number.parseInt(startTime.minute))
      }
      newRange.from = newFrom
    }

    if (newDateRange.to) {
      const newTo = new Date(newDateRange.to)
      if (date?.to) {
        // Keep the previous time
        newTo.setHours(date.to.getHours())
        newTo.setMinutes(date.to.getMinutes())
      } else {
        // Set the time from our time state
        newTo.setHours(Number.parseInt(endTime.hour))
        newTo.setMinutes(Number.parseInt(endTime.minute))
      }
      newRange.to = newTo
    }

    setDate(newRange)
  }

  // Handle time changes
  const handleStartTimeChange = (type: "hour" | "minute", value: string) => {
    setStartTime((prev) => ({ ...prev, [type]: value }))

    if (date?.from) {
      const newFrom = new Date(date.from)
      if (type === "hour") {
        newFrom.setHours(Number.parseInt(value))
      } else {
        newFrom.setMinutes(Number.parseInt(value))
      }

      const newRange: DateRange = { from: newFrom }
      if (date.to) newRange.to = date.to

      setDate(newRange)
    }
  }

  const handleEndTimeChange = (type: "hour" | "minute", value: string) => {
    setEndTime((prev) => ({ ...prev, [type]: value }))

    if (date?.to) {
      const newTo = new Date(date.to)
      if (type === "hour") {
        newTo.setHours(Number.parseInt(value))
      } else {
        newTo.setMinutes(Number.parseInt(value))
      }

      const newRange: DateRange = { from: date.from }
      if (date.to) newRange.to = newTo

      setDate(newRange)
    }
  }

  // Format the display string for the button
  const formatDateTimeRange = () => {
    if (!date?.from) return <span>Pick a date and time</span>

    const fromDate = format(date.from, "LLL dd, y")
    const fromTime = format(date.from, "HH:mm")

    if (!date.to) return `${fromDate} at ${fromTime}`

    const toDate = format(date.to, "LLL dd, y")
    const toTime = format(date.to, "HH:mm")

    return (
      <>
        {fromDate} at {fromTime} - {toDate} at {toTime}
      </>
    )
  }

  // Generate hours and minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateTimeRange()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
            />
            <hr className="my-3 border-t border-gray-200" />
            <div className="grid gap-4">
              <div>
                <div className="flex items-center mb-2">
                  <Clock className="mr-2 h-4 w-4" />
                  <span className="text-sm font-medium">Start Time</span>
                </div>
                <div className="flex gap-2">
                  <select
                    value={startTime.hour}
                    onChange={(e) => handleStartTimeChange("hour", e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {hours.map((hour) => (
                      <option key={`start-hour-${hour}`} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <span className="flex items-center">:</span>
                  <select
                    value={startTime.minute}
                    onChange={(e) => handleStartTimeChange("minute", e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {minutes.map((minute) => (
                      <option key={`start-minute-${minute}`} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {date?.to && (
                <div>
                  <div className="flex items-center mb-2">
                    <Clock className="mr-2 h-4 w-4" />
                    <span className="text-sm font-medium">End Time</span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={endTime.hour}
                      onChange={(e) => handleEndTimeChange("hour", e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {hours.map((hour) => (
                        <option key={`end-hour-${hour}`} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="flex items-center">:</span>
                    <select
                      value={endTime.minute}
                      onChange={(e) => handleEndTimeChange("minute", e.target.value)}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {minutes.map((minute) => (
                        <option key={`end-minute-${minute}`} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

