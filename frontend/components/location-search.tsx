"use client"

import * as React from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const locations = [
  {
    value: "new-york",
    label: "New York, NY",
  },
  {
    value: "los-angeles",
    label: "Los Angeles, CA",
  },
  {
    value: "chicago",
    label: "Chicago, IL",
  },
  {
    value: "san-francisco",
    label: "San Francisco, CA",
  },
  {
    value: "miami",
    label: "Miami, FL",
  },
  {
    value: "seattle",
    label: "Seattle, WA",
  },
  {
    value: "austin",
    label: "Austin, TX",
  },
  {
    value: "boston",
    label: "Boston, MA",
  },
]

export function LocationSearch() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState("")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
          {value ? locations.find((location) => location.value === value)?.label : "Search locations..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search location..." />
          <CommandList>
            <CommandEmpty>No location found.</CommandEmpty>
            <CommandGroup>
              {locations.map((location) => (
                <CommandItem
                  key={location.value}
                  value={location.value}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  {location.label}
                  <Check className={cn("ml-auto h-4 w-4", value === location.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

