import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    
    // Default to current month if not specified
    const targetDate = new Date()
    const targetYear = year ? parseInt(year) : targetDate.getFullYear()
    const targetMonth = month ? parseInt(month) - 1 : targetDate.getMonth() // JS months are 0-indexed
    
    const monthStart = new Date(targetYear, targetMonth, 1)
    const monthEnd = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
    
    // Get comprehensive monthly data
    const [
      ordersThisMonth,
      ordersByStatus,
      cancellationReasons,
      stockMovements,
      currentInventory,
      previousMonthOrders
    ] = await Promise.all([
      // All orders this month
      prisma.order.findMany({
        where: {
          orderDate: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        include: {
          orderItems: true,
          customer: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // Orders by status this month
      prisma.order.groupBy({
        by: ['status'],
        where: {
          orderDate: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        _count: {
          status: true
        }
      }),
      
      // Cancellation reasons breakdown
      prisma.order.groupBy({
        by: ['cancellationReason'],
        where: {
          status: 'cancelled',
          orderDate: {
            gte: monthStart,
            lte: monthEnd
          },
          cancellationReason: {
            not: null
          }
        },
        _count: {
          cancellationReason: true
        }
      }),
      
      // Stock movements this month
      prisma.stockMovement.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd
          }
        },
        include: {
          product: {
            select: {
              name: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // Current inventory levels
      prisma.inventoryItem.findMany({
        include: {
          product: {
            select: {
              name: true
            }
          },
          location: {
            select: {
              name: true
            }
          }
        }
      }),
      
      // Previous month for comparison
      prisma.order.count({
        where: {
          orderDate: {
            gte: new Date(targetYear, targetMonth - 1, 1),
            lte: new Date(targetYear, targetMonth, 0, 23, 59, 59, 999)
          }
        }
      })
    ])
    
    // Calculate metrics
    const totalOrders = ordersThisMonth.length
    const totalRevenue = ordersThisMonth
      .filter(order => order.status === 'delivered') // Only count delivered orders
      .reduce((sum, order) => sum + Number(order.totalAmount), 0)
    
    const deliveredOrders = ordersByStatus.find(s => s.status === 'delivered')?._count?.status || 0
    const canceledOrders = ordersByStatus.find(s => s.status === 'cancelled')?._count?.status || 0
    const onHoldOrders = ordersByStatus.find(s => s.status === 'on_hold')?._count?.status || 0
    const pendingOrders = ordersByStatus.find(s => s.status === 'pending')?._count?.status || 0
    
    // Stock movements breakdown
    const stockAdded = stockMovements
      .filter(m => m.movementType === 'production' || m.movementType === 'adjustment')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    
    const stockShipped = stockMovements
      .filter(m => m.movementType === 'transfer' || m.movementType === 'sale')
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0)
    
    // Current stock at fulfillment (delivery service)
    const fulfillmentStock = currentInventory
      .filter(item => item.location.name === 'Fulfillment')
      .reduce((sum, item) => sum + item.quantity, 0)
    
    // Production stock (ready to ship)
    const productionStock = currentInventory
      .filter(item => item.location.name === 'Production')
      .reduce((sum, item) => sum + item.quantity, 0)
    
    // Calculate month-over-month change
    const orderChange = previousMonthOrders === 0 
      ? (totalOrders > 0 ? 100 : 0)
      : Math.round(((totalOrders - previousMonthOrders) / previousMonthOrders) * 100)
    
    // Format response
    const summary = {
      period: {
        month: targetMonth + 1, // Convert back to 1-indexed
        year: targetYear,
        monthName: monthStart.toLocaleDateString('en-US', { month: 'long' })
      },
      metrics: {
        totalOrders,
        totalRevenue, // Already in dollars from Decimal
        deliveredOrders,
        canceledOrders,
        onHoldOrders,
        pendingOrders,
        stockAdded,
        stockShipped,
        fulfillmentStock,
        productionStock,
        orderChange
      },
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count?.status || 0,
        label: getStatusLabel(item.status)
      })),
      cancellationReasons: cancellationReasons.map(item => ({
        reason: item.cancellationReason || 'unknown',
        count: item._count?.cancellationReason || 0,
        label: getCancellationReasonLabel(item.cancellationReason || 'unknown')
      })),
      recentOrders: ordersThisMonth
        .slice(0, 10)
        .map(order => ({
          id: order.id,
          customerName: order.customer.name,
          status: order.status,
          total: Number(order.totalAmount),
          createdAt: order.orderDate
        })),
      stockMovements: stockMovements
        .slice(0, 15)
        .map(movement => ({
          id: movement.id,
          type: movement.movementType,
          quantity: movement.quantity,
          productName: movement.product.name,
          locationName: movement.location?.name || 'Unknown',
          createdAt: movement.createdAt
        })),
    }
    
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching reports data:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: 'Failed to fetch reports data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'Not Delivered',
    'delivered': 'Delivered',
    'on_hold': 'On Hold',
    'cancelled': 'Canceled'
  }
  return labels[status] || status
}

function getCancellationReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'customer_not_home': 'Customer not home',
    'customer_didnt_answer': "Customer didn't answer",
    'customer_refused': 'Customer refused delivery',
    'wrong_address': 'Wrong/invalid address',
    'product_damaged': 'Product damaged',
    'payment_failed': 'Payment failed',
    'customer_canceled': 'Customer proactively canceled',
    'delivery_failed': 'Delivery service failed',
    'other': 'Other reason',
    'unknown': 'Unknown reason'
  }
  return labels[reason] || reason
}