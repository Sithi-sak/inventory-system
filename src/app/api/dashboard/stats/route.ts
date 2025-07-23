import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get counts
    const [customerCount, productCount, totalInventory, orderStats] = await Promise.all([
      // Total customers
      prisma.customer.count(),
      
      // Total products 
      prisma.product.count(),
      
      // Total inventory at fulfillment location (delivery service)
      prisma.inventoryItem.aggregate({
        where: {
          location: {
            name: 'Fulfillment'
          }
        },
        _sum: {
          quantity: true
        }
      }),
      
      // Order statistics for current and previous month
      prisma.$transaction(async (tx) => {
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        
        const [currentMonthOrders, lastMonthOrders, deliveredOrders, totalRevenue] = await Promise.all([
          tx.order.count({
            where: {
              orderDate: {
                gte: currentMonthStart
              }
            }
          }),
          tx.order.count({
            where: {
              orderDate: {
                gte: lastMonthStart,
                lte: lastMonthEnd
              }
            }
          }),
          tx.order.count({
            where: {
              status: 'delivered'
            }
          }),
          tx.order.aggregate({
            where: {
              status: 'delivered'
            },
            _sum: {
              totalAmount: true
            }
          })
        ])
        
        return {
          currentMonthOrders,
          lastMonthOrders, 
          deliveredOrders,
          totalRevenue: Number(totalRevenue._sum.totalAmount) || 0
        }
      })
    ])

    // Calculate changes
    const orderChange = orderStats.lastMonthOrders === 0 
      ? 100 
      : Math.round(((orderStats.currentMonthOrders - orderStats.lastMonthOrders) / orderStats.lastMonthOrders) * 100)

    const stats = [
      {
        title: "Customers",
        value: customerCount.toLocaleString(),
        icon: "users",
        href: "/dashboard/customers"
      },
      {
        title: "Products", 
        value: productCount.toLocaleString(),
        icon: "package",
        href: "/dashboard/products"
      },
      {
        title: "Revenue",
        value: `$${orderStats.totalRevenue.toLocaleString()}`,
        icon: "dollar-sign",
        href: "/dashboard/reports"
      },
      {
        title: "Ready to Ship",
        value: (totalInventory._sum.quantity || 0).toLocaleString(),
        icon: "truck",
        href: "/dashboard/inventory"
      }
    ]

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}