"use client";

import { useState, useEffect } from "react";
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

type Product = {
  id: string;
  name: string;
  code: string;
  price: number;
  description?: string;
  stock: number;
  locationStock?: Record<string, number>;
};

interface EditCustomerModalProps {
  customer: {
    id: string;
    name: string;
    phone: string;
    location: string;
    preferredDeliveryTime?: string;
    notes?: string;
    createdAt: string;
    orders: Array<{
      id: string;
      orderDate: string;
      deliveryDate?: string;
      status: string;
      totalAmount: number;
      orderItems: Array<{
        id: string;
        quantity: number;
        unitPrice: number;
        product: {
          id: string;
          name: string;
          code: string;
          price: number;
        };
      }>;
    }>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateCustomer?: (customer: {
    id: string;
    name: string;
    phone: string;
    location: string;
    preferredDeliveryTime?: string;
    notes?: string;
    orderItems?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => void;
}

export function EditCustomerModal({
  customer,
  open,
  onOpenChange,
  onUpdateCustomer,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    name: customer.name,
    phone: customer.phone,
    location: customer.location,
    preferredDeliveryTime: customer.preferredDeliveryTime || "",
    notes: customer.notes || "",
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

  // Update form data when customer changes
  useEffect(() => {
    setFormData({
      name: customer.name,
      phone: customer.phone,
      location: customer.location,
      preferredDeliveryTime: customer.preferredDeliveryTime || "",
      notes: customer.notes || "",
    });

    // Convert existing orders to selected products
    if (customer.orders && customer.orders.length > 0) {
      const latestOrder = customer.orders[0];
      const orderProducts = latestOrder.orderItems.map((item) => ({
        productId: item.product.id,
        code: item.product.code,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
      setSelectedProducts(orderProducts);
    } else {
      setSelectedProducts([]);
    }
  }, [customer]);

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
    if (currentProduct && currentQuantity) {
      const product = products.find((p) => p.id === currentProduct);
      if (product) {
        const quantity = parseInt(currentQuantity) || 1;

        // Check if product already exists in selectedProducts
        const existingProductIndex = selectedProducts.findIndex(
          (sp) => sp.productId === product.id
        );

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

    if (!formData.name || !formData.phone || !formData.location) {
      return;
    }

    const updatedCustomer = {
      id: customer.id,
      name: formData.name,
      phone: formData.phone,
      location: formData.location,
      preferredDeliveryTime: formData.preferredDeliveryTime,
      notes: formData.notes,
      orderItems: selectedProducts.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
      })),
    };

    onUpdateCustomer?.(updatedCustomer);
    onOpenChange(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>
            Update the customer details below. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-customer-name">Customer Name</Label>
            <Input
              id="edit-customer-name"
              placeholder="Enter customer name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-phone">Phone Number</Label>
            <Input
              id="edit-customer-phone"
              type="tel"
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-location">Location</Label>
            <Input
              id="edit-customer-location"
              placeholder="Enter location"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-delivery-time">
              Preferred Delivery Time
            </Label>
            <Input
              id="edit-customer-delivery-time"
              placeholder="Enter preferred delivery time"
              value={formData.preferredDeliveryTime}
              onChange={(e) =>
                handleInputChange("preferredDeliveryTime", e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-customer-notes">Notes</Label>
            <Input
              id="edit-customer-notes"
              placeholder="Enter any notes"
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
                    onValueChange={setCurrentProduct}
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
                    placeholder="Qty"
                    value={currentQuantity}
                    onChange={(e) => setCurrentQuantity(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  onClick={addProduct}
                  disabled={!currentProduct}
                >
                  Add
                </Button>
              </div>

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
            <Label htmlFor="edit-customer-total">Total</Label>
            <Input
              id="edit-customer-total"
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Customer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
