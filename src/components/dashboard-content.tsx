'use client'

import { useEffect, useState } from 'react'
import { StatsGrid } from '@/components/stats-grid'
import { OrderStatusChart } from '@/components/order-status-chart'
import { RecentOrders } from '@/components/recent-orders'
import { Users, Package, DollarSign, Truck } from 'lucide-react'

interface DashboardStats {
  title: string
  value: string
  change: {
    value: string
    trend: 'up' | 'down'
  }
  icon: string
}

interface OrderData {
  statusData: Array<{
    status: string
    count: number
    label: string
    color: string
  }>
  recentOrders: Array<{
    id: string
    customerName: string
    customerPhone: string
    status: string
    total: number
    itemCount: number
    products: string
    createdAt: string
  }>
}

const iconMap = {
  users: Users,
  package: Package,
  'dollar-sign': DollarSign,
  truck: Truck,
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats[]>([])
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [statsResponse, ordersResponse] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/dashboard/orders')
        ])

        if (!statsResponse.ok || !ordersResponse.ok) {
          throw new Error('Failed to fetch dashboard data')
        }

        const statsData = await statsResponse.json()
        const ordersData = await ordersResponse.json()

        setStats(statsData.stats)
        setOrderData(ordersData)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return <div>Loading...</div>
  }

  // Transform stats to include actual icons
  const statsWithIcons = stats.map(stat => {
    const IconComponent = iconMap[stat.icon as keyof typeof iconMap]
    return {
      ...stat,
      icon: IconComponent ? <IconComponent className="h-5 w-5" /> : null
    }
  })

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <StatsGrid stats={statsWithIcons} />
      
      {/* Charts and Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Order Status Chart */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
          {orderData && <OrderStatusChart data={orderData.statusData} />}
        </div>
        
        {/* Recent Orders */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          {orderData && <RecentOrders orders={orderData.recentOrders} />}
        </div>
      </div>
    </div>
  )
}