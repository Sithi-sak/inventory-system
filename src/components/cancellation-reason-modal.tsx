'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface CancellationReasonModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string, notes?: string) => void
  customerName: string
  isLoading?: boolean
}

const CANCELLATION_REASONS = [
  { value: 'customer_not_home', label: 'Customer not home' },
  { value: 'customer_didnt_answer', label: "Customer didn't answer" },
  { value: 'customer_refused', label: 'Customer refused delivery' },
  { value: 'wrong_address', label: 'Wrong/invalid address' },
  { value: 'product_damaged', label: 'Product damaged' },
  { value: 'payment_failed', label: 'Payment failed' },
  { value: 'customer_canceled', label: 'Customer proactively canceled' },
  { value: 'delivery_failed', label: 'Delivery service failed' },
  { value: 'other', label: 'Other reason' }
]

export function CancellationReasonModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  isLoading = false
}: CancellationReasonModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const handleConfirm = () => {
    if (!selectedReason) return
    onConfirm(selectedReason, notes.trim() || undefined)
    // Reset form
    setSelectedReason('')
    setNotes('')
  }

  const handleClose = () => {
    setSelectedReason('')
    setNotes('')
    onClose()
  }

  const selectedReasonLabel = CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Order</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Please provide a reason for canceling <span className="font-medium">{customerName}</span>&apos;s order.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details about the cancellation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">
              📦 Items will remain &quot;In Transit&quot; until physically returned and confirmed
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Keep Order
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={!selectedReason || isLoading}
          >
            {isLoading ? 'Canceling...' : 'Cancel Order'}
          </Button>
        </DialogFooter>

        {selectedReason && (
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Reason:</span> {selectedReasonLabel}
            </p>
            {notes && (
              <p className="text-sm mt-1">
                <span className="font-medium">Notes:</span> {notes}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}