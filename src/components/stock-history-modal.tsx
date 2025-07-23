"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type StockMovement = {
  id: string;
  movementType: string;
  quantity: number;
  location: string | null;
  fromLocation: string | null;
  toLocation: string | null;
  notes: string | null;
  createdAt: string;
};

type StockHistoryModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
};

export function StockHistoryModal({
  open,
  onOpenChange,
  productId,
  productName,
}: StockHistoryModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/inventory/${productId}/history`);
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      }
    } catch (error) {
      console.error("Error fetching stock history:", error);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (open && productId) {
      fetchHistory();
    }
  }, [open, productId, fetchHistory]);

  const formatMovementType = (type: string) => {
    switch (type) {
      case "production":
        return <Badge variant="default">Production</Badge>;
      case "transfer":
        return <Badge variant="secondary">Transfer</Badge>;
      case "adjustment":
        return <Badge variant="outline">Adjustment</Badge>;
      case "sale":
        return <Badge variant="destructive">Sale</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatQuantity = (quantity: number, type: string) => {
    const sign = quantity > 0 ? "+" : "";
    return `${sign}${quantity}`;
  };

  const formatLocation = (movement: StockMovement) => {
    if (movement.movementType === "transfer") {
      return `${movement.fromLocation} → ${movement.toLocation}`;
    }
    return movement.location || "-";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>Stock History - {productName}</DialogTitle>
          <DialogDescription>
            View all stock movements for this product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No stock movements found for this product.
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {formatMovementType(movement.movementType)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {formatQuantity(
                            movement.quantity,
                            movement.movementType
                          )}
                        </span>
                      </TableCell>
                      <TableCell>{formatLocation(movement)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
