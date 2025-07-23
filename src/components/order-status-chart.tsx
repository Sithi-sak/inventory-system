'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

interface StatusData {
  status: string
  count: number
  label: string
  color: string
}

interface OrderStatusChartProps {
  data: StatusData[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    payload: StatusData
  }>
}

// Custom tooltip component that respects dark mode
const CustomTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-popover text-popover-foreground border border-border rounded-md shadow-md px-3 py-1.5 text-sm">
        <p className="font-medium">{data.label}</p>
        <p className="text-muted-foreground">{`${data.count} orders`}</p>
      </div>
    )
  }
  return null
}

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No orders to display
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}