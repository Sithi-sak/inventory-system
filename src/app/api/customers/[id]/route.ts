import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaClient } from '@/generated/prisma'

interface OrderItem {
  productId: string
  quantity: string
  unitPrice: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { name, phone, location, preferredDeliveryTime, notes, orderItems } = body

    if (!name || !phone || !location) {
      return NextResponse.json({ error: 'Name, phone, and location are required' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Update customer basic info
      await tx.customer.update({
        where: { id },
        data: {
          name,
          phone,
          location,
          preferredDeliveryTime: preferredDeliveryTime || null,
          notes: notes || null
        }
      })

      // If orderItems are provided, update the latest order
      if (orderItems && orderItems.length > 0) {
        // Get the latest order for this customer
        const latestOrder = await tx.order.findFirst({
          where: { customerId: id },
          orderBy: { orderDate: 'desc' }
        })

        if (latestOrder) {
          // IMMUTABLE DELIVERED ORDERS: Prevent modifying delivered orders
          if (latestOrder.status === 'delivered') {
            throw new Error('Cannot modify customer orders. The latest order has been delivered and is final.')
          }

          // Get existing order items to compare what's being added
          const existingItems = await tx.orderItem.findMany({
            where: { orderId: latestOrder.id }
          })

          // Create a map of existing items for easy comparison
          const existingItemsMap = new Map(
            existingItems.map(item => [
              `${item.productId}`, 
              { quantity: item.quantity, unitPrice: item.unitPrice }
            ])
          )

          // Identify newly added products and increased quantities
          const newProducts: Array<{ productId: string; quantity: number; unitPrice: number }> = []
          
          for (const newItem of orderItems) {
            const productId = newItem.productId
            const newQuantity = parseInt(newItem.quantity)
            const existingItem = existingItemsMap.get(productId)
            
            if (!existingItem) {
              // Completely new product - add full quantity
              newProducts.push({
                productId,
                quantity: newQuantity,
                unitPrice: parseFloat(newItem.unitPrice)
              })
            } else if (newQuantity > existingItem.quantity) {
              // Increased quantity - add the difference
              newProducts.push({
                productId,
                quantity: newQuantity - existingItem.quantity,
                unitPrice: parseFloat(newItem.unitPrice)
              })
            }
          }

          // Move new products from Fulfillment to In Transit
          if (newProducts.length > 0) {
            // Get locations
            const locations = await tx.inventoryLocation.findMany({
              where: { isActive: true }
            })

            const locationMap = locations.reduce((acc, loc) => {
              acc[loc.name] = loc.id
              return acc
            }, {} as Record<string, string>)

            const fulfillmentLocationId = locationMap["Fulfillment"]
            const inTransitLocationId = locationMap["In Transit"]

            if (!fulfillmentLocationId || !inTransitLocationId) {
              throw new Error('Required locations (Fulfillment or In Transit) not found')
            }

            // Move each new product to In Transit
            for (const product of newProducts) {
              await moveStock(
                tx, 
                product.productId, 
                fulfillmentLocationId, 
                inTransitLocationId, 
                product.quantity, 
                `Order ${latestOrder.id} edited - new product added`
              )
            }
          }

          // Delete existing order items
          await tx.orderItem.deleteMany({
            where: { orderId: latestOrder.id }
          })

          // Calculate new total
          const totalAmount = orderItems.reduce((sum: number, item: OrderItem) => {
            return sum + (parseFloat(item.unitPrice) * parseInt(item.quantity))
          }, 0)

          // Update order total
          await tx.order.update({
            where: { id: latestOrder.id },
            data: { totalAmount }
          })

          // Create new order items
          await tx.orderItem.createMany({
            data: orderItems.map((item: OrderItem) => ({
              orderId: latestOrder.id,
              productId: item.productId,
              quantity: parseInt(item.quantity),
              unitPrice: parseFloat(item.unitPrice)
            }))
          })
        }
      }
    })

    return NextResponse.json({ message: 'Customer updated successfully' })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// Helper function to move stock between locations
async function moveStock(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>, productId: string, fromLocationId: string, toLocationId: string, quantity: number, notes: string) {
  // Check if source location has enough stock
  const fromInventory = await tx.inventoryItem.findUnique({
    where: {
      productId_locationId: {
        productId: productId,
        locationId: fromLocationId
      }
    }
  })

  if (!fromInventory || fromInventory.quantity < quantity) {
    throw new Error(`Insufficient stock in source location. Available: ${fromInventory?.quantity || 0}, Required: ${quantity}`)
  }

  // Deduct from source location
  await tx.inventoryItem.update({
    where: {
      productId_locationId: {
        productId: productId,
        locationId: fromLocationId
      }
    },
    data: {
      quantity: {
        decrement: quantity
      }
    }
  })

  // Add to destination location (create if doesn't exist)
  await tx.inventoryItem.upsert({
    where: {
      productId_locationId: {
        productId: productId,
        locationId: toLocationId
      }
    },
    update: {
      quantity: {
        increment: quantity
      }
    },
    create: {
      productId: productId,
      locationId: toLocationId,
      quantity: quantity
    }
  })

  // Record the transfer movement
  await tx.stockMovement.create({
    data: {
      productId: productId,
      movementType: "transfer",
      quantity: quantity,
      fromLocation: fromLocationId,
      toLocation: toLocationId,
      notes: notes
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // IMMUTABLE DELIVERED ORDERS: Check if customer has any delivered orders
    const deliveredOrders = await prisma.order.findFirst({
      where: { 
        customerId: id,
        status: 'delivered'
      }
    })

    if (deliveredOrders) {
      return NextResponse.json({ 
        error: 'Cannot delete customer with delivered orders. Delivered orders are final and must be preserved for audit purposes.' 
      }, { status: 400 })
    }

    // Delete in transaction to handle related data
    await prisma.$transaction(async (tx) => {
      // First delete all order items for this customer's orders
      await tx.orderItem.deleteMany({
        where: {
          order: {
            customerId: id
          }
        }
      })
      
      // Then delete all orders for this customer
      await tx.order.deleteMany({
        where: {
          customerId: id
        }
      })
      
      // Finally delete the customer
      await tx.customer.delete({
        where: { id }
      })
    })

    return NextResponse.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}