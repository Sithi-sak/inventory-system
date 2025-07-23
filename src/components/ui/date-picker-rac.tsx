"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { DateValue, getLocalTimeZone, today } from "@internationalized/date"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar-rac"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: DateValue | null
  onDateChange?: (date: DateValue | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePickerRac({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  className
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const formatDate = (date: DateValue | null) => {
    if (!date) return null
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date.toDate(getLocalTimeZone()))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? formatDate(date) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <Calendar
          value={date}
          onChange={(selectedDate) => {
            onDateChange?.(selectedDate)
            setOpen(false)
          }}
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}