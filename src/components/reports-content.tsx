"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Download, Calendar, LoaderIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ReportsData {
  period: {
    month: number;
    year: number;
    monthName: string;
  };
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    deliveredOrders: number;
    canceledOrders: number;
    onHoldOrders: number;
    pendingOrders: number;
    stockAdded: number;
    stockShipped: number;
    fulfillmentStock: number;
    productionStock: number;
    orderChange: number;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
    label: string;
  }>;
  cancellationReasons: Array<{
    reason: string;
    count: number;
    label: string;
  }>;
  recentOrders: Array<{
    id: string;
    customerName: string;
    status: string;
    total: number;
    createdAt: string;
  }>;
  stockMovements: Array<{
    id: string;
    type: string;
    quantity: number;
    productName: string;
    locationName: string;
    createdAt: string;
  }>;
}

export function ReportsContent() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Initialize with current month/year
  useEffect(() => {
    const now = new Date();
    setSelectedMonth((now.getMonth() + 1).toString());
    setSelectedYear(now.getFullYear().toString());
  }, []);

  useEffect(() => {
    if (!selectedMonth || !selectedYear) return;

    async function fetchReportsData() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/reports?month=${selectedMonth}&year=${selectedYear}`
        );
        if (!response.ok) throw new Error("Failed to fetch reports");
        const reportsData = await response.json();
        setData(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchReportsData();
  }, [selectedMonth, selectedYear]);

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = async () => {
    if (!data) return;
    
    setIsExporting(true);
    try {
      // Debug: Log data structure to see what's undefined
      console.log('Export data:', data);
      console.log('ordersByStatus:', data.ordersByStatus);
      console.log('cancellationReasons:', data.cancellationReasons);
      console.log('stockMovements:', data.stockMovements);
      
      // Create comprehensive CSV with all report data
      const csvSections = [];

      // 1. Summary Section
      csvSections.push("MONTHLY BUSINESS SUMMARY");
      csvSections.push(`Period,${data.period.monthName} ${data.period.year}`);
      csvSections.push(`Generated,${new Date().toLocaleDateString()}`);
      csvSections.push(""); // Empty line

      // 2. Key Metrics
      csvSections.push("KEY METRICS");
      csvSections.push("Metric,Value");
      csvSections.push(`Total Orders,${data.metrics.totalOrders}`);
      csvSections.push(`Orders Delivered,${data.metrics.deliveredOrders}`);
      csvSections.push(`Orders Cancelled,${data.metrics.canceledOrders}`);
      csvSections.push(`Orders On Hold,${data.metrics.onHoldOrders}`);
      csvSections.push(`Orders Pending,${data.metrics.pendingOrders}`);
      csvSections.push(`Total Revenue,$${data.metrics.totalRevenue}`);
      csvSections.push(`Current Stock Level,${data.metrics.fulfillmentStock}`);
      csvSections.push(""); // Empty line

      // 3. Orders by Status
      csvSections.push("ORDERS BY STATUS");
      csvSections.push("Status,Count,Percentage");
      if (data.ordersByStatus && data.ordersByStatus.length > 0) {
        data.ordersByStatus.forEach(status => {
          const percentage = data.metrics.totalOrders > 0 ? ((status.count / data.metrics.totalOrders) * 100).toFixed(1) : '0';
          csvSections.push(`${status.label},${status.count},${percentage}%`);
        });
      } else {
        csvSections.push("No order data available,0,0%");
      }
      csvSections.push(""); // Empty line

      // 4. Cancellation Reasons (if any)
      if (data.cancellationReasons && data.cancellationReasons.length > 0) {
        csvSections.push("CANCELLATION REASONS");
        csvSections.push("Reason,Count");
        data.cancellationReasons.forEach(reason => {
          csvSections.push(`${reason.label},${reason.count}`);
        });
        csvSections.push(""); // Empty line
      }

      // 5. Recent Stock Movements
      if (data.stockMovements && data.stockMovements.length > 0) {
        csvSections.push("RECENT STOCK MOVEMENTS");
        csvSections.push("Date,Product,Type,Quantity,Location,Notes");
        data.stockMovements.forEach(movement => {
          const date = new Date(movement.createdAt).toLocaleDateString();
          const notes = ''; // Notes not available in movement
          csvSections.push(`${date},${movement.productName},${movement.type},${movement.quantity},${movement.locationName},"${notes}"`);;
        });
        csvSections.push(""); // Empty line
      }

      // 6. Footer
      csvSections.push("Report generated by Inventory Management System");
      csvSections.push(`Export Date: ${new Date().toLocaleString()}`);

      const csvContent = csvSections.join('\n');
      const filename = `business-report-${data.period.monthName.toLowerCase()}-${data.period.year}.csv`;
      
      downloadCSV(csvContent, filename);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading || !data) {
    return <div className="text-center py-8">Loading reports...</div>;
  }

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - 2 + i;
    return { value: year.toString(), label: year.toString() };
  });

  const statusChartData = data.ordersByStatus.map((item) => ({
    name: item.label,
    value: item.count,
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Period:</span>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-24">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isExporting}>
          {isExporting ? (
            <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Summary Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {data.period.monthName} {data.period.year} Summary
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Orders Placed"
            value={data.metrics.totalOrders}
            change={data.metrics.orderChange}
            suffix=" orders"
          />
          <MetricCard
            title="Orders Delivered"
            value={data.metrics.deliveredOrders}
            percentage={
              data.metrics.totalOrders > 0
                ? (data.metrics.deliveredOrders / data.metrics.totalOrders) *
                  100
                : 0
            }
            suffix=" orders"
          />
          <MetricCard
            title="Orders Canceled"
            value={data.metrics.canceledOrders}
            subtitle={
              data.cancellationReasons.length > 0
                ? `${data.cancellationReasons.slice(0, 2).map(r => `${r.count} ${r.label.toLowerCase()}`).join(', ')}${data.cancellationReasons.length > 2 ? ', +more' : ''}`
                : "With reason/status tracked"
            }
            suffix=" orders"
          />
          <MetricCard
            title="Pending Orders"
            value={data.metrics.pendingOrders + data.metrics.onHoldOrders}
            subtitle={`${data.metrics.pendingOrders} pending, ${data.metrics.onHoldOrders} on hold`}
            suffix=" orders"
          />
          <MetricCard
            title="Revenue"
            value={data.metrics.totalRevenue}
            prefix="$"
            suffix=""
          />
          <MetricCard
            title="Ready to Ship"
            value={data.metrics.fulfillmentStock}
            subtitle={`${data.metrics.productionStock} in production`}
            suffix=" units"
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Orders by Status */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Orders by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cancellation Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Cancellation Breakdown</h3>
          {data.cancellationReasons.length > 0 ? (
            <div className="space-y-3">
              {data.cancellationReasons.map((reason) => (
                <div
                  key={reason.reason}
                  className="flex justify-between items-center p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium">{reason.label}</span>
                  <span className="text-lg font-semibold text-red-600">
                    {reason.count}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total Canceled
                  </span>
                  <span className="text-lg font-bold text-red-600">
                    {data.metrics.canceledOrders}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No canceled orders this month</p>
              <p className="text-xs mt-1">
                Cancellation reasons will appear here when orders are canceled
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{order.customerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(order.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">
                    ${order.total.toFixed(2)}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${getStatusStyle(
                      order.status
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Movements */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Stock Movements</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {data.stockMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{movement.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {movement.type} • {movement.locationName}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium text-sm ${
                      movement.quantity >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {movement.quantity >= 0 ? "+" : ""}
                    {movement.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(movement.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  percentage,
  prefix = "",
  suffix = "",
  subtitle,
}: {
  title: string;
  value: number;
  change?: number;
  percentage?: number;
  prefix?: string;
  suffix?: string;
  subtitle?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold">
        {prefix}
        {value.toLocaleString()}
        {suffix}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
      {change !== undefined && (
        <p
          className={`text-xs ${
            change >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {change >= 0 ? "+" : ""}
          {change}% vs last month
        </p>
      )}
      {percentage !== undefined && (
        <p className="text-xs text-muted-foreground">
          {percentage.toFixed(1)}% of total orders
        </p>
      )}
    </div>
  );
}

function getStatusStyle(status: string): string {
  const styles: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50",
    delivered: "text-emerald-600 bg-emerald-50",
    on_hold: "text-blue-600 bg-blue-50",
    cancelled: "text-gray-600 bg-gray-50",
    returned: "text-red-600 bg-red-50",
  };
  return styles[status] || styles.pending;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Not Delivered",
    delivered: "Delivered",
    on_hold: "On Hold",
    cancelled: "Canceled",
    returned: "Returned",
  };
  return labels[status] || status;
}
