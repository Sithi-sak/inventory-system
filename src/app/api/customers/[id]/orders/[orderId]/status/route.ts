import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; orderId: string }> }
) {
  const { id, orderId } = await params
  try {
    const { status } = await request.json()
    
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    // Validate status value
    const validStatuses = ['pending', 'delivered', 'on_hold', 'cancelled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    // Get current order to check if status is actually changing
    const currentOrder = await prisma.order.findUnique({
      where: {
        id: orderId,
        customerId: id
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // IMMUTABLE DELIVERED ORDERS: Prevent any status changes for delivered orders
    if (currentOrder.status === 'delivered') {
      return NextResponse.json({ 
        error: 'Cannot modify delivered orders. Delivered orders are final and cannot be changed.' 
      }, { status: 400 })
    }

    // Check status transitions for automated inventory handling
    const oldStatus = currentOrder.status
    const newStatus = status
    const isStatusChange = oldStatus !== newStatus

    const result = await prisma.$transaction(async (tx) => {
      // Update the order status
      const updatedOrder = await tx.order.update({
        where: {
          id: orderId,
          customerId: id
        },
        data: {
          status: status
        }
      })

      // Handle automated inventory movements based on status changes
      if (isStatusChange) {
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

        // Process each order item for automated inventory flow
        for (const orderItem of currentOrder.orderItems) {
          const quantity = orderItem.quantity

          // NOTE: Stock movement from Fulfillment → In Transit only happens on ORDER CREATION
          // Status changes between "Not Delivered" and "On Hold" should NOT trigger inventory movement
          // Both states represent "in delivery pipeline" - just different reasons for non-delivery
          
          // DELIVERED → Remove from In Transit (successful delivery)
          if (newStatus === 'delivered' && oldStatus !== 'delivered') {
            await deductStock(tx, orderItem.productId, inTransitLocationId, quantity, `Order ${orderId} delivered`)
          }
          
          // CANCELLED → Check if holdReturn flag is set
          else if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
            // Get the order to check holdReturn flag
            const order = await tx.order.findUnique({
              where: { id: orderId },
              select: { holdReturn: true }
            })
            
            // Only auto-return inventory if holdReturn is false (default behavior)
            if (!order?.holdReturn) {
              await moveStock(tx, orderItem.productId, inTransitLocationId, fulfillmentLocationId, quantity, `Order ${orderId} cancelled - auto returned to fulfillment`)
            }
            // If holdReturn is true, stock stays in In Transit for manual confirmation
          }
          
        }
      }

      return updatedOrder
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating order status:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update order status' 
    }, { status: 500 })
  }
}

// Helper function to move stock between locations
async function moveStock(tx: any, productId: string, fromLocationId: string, toLocationId: string, quantity: number, notes: string) {
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

// Helper function to deduct stock (for delivered orders)
async function deductStock(tx: any, productId: string, locationId: string, quantity: number, notes: string) {
  // Check if location has enough stock
  const inventory = await tx.inventoryItem.findUnique({
    where: {
      productId_locationId: {
        productId: productId,
        locationId: locationId
      }
    }
  })

  if (!inventory || inventory.quantity < quantity) {
    throw new Error(`Insufficient stock for delivery. Available: ${inventory?.quantity || 0}, Required: ${quantity}`)
  }

  // Deduct from location
  await tx.inventoryItem.update({
    where: {
      productId_locationId: {
        productId: productId,
        locationId: locationId
      }
    },
    data: {
      quantity: {
        decrement: quantity
      }
    }
  })

  // Record the sale movement
  await tx.stockMovement.create({
    data: {
      productId: productId,
      locationId: locationId,
      movementType: "sale",
      quantity: -quantity,
      notes: notes
    }
  })
}