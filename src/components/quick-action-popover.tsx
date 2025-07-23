"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlusIcon, ArrowRightIcon, TruckIcon, CheckIcon, ArrowLeftIcon } from "lucide-react";

type QuickAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
};

type QuickActionPopoverProps = {
  actions: QuickAction[];
  onAction: (actionId: string, quantity: number) => Promise<void>;
  disabled?: boolean;
  currentStock?: number;
  locationName?: string;
};

export function QuickActionPopover({ actions, onAction, disabled, currentStock = 0, locationName }: QuickActionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActionClick = (actionId: string) => {
    setSelectedAction(actionId);
    setQuantity("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction || !quantity || isNaN(Number(quantity))) return;

    const quantityNum = Number(quantity);
    const maxAllowed = getMaxQuantityForAction(selectedAction);
    
    if (quantityNum > maxAllowed) {
      alert(`Maximum quantity for this action is ${maxAllowed}`);
      return;
    }

    setLoading(true);
    try {
      await onAction(selectedAction, quantityNum);
      setOpen(false);
      setSelectedAction(null);
      setQuantity("");
    } catch (error) {
      console.error("Action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMaxQuantityForAction = (actionId: string): number => {
    switch (actionId) {
      case "production":
        return 9999; // No limit for production
      case "ship-to-fulfillment":
      case "send-for-delivery":
      case "mark-delivered":
      case "move-to-fulfillment":
        return currentStock; // Limited by current stock in that location
      default:
        return 9999;
    }
  };

  const handleCancel = () => {
    setSelectedAction(null);
    setQuantity("");
  };

  const selectedActionData = actions.find(a => a.id === selectedAction);

  if (actions.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-6 px-2 text-xs hover:bg-accent"
            >
              <PlusIcon size={12} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Quick stock actions</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-64 p-0" align="center">
        {!selectedAction ? (
          <div className="p-3">
            <div className="text-sm font-medium mb-3">Quick Actions</div>
            <div className="space-y-1">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant || "ghost"}
                  size="sm"
                  onClick={() => handleActionClick(action.id)}
                  className="w-full justify-start h-8"
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="text-sm font-medium mb-3">
              {selectedActionData?.label}
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="quantity" className="text-xs">
                  Quantity
                </Label>
                {selectedAction === "mark-delivered" && (
                  <p className="text-xs text-muted-foreground mb-1">
                    Will be removed from inventory
                  </p>
                )}
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={getMaxQuantityForAction(selectedAction)}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={`Enter quantity (max: ${getMaxQuantityForAction(selectedAction)})`}
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex-1 h-8"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!quantity || loading}
                  className="flex-1 h-8"
                >
                  {loading ? "..." : "Confirm"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Predefined action configurations
export const getQuickActions = (locationName: string, hasStock: boolean): QuickAction[] => {
  switch (locationName) {
    case "Production":
      return [
        {
          id: "production",
          label: "Add Production",
          icon: <PlusIcon size={14} />,
        },
        ...(hasStock ? [{
          id: "ship-to-fulfillment", 
          label: "Ship to Fulfillment",
          icon: <ArrowRightIcon size={14} />,
        }] : []),
      ];
    
    case "Fulfillment":
      return hasStock ? [{
        id: "send-for-delivery",
        label: "Manual Send to Transit", 
        icon: <TruckIcon size={14} />,
      }] : [];
    
    case "In Transit":
      return hasStock ? [
        {
          id: "mark-delivered",
          label: "Manual Mark Delivered",
          icon: <CheckIcon size={14} />,
        },
        {
          id: "move-to-fulfillment",
          label: "Move to Fulfillment",
          icon: <ArrowLeftIcon size={14} />,
        },
      ] : [];
    
    default:
      return [];
  }
};