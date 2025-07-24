"use client";

import { useEffect, useState, useCallback } from "react";
import { useTitle } from "@/lib/use-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CancellationStatusSelect } from "@/components/cancellation-status-select";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Package, User } from "lucide-react";

interface CancellationItem {
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
}

interface Cancellation {
  id: string;
  orderId: string;
  customerName: string;
  cancellationReason: string;
  cancellationNotes: string | null;
  cancelledAt: string;
  status: "cancelled" | "returned";
  returnedAt: string | null;
  items: CancellationItem[];
}

export default function CancellationsPage() {
  useTitle("Cancellation Management");
  
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "cancelled" | "returned">("cancelled");

  const fetchCancellations = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam = filter === "all" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/cancellations${statusParam}`);
      if (!response.ok) throw new Error("Failed to fetch cancellations");
      const data = await response.json();
      setCancellations(data.cancellations);
    } catch (error) {
      console.error("Error fetching cancellations:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const updateStatus = async (id: string, newStatus: "returned") => {
    try {
      setUpdating(id);
      const response = await fetch(`/api/cancellations/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error("Failed to update status");
      
      // Refresh the list
      await fetchCancellations();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, [filter, fetchCancellations]);

  const getCancellationReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      customer_not_home: "Customer not home",
      customer_didnt_answer: "Customer didn't answer",
      customer_refused: "Customer refused delivery",
      wrong_address: "Wrong/invalid address",
      product_damaged: "Product damaged",
      payment_failed: "Payment failed",
      customer_canceled: "Customer proactively canceled",
      delivery_failed: "Delivery service failed",
      other: "Other reason",
    };
    return labels[reason] || reason;
  };

  const totalQuantity = (items: CancellationItem[]) => 
    items.reduce((sum, item) => sum + item.quantity, 0);

  const totalValue = (items: CancellationItem[]) => 
    items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cancellation Management</h1>
          <p className="text-muted-foreground">
            Track cancelled orders and manage returns to production
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(value: "all" | "cancelled" | "returned") => setFilter(value)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cancelled">Active Cancellations</SelectItem>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCancellations}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/3 mb-4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : cancellations.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === "cancelled" ? "No Active Cancellations" : "No Cancellations Found"}
          </h3>
          <p className="text-muted-foreground">
            {filter === "cancelled" 
              ? "All cancelled orders have been returned to production." 
              : "There are no cancelled orders to display."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {cancellations.map((cancellation) => (
            <div
              key={cancellation.id}
              className="border rounded-lg p-6 bg-card"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold text-lg">
                      {cancellation.customerName}
                    </h3>
                    <Badge variant={cancellation.status === "returned" ? "secondary" : "destructive"}>
                      {cancellation.status === "returned" ? "Returned" : "Cancelled"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Order #{cancellation.orderId.slice(-8)} • {getCancellationReasonLabel(cancellation.cancellationReason)}</p>
                    <p>Cancelled {formatDistanceToNow(new Date(cancellation.cancelledAt), { addSuffix: true })}</p>
                    {cancellation.returnedAt && (
                      <p>Returned {formatDistanceToNow(new Date(cancellation.returnedAt), { addSuffix: true })}</p>
                    )}
                  </div>
                </div>
                
                {/* Status Control - Only show dropdown for "cancelled" status */}
                {cancellation.status === "cancelled" && (
                  <div className="flex items-center gap-2">
                    <CancellationStatusSelect
                      value={cancellation.status as "cancelled" | "returned"}
                      onValueChange={(value) => updateStatus(cancellation.id, value)}
                      disabled={updating === cancellation.id}
                    />
                  </div>
                )}
              </div>

              {/* Products */}
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">Products ({totalQuantity(cancellation.items)} items)</h4>
                  <p className="text-sm font-medium">${totalValue(cancellation.items).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  {cancellation.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center text-sm bg-background rounded px-3 py-2"
                    >
                      <div>
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground ml-2">({item.productCode})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">{item.quantity} units</span>
                        <span className="text-muted-foreground ml-2">
                          @ ${Number(item.unitPrice || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {cancellation.cancellationNotes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Notes:</span> {cancellation.cancellationNotes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}