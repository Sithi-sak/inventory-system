"use client"

import { useState } from "react"
import { LoaderIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function StatusDot({ className }: { className?: string }) {
  return (
    <svg
      width="8"
      height="8"
      fill="currentColor"
      viewBox="0 0 8 8"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}

const cancellationStatusOptions = [
  { value: "cancelled", label: "Cancelled", color: "text-red-500", tooltip: "Awaiting return from delivery service" },
  { value: "returned", label: "✓ Returned", color: "text-gray-500", tooltip: "Items returned to production facility" },
] as const

interface CancellationStatusSelectProps {
  value: "cancelled" | "returned"
  onValueChange: (value: "returned") => void
  disabled?: boolean
}

export function CancellationStatusSelect({ value, onValueChange, disabled }: CancellationStatusSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "returned" && value === "cancelled") {
      setIsUpdating(true)
      try {
        await onValueChange("returned")
      } finally {
        setIsUpdating(false)
      }
    }
  }
  
  return (
    <Select value={value} onValueChange={handleStatusChange} disabled={disabled || isUpdating}>
      <SelectTrigger
        className="w-32 h-8 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_svg]:shrink-0"
      >
        <div className="flex items-center gap-2">
          {isUpdating && <LoaderIcon className="h-3 w-3 animate-spin" />}
          <SelectValue placeholder="Select status" />
        </div>
      </SelectTrigger>
      <SelectContent className="[&_*[role=option]>span>svg]:text-muted-foreground/80 [&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2 [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]>span>svg]:shrink-0">
        {cancellationStatusOptions.map((option) => (
          <Tooltip key={option.value}>
            <TooltipTrigger asChild>
              <SelectItem value={option.value}>
                <span className="flex items-center gap-2">
                  <StatusDot className={option.color} />
                  <span className="truncate">{option.label}</span>
                </span>
              </SelectItem>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{option.tooltip}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </SelectContent>
    </Select>
  )
}