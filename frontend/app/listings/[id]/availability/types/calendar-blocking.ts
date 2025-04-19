export type BlockType = "owner-block" | "maintenance" | "booking"
export type RecurringPattern = "daily" | "weekly" | "weekdays" | "weekends"
export type CalendarView = "day" | "week" | "month"

export interface BlockedPeriod {
  id: number
  place: number
  start_datetime: string
  end_datetime: string
  is_recurring: boolean
  recurring_pattern?: RecurringPattern
  recurring_end_date?: string
  reason?: string
  block_type: BlockType
  created_at: string
  updated_at: string
}

export interface NewBlockedPeriod extends Omit<BlockedPeriod, "id" | "place" | "created_at" | "updated_at"> {
  suppressDefaultToast?: boolean
}

// Type for grouping blocks by day
export interface DayBlocks {
  date: Date
  blocks: BlockedPeriod[]
  recurringBlocks: BlockedPeriod[]
}

export interface BlockedPeriodWithMeta extends BlockedPeriod {
  merged?: boolean
  deleted_block_ids?: number[]
  message?: string
}
