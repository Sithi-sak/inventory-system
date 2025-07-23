"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Location = {
  id: string;
  name: string;
};

type StockMovementModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  locations: Location[];
  onStockMovement: () => void;
};

export function StockMovementModal({
  open,
  onOpenChange,
  productId,
  productName,
  locations,
  onStockMovement,
}: StockMovementModalProps) {
  const [movementType, setMovementType] = useState<string>("production");
  const [quantity, setQuantity] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [fromLocationId, setFromLocationId] = useState<string>("");
  const [toLocationId, setToLocationId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [stockDate, setStockDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || !locationId && movementType !== "transfer") return;
    if (movementType === "transfer" && (!fromLocationId || !toLocationId)) return;

    setLoading(true);
    try {
      const response = await fetch("/api/inventory/stock-movement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          movementType,
          quantity: parseInt(quantity),
          locationId: movementType !== "transfer" ? locationId : undefined,
          fromLocationId: movementType === "transfer" ? fromLocationId : undefined,
          toLocationId: movementType === "transfer" ? toLocationId : undefined,
          notes: notes || undefined,
          stockDate: stockDate ? stockDate.toISOString() : new Date().toISOString(),
        }),
      });

      if (response.ok) {
        onStockMovement();
        onOpenChange(false);
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to record stock movement");
      }
    } catch (error) {
      console.error("Error recording stock movement:", error);
      alert("Failed to record stock movement");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMovementType("production");
    setQuantity("");
    setLocationId("");
    setFromLocationId("");
    setToLocationId("");
    setNotes("");
    setStockDate(new Date());
  };

  const isTransfer = movementType === "transfer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Stock - {productName}</DialogTitle>
          <DialogDescription>
            Record a stock movement for this product.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="movementType">Movement Type</Label>
            <Select value={movementType} onValueChange={setMovementType}>
              <SelectTrigger id="movementType">
                <SelectValue placeholder="Select movement type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">Production</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stockDate">Stock Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="stockDate"
                  variant="outline"
                  className="group bg-background hover:bg-background border-input w-full justify-between px-3 font-normal outline-offset-0 outline-none focus-visible:outline-[3px]"
                  disabled={loading}
                >
                  <span
                    className={cn("truncate", !stockDate && "text-muted-foreground")}
                  >
                    {stockDate ? format(stockDate, "PPP") : "Pick a date"}
                  </span>
                  <CalendarIcon
                    size={16}
                    className="text-muted-foreground/80 group-hover:text-foreground shrink-0 transition-colors"
                    aria-hidden="true"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <Calendar 
                  mode="single" 
                  selected={stockDate} 
                  onSelect={(date) => setStockDate(date || new Date())} 
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Select the date when this stock movement actually occurred (DD/MM/YYYY format)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity {movementType === "sale" || movementType === "adjustment" ? "(use negative for reduction)" : ""}
            </Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>

          {isTransfer ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="fromLocation">From Location</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger id="fromLocation">
                    <SelectValue placeholder="Select source location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="toLocation">To Location</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger id="toLocation">
                    <SelectValue placeholder="Select destination location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations
                      .filter((location) => location.id !== fromLocationId)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger id="location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this movement..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Recording..." : "Record Movement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}