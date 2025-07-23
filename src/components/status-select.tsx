"use client"

import { useId, useState } from "react"
import { LoaderIcon } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CancellationReasonModal } from "@/components/cancellation-reason-modal"

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

const statusOptions = [
  { value: "pending", label: "Not Delivered", color: "text-gray-400", tooltip: "Default status before any delivery attempt" },
  { value: "delivered", label: "Delivered", color: "text-emerald-600", tooltip: "Product successfully received by customer" },
  { value: "on_hold", label: "On Hold", color: "text-amber-500", tooltip: "Customer didn't answer or delivery postponed" },
  { value: "cancelled", label: "Cancelled", color: "text-red-500", tooltip: "Customer cancelled the order" },
] as const

interface StatusSelectProps {
  value: string
  onValueChange: (value: string, reason?: string, notes?: string) => void
  disabled?: boolean
  customerName?: string
  orderId?: string
}

export function StatusSelect({ value, onValueChange, disabled, customerName, orderId }: StatusSelectProps) {
  const id = useId()
  const [showCancellationModal, setShowCancellationModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === "cancelled" && customerName && orderId) {
      // Show cancellation reason modal
      setShowCancellationModal(true)
    } else if (newStatus === "delivered" && value !== "delivered") {
      // Confirm delivery (final status)
      setPendingStatus(newStatus)
      setShowConfirmDialog(true)
    } else {
      // Handle other status changes normally
      setIsUpdating(true)
      try {
        await onValueChange(newStatus)
      } finally {
        setIsUpdating(false)
      }
    }
  }

  const handleConfirmStatusChange = async () => {
    if (pendingStatus) {
      setIsUpdating(true)
      try {
        await onValueChange(pendingStatus)
      } finally {
        setIsUpdating(false)
        setShowConfirmDialog(false)
        setPendingStatus(null)
      }
    }
  }

  const handleCancellationConfirm = async (reason: string, notes?: string, holdReturn?: boolean) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason, notes, holdReturn })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Cancel API error:', errorData)
        throw new Error(errorData.error || 'Failed to cancel order')
      }

      onValueChange("cancelled", reason, notes)
      setShowCancellationModal(false)
    } catch (error) {
      console.error('Error canceling order:', error)
      alert(`Failed to cancel order: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <>
      <Select value={value} onValueChange={handleStatusChange} disabled={disabled || isUpdating}>
        <SelectTrigger
          id={id}
          className="w-auto h-8 [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span_svg]:shrink-0"
        >
          <div className="flex items-center gap-2">
            {isUpdating && <LoaderIcon className="h-3 w-3 animate-spin" />}
            <SelectValue placeholder="Select status" />
          </div>
        </SelectTrigger>
        <SelectContent className="[&_*[role=option]>span>svg]:text-muted-foreground/80 [&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2 [&_*[role=option]>span]:flex [&_*[role=option]>span]:items-center [&_*[role=option]>span]:gap-2 [&_*[role=option]>span>svg]:shrink-0">
          {statusOptions.map((option) => (
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

      {customerName && (
        <CancellationReasonModal
          isOpen={showCancellationModal}
          onClose={() => setShowCancellationModal(false)}
          onConfirm={handleCancellationConfirm}
          customerName={customerName}
          isLoading={isLoading}
        />
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this order as delivered? This action will remove the product from inventory and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false)
              setPendingStatus(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStatusChange}>
              Confirm Delivery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { statusOptions }