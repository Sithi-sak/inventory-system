import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get order status breakdown
    const orderStatusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    // Get recent orders (last 15)
    const recentOrders = await prisma.order.findMany({
      take: 15,
      orderBy: {
        orderDate: 'desc'
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Format status data for chart
    const statusData = orderStatusCounts.map(item => ({
      name: getStatusLabel(item.status),
      value: item._count.status,
      status: item.status,
      count: item._count.status,
      // Add display names and colors
      label: getStatusLabel(item.status),
      color: getStatusColor(item.status)
    }))

    // Format recent orders
    const formattedOrders = recentOrders.map(order => ({
      id: order.id,
      customerName: order.customer.name,
      customerPhone: order.customer.phone,
      status: order.status,
      total: Number(order.totalAmount) * 100, // Convert to cents
      itemCount: order.orderItems.length,
      products: order.orderItems.map(item => item.product.name).join(', '),
      createdAt: order.orderDate
    }))

    return NextResponse.json({ 
      statusData,
      recentOrders: formattedOrders 
    })
  } catch (error) {
    console.error('Error fetching dashboard orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard orders' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'Not Delivered',
    'delivered': 'Delivered',
    'on_hold': 'On Hold', 
    'cancelled': 'Canceled',
    'returned': 'Returned'
  }
  return labels[status] || status
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'pending': '#f59e0b', // amber
    'delivered': '#10b981', // emerald
    'on_hold': '#3b82f6', // blue
    'cancelled': '#6b7280', // gray
    'returned': '#ef4444' // red
  }
  return colors[status] || '#6b7280'
}