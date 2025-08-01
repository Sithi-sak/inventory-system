import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaClient } from '@/generated/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  try {
    const body = await request.json()
    const { reason, notes, holdReturn } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    // Get current order to check status and handle inventory
    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        customer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Update the order with cancellation details and handle inventory movement
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancellationReason: reason,
          cancellationNotes: notes || null,
          holdReturn: Boolean(holdReturn)
        },
        include: {
          customer: {
            select: {
              name: true
            }
          }
        }
      })

      // Create detailed cancellation record
      await tx.orderCancellation.create({
        data: {
          orderId: orderId,
          customerId: currentOrder.customer.id,
          customerName: currentOrder.customer.name,
          cancellationReason: reason,
          cancellationNotes: notes || null,
          status: "cancelled", // Always start as cancelled since items stay in transit
          returnedAt: null, // No return timestamp yet
          items: {
            create: currentOrder.orderItems.map(orderItem => ({
              productId: orderItem.productId,
              productName: orderItem.product.name,
              productCode: orderItem.product.code,
              quantity: orderItem.quantity,
              unitPrice: orderItem.unitPrice
            }))
          }
        }
      })

      // Handle inventory movement if not holding return
      if (!holdReturn && currentOrder.status !== 'cancelled') {
        // Get locations
        const locations = await tx.inventoryLocation.findMany({
          where: { isActive: true }
        })

        const locationMap = locations.reduce((acc, loc) => {
          acc[loc.name] = loc.id
          return acc
        }, {} as Record<string, string>)

        const productionLocationId = locationMap["Production"]
        const inTransitLocationId = locationMap["In Transit"]

        // Move stock back from In Transit to Production for each order item
        for (const orderItem of currentOrder.orderItems) {
          const quantity = orderItem.quantity
          await moveStock(tx, orderItem.productId, inTransitLocationId, productionLocationId, quantity, `Order ${orderId} cancelled - returned to production`)
        }
      }

      return order
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder
    })
  } catch (error) {
    console.error('Error canceling order:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to cancel order' },
      { status: 500 }
    )
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