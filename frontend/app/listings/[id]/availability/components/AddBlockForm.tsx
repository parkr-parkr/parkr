"use client"
import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/shadcn/select"
import { Switch } from "@/components/shadcn/switch"
import { Loader2, PlusIcon } from "lucide-react"

interface AddBlockFormProps {
  newBlock: any
  isSubmitting: boolean
  onUpdateNewBlock: (field: string, value: any) => void
  onAddBlock: () => void
}

export function AddBlockForm({ newBlock, isSubmitting, onUpdateNewBlock, onAddBlock }: AddBlockFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-time">Start Date & Time</Label>
          <Input
            id="start-time"
            type="datetime-local"
            value={newBlock.start_datetime}
            onChange={(e) => onUpdateNewBlock("start_datetime", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="end-time">End Date & Time</Label>
          <Input
            id="end-time"
            type="datetime-local"
            value={newBlock.end_datetime}
            onChange={(e) => onUpdateNewBlock("end_datetime", e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="block-type">Block Type</Label>
        <Select value={newBlock.block_type} onValueChange={(value) => onUpdateNewBlock("block_type", value)}>
          <SelectTrigger id="block-type">
            <SelectValue placeholder="Select block type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owner-block">Owner Block</SelectItem>
            <SelectItem value="maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Input
          id="reason"
          value={newBlock.reason || ""}
          onChange={(e) => onUpdateNewBlock("reason", e.target.value)}
          placeholder="Why is this period blocked?"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="recurring"
          checked={newBlock.is_recurring}
          onCheckedChange={(checked) => onUpdateNewBlock("is_recurring", checked)}
        />
        <Label htmlFor="recurring">Make this a recurring block</Label>
      </div>

      {newBlock.is_recurring && (
        <div className="space-y-4 pl-6">
          <div>
            <Label htmlFor="recurring-pattern">Repeats</Label>
            <Select
              value={newBlock.recurring_pattern}
              onValueChange={(value) => onUpdateNewBlock("recurring_pattern", value)}
            >
              <SelectTrigger id="recurring-pattern">
                <SelectValue placeholder="Select pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="weekdays">Weekdays</SelectItem>
                <SelectItem value="weekends">Weekends</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="recurring-end">Until</Label>
            <Input
              id="recurring-end"
              type="date"
              value={newBlock.recurring_end_date || ""}
              onChange={(e) => onUpdateNewBlock("recurring_end_date", e.target.value)}
            />
          </div>
        </div>
      )}

      <Button onClick={onAddBlock} className="mt-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Blocked Period
          </>
        )}
      </Button>
    </div>
  )
}
