import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PrismaClient } from '@/generated/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { status } = body

    if (!status || !['cancelled', 'returned'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "cancelled" or "returned"' },
        { status: 400 }
      )
    }

    // Update cancellation status and handle inventory movement
    const updatedCancellation = await prisma.$transaction(async (tx) => {
      // Get the cancellation with its items
      const cancellation = await tx.orderCancellation.findUnique({
        where: { id },
        include: {
          items: true
        }
      })

      if (!cancellation) {
        throw new Error('Cancellation not found')
      }

      // Update the cancellation status
      const updated = await tx.orderCancellation.update({
        where: { id },
        data: {
          status,
          returnedAt: status === 'returned' ? new Date() : null
        },
        include: {
          items: true
        }
      })

      // If marking as returned, move inventory from In Transit to Production
      if (status === 'returned' && cancellation.status === 'cancelled') {
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

        if (!productionLocationId || !inTransitLocationId) {
          throw new Error('Required locations (Production or In Transit) not found')
        }

        // Move stock back from In Transit to Production for each item
        for (const item of cancellation.items) {
          const quantity = item.quantity
          await moveStock(tx, item.productId, inTransitLocationId, productionLocationId, quantity, `Cancellation ${id} returned to production`)
        }
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      cancellation: {
        ...updatedCancellation,
        items: updatedCancellation.items.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice) // Convert Decimal to number
        }))
      }
    })
  } catch (error) {
    console.error('Error updating cancellation status:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Cancellation not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update cancellation status' },
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