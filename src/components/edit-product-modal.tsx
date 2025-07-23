"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EditProductModalProps {
  product: {
    id: string;
    name: string;
    code: string;
    price: number;
    description?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateProduct?: (product: {
    id: string;
    name: string;
    code: string;
    price: number;
    description?: string;
  }) => void;
}

export function EditProductModal({ product, open, onOpenChange, onUpdateProduct }: EditProductModalProps) {
  const [formData, setFormData] = useState({
    name: product.name,
    code: product.code,
    price: product.price.toString(),
    description: product.description || "",
  })

  // Update form data when product changes
  useEffect(() => {
    setFormData({
      name: product.name,
      code: product.code,
      price: product.price.toString(),
      description: product.description || "",
    })
  }, [product])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.code || !formData.price) {
      return
    }

    const updatedProduct = {
      id: product.id,
      name: formData.name,
      code: formData.code,
      price: parseFloat(formData.price),
      description: formData.description || undefined,
    }

    onUpdateProduct?.(updatedProduct)
    onOpenChange(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the product details below. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-product-name">Product Name</Label>
            <Input
              id="edit-product-name"
              placeholder="Enter product name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-product-code">Product Code</Label>
            <Input
              id="edit-product-code"
              placeholder="Enter product code"
              value={formData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-product-price">Price</Label>
            <Input
              id="edit-product-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter price"
              value={formData.price}
              onChange={(e) => handleInputChange("price", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-product-description">Description</Label>
            <Textarea
              id="edit-product-description"
              placeholder="Enter product description (optional)"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Update Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}