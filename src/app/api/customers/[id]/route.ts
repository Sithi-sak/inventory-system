import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
          // Delete existing order items
          await tx.orderItem.deleteMany({
            where: { orderId: latestOrder.id }
          })

          // Calculate new total
          const totalAmount = orderItems.reduce((sum: number, item: any) => {
            return sum + (parseFloat(item.unitPrice) * parseInt(item.quantity))
          }, 0)

          // Update order total
          await tx.order.update({
            where: { id: latestOrder.id },
            data: { totalAmount }
          })

          // Create new order items
          await tx.orderItem.createMany({
            data: orderItems.map((item: any) => ({
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