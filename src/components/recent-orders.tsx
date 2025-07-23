'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RecentOrder {
  id: string
  customerName: string
  customerPhone: string
  status: string
  total: number
  itemCount: number
  products: string
  createdAt: string
}

interface RecentOrdersProps {
  orders: RecentOrder[]
}

const statusConfig = {
  pending: { label: 'Not Delivered', color: 'text-amber-600 bg-amber-50' },
  delivered: { label: 'Delivered', color: 'text-emerald-600 bg-emerald-50' },
  on_hold: { label: 'On Hold', color: 'text-blue-600 bg-blue-50' },
  cancelled: { label: 'Canceled', color: 'text-gray-600 bg-gray-50' },
  returned: { label: 'Returned', color: 'text-red-600 bg-red-50' },
}

export function RecentOrders({ orders }: RecentOrdersProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        No recent orders
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-64 overflow-y-auto">
      {orders.map((order) => {
        const statusInfo = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending
        
        return (
          <div
            key={order.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{order.customerName}</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate" title={order.products}>
                {order.products}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>${(order.total / 100).toFixed(2)}</span>
                <span>•</span>
                <span>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/customers">
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )
      })}
      
      {orders.length >= 15 && (
        <div className="pt-2 border-t">
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/dashboard/customers">
              View All Orders
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}