"use client";

import { useState, useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { DatePickerRac } from "@/components/ui/date-picker-rac";
import {
  DateValue,
  getLocalTimeZone,
  parseDate,
} from "@internationalized/date";

type Product = {
  id: string;
  name: string;
  code: string;
  price: number;
  description?: string;
  stock: number;
  locationStock?: Record<string, number>;
};

interface AddCustomerModalProps {
  onAddCustomer?: (customer: {
    name: string;
    phone: string;
    location: string;
    preferredDeliveryTime?: string;
    notes?: string;
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => void;
}

export function AddCustomerModal({ onAddCustomer }: AddCustomerModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    location: "",
    preferredDeliveryTime: "",
    notes: "",
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<
    Array<{
      productId: string;
      code: string;
      name: string;
      quantity: number;
      unitPrice: number;
    }>
  >([]);
  const [currentProduct, setCurrentProduct] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("1");
  const [productSearch, setProductSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stockError, setStockError] = useState("");

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchProducts();
    }
  }, [open]);

  // Calculate total when selected products change
  useEffect(() => {
    const newTotal = selectedProducts.reduce(
      (sum, product) => sum + product.unitPrice * product.quantity,
      0
    );
    setTotal(newTotal);
  }, [selectedProducts]);

  // Filter products based on search
  const filteredProducts = products.filter(
    (product) =>
      product.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      product.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const addProduct = () => {
    setStockError(""); // Clear previous errors

    if (currentProduct && currentQuantity) {
      const product = products.find((p) => p.id === currentProduct);
      if (product) {
        const quantity = parseInt(currentQuantity) || 1;

        // Use fulfillment stock only (what can actually be delivered)
        const fulfillmentStock = product.locationStock?.["Fulfillment"] || 0;

        // Check stock availability
        if (fulfillmentStock <= 0) {
          setStockError(
            `${product.name} is out of stock and cannot be added to the order.`
          );
          return;
        }

        // Check if product already exists in selectedProducts
        const existingProductIndex = selectedProducts.findIndex(
          (sp) => sp.productId === product.id
        );
        const existingQuantity =
          existingProductIndex !== -1
            ? selectedProducts[existingProductIndex].quantity
            : 0;
        const totalRequestedQuantity = existingQuantity + quantity;

        if (totalRequestedQuantity > fulfillmentStock) {
          const availableQuantity = fulfillmentStock - existingQuantity;
          setStockError(
            `Insufficient stock for ${product.name}. Available for delivery: ${availableQuantity}, Requested: ${quantity}`
          );
          return;
        }

        if (existingProductIndex !== -1) {
          // Product exists, merge quantities
          setSelectedProducts((prev) =>
            prev.map((sp, index) =>
              index === existingProductIndex
                ? { ...sp, quantity: sp.quantity + quantity }
                : sp
            )
          );
        } else {
          // Product doesn't exist, add new
          setSelectedProducts((prev) => [
            ...prev,
            {
              productId: product.id,
              code: product.code,
              name: product.name,
              quantity: quantity,
              unitPrice: Number(product.price),
            },
          ]);
        }

        setCurrentProduct("");
        setCurrentQuantity("1");
        setProductSearch("");
      }
    }
  };

  const removeProduct = (index: number) => {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.phone ||
      !formData.location ||
      selectedProducts.length === 0
    ) {
      return;
    }

    const customer = {
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      preferredDeliveryTime: formData.preferredDeliveryTime || undefined,
      notes: formData.notes || undefined,
      orderItems: selectedProducts.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
      })),
    };

    onAddCustomer?.(customer);

    // Reset form and close modal
    setFormData({
      name: "",
      phone: "",
      location: "",
      preferredDeliveryTime: "",
      notes: "",
    });
    setSelectedProducts([]);
    setCurrentProduct("");
    setCurrentQuantity("1");
    setProductSearch("");
    setStockError("");
    setTotal(0);
    setOpen(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ml-auto" variant="outline">
          <PlusIcon className="-ms-1 opacity-60" size={16} aria-hidden="true" />
          Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Enter the customer details below. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Customer Name</Label>
            <Input
              id="customer-name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-phone">Phone Number</Label>
            <Input
              id="customer-phone"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-location">Location</Label>
            <Input
              id="customer-location"
              placeholder="Enter location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-delivery-time">
              Preferred Delivery Time
            </Label>
            <Input
              id="customer-delivery-time"
              placeholder="Enter preferred delivery time (optional)"
              value={formData.preferredDeliveryTime}
              onChange={(e) =>
                handleInputChange("preferredDeliveryTime", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-notes">Notes</Label>
            <Input
              id="customer-notes"
              placeholder="Enter any notes (optional)"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Products</Label>
            <div className="border rounded-md p-3 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search by product code or name..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    value={currentProduct}
                    onValueChange={(value) => {
                      setCurrentProduct(value);
                      setStockError(""); // Clear error when product changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProducts.map((product) => {
                        const fulfillmentStock =
                          product.locationStock?.["Fulfillment"] || 0;
                        const isOutOfStock = fulfillmentStock <= 0;

                        return (
                          <SelectItem
                            key={product.id}
                            value={product.id}
                            disabled={isOutOfStock}
                          >
                            <div className="flex justify-between items-center w-full">
                              <span
                                className={`font-medium ${
                                  isOutOfStock
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }`}
                              >
                                {product.code} - {product.name} - $
                                {Number(product.price).toFixed(2)}
                              </span>
                              <span
                                className={`text-xs ml-3 ${
                                  isOutOfStock
                                    ? "text-red-500"
                                    : fulfillmentStock <= 10
                                    ? "text-amber-500"
                                    : "text-green-600"
                                }`}
                              >
                                {isOutOfStock
                                  ? "Out of Stock"
                                  : `Ready: ${fulfillmentStock}`}
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    min="1"
                    max={(() => {
                      const product = products.find(
                        (p) => p.id === currentProduct
                      );
                      return (
                        product?.locationStock?.["Fulfillment"] || undefined
                      );
                    })()}
                    placeholder="Qty"
                    value={currentQuantity}
                    onChange={(e) => {
                      setCurrentQuantity(e.target.value);
                      setStockError(""); // Clear error when quantity changes
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addProduct}
                  disabled={!currentProduct || parseInt(currentQuantity) <= 0}
                >
                  Add
                </Button>
              </div>

              {/* Show available stock for selected product */}
              {currentProduct && (
                <div className="text-xs text-muted-foreground">
                  {(() => {
                    const selectedProduct = products.find(
                      (p) => p.id === currentProduct
                    );
                    const existingQuantity =
                      selectedProducts.find(
                        (sp) => sp.productId === currentProduct
                      )?.quantity || 0;
                    const fulfillmentStock =
                      selectedProduct?.locationStock?.["Fulfillment"] || 0;
                    const availableStock = fulfillmentStock - existingQuantity;
                    const price = selectedProduct
                      ? `$${Number(selectedProduct.price).toFixed(2)}`
                      : "";
                    const totalStock = selectedProduct?.stock || 0;

                    if (existingQuantity > 0) {
                      return `${price} | Ready to Ship: ${availableStock} (${existingQuantity} already in order) | Total Stock: ${totalStock}`;
                    }
                    return `${price} | Ready to Ship: ${fulfillmentStock} | Total Stock: ${totalStock}`;
                  })()}
                </div>
              )}

              {/* Show stock error */}
              {stockError && (
                <div className="text-xs text-red-500 bg-red-50 p-2 rounded border">
                  {stockError}
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selected Products:
                  </Label>
                  {selectedProducts.map((product, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted p-2 rounded"
                    >
                      <span className="text-sm">
                        {product.code} - {product.name} × {product.quantity}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          ${(product.unitPrice * product.quantity).toFixed(2)}
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeProduct(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-total">Total</Label>
            <Input
              id="customer-total"
              type="text"
              value={`$${total.toFixed(2)}`}
              readOnly
              className="bg-muted"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStockError("");
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Customer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
