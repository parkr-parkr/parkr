/**
 * Format a date for display
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format date for day headers
 */
export const formatDayHeader = (date: Date): string => {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

/**
 * Format time with optional date info
 */
export const formatTime = (dateString: string, includeDate = false): string => {
  // Create a date object from the string
  const date = new Date(dateString)

  // Format the time in the user's local timezone
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  if (includeDate) {
    const dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
    return `${timeStr} (${dateStr})`
  }

  return timeStr
}

/**
 * Format time range with dates when spanning multiple days
 */
export const formatTimeRange = (startDateStr: string, endDateStr: string): string => {
  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // Check if the dates are different
  const isDifferentDay = startDate.toDateString() !== endDate.toDateString()

  if (isDifferentDay) {
    // If different days, include the date in both times
    return `${formatTime(startDateStr, true)} - ${formatTime(endDateStr, true)}`
  } else {
    // Same day, just show times
    return `${formatTime(startDateStr)} - ${formatTime(endDateStr)}`
  }
}

/**
 * Format a date range in a more readable way
 */
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  // If same day, just show the date once
  if (start.toDateString() === end.toDateString()) {
    return formatDate(startDate)
  }

  // If same month and year, show range with month/year only once
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    const startDay = start.getDate()
    const endDay = end.getDate()
    const month = start.toLocaleDateString("en-US", { month: "short" })
    const year = start.getFullYear()
    return `${month} ${startDay}-${endDay}, ${year}`
  }

  // Otherwise show full range
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Format date for datetime-local input
 */
export function formatDateTimeForInput(date: Date): string {
  // Get local ISO string
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")

  // Format as YYYY-MM-DDThh:mm (local time)
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Get view start and end dates based on selected view
 */
export const getViewDates = (selectedDate: Date, selectedView: "day" | "week" | "month") => {
  let viewStart: Date, viewEnd: Date

  if (selectedView === "day") {
    // Day view - just the selected date
    viewStart = new Date(selectedDate)
    viewStart.setHours(0, 0, 0, 0)

    viewEnd = new Date(selectedDate)
    viewEnd.setHours(23, 59, 59, 999)
  } else if (selectedView === "week") {
    // Week view - start from Sunday of the week containing the selected date
    viewStart = new Date(selectedDate)
    const day = viewStart.getDay() // 0 = Sunday, 1 = Monday, etc.
    viewStart.setDate(viewStart.getDate() - day) // Go back to Sunday
    viewStart.setHours(0, 0, 0, 0)

    viewEnd = new Date(viewStart)
    viewEnd.setDate(viewEnd.getDate() + 6) // Go to Saturday
    viewEnd.setHours(23, 59, 59, 999)
  } else {
    // month view
    // Month view - entire month containing the selected date
    viewStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    viewStart.setHours(0, 0, 0, 0)

    viewEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    viewEnd.setHours(23, 59, 59, 999)
  }

  return { viewStart, viewEnd }
}

/**
 * Get all days in the current view
 */
export const getDaysInView = (selectedDate: Date, selectedView: "day" | "week" | "month") => {
  const { viewStart, viewEnd } = getViewDates(selectedDate, selectedView)
  const days: Date[] = []

  const currentDay = new Date(viewStart)
  while (currentDay <= viewEnd) {
    days.push(new Date(currentDay))
    currentDay.setDate(currentDay.getDate() + 1)
  }

  return days
}
