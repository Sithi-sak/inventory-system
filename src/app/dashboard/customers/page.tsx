"use client";

import { useId, useMemo, useRef, useState, useEffect } from "react";
import { useTitle } from "@/lib/use-title";
import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  FilterIcon,
  ListFilterIcon,
  TrashIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddCustomerModal } from "@/components/add-customer-modal";
import { EditCustomerModal } from "@/components/edit-customer-modal";
import { Badge } from "@/components/ui/badge";
import { StatusSelect } from "@/components/status-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Item = {
  id: string;
  name: string;
  phone: string;
  location: string;
  preferredDeliveryTime?: string;
  notes?: string;
  createdAt: string;
  orders: Array<{
    id: string;
    orderDate: string;
    deliveryDate?: string;
    status: string;
    totalAmount: number;
    orderItems: Array<{
      id: string;
      quantity: number;
      unitPrice: number;
      product: {
        id: string;
        name: string;
        code: string;
        price: number;
      };
    }>;
  }>;
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<Item> = (row, columnId, filterValue) => {
  const searchableRowContent =
    `${row.original.name} ${row.original.phone}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

const statusFilterFn: FilterFn<Item> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const orders = row.getValue(columnId) as Array<{ status: string }>;
  if (!orders.length) return filterValue.includes("no-orders");
  const latestStatus = orders[0].status;
  return filterValue.includes(latestStatus);
};

export default function Page() {
  useTitle("Customers - LSTS");
  const id = useId();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "status",
      desc: false,
    },
    {
      id: "name", 
      desc: false,
    },
  ]);

  const [data, setData] = useState<Item[]>([]);
  const [editingCustomer, setEditingCustomer] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPreviousPage: false,
    limit: 10
  });
  const [hideDelivered, setHideDelivered] = useState(true); // Default to hiding delivered orders

  const fetchCustomers = async (searchFilters?: { name?: string; status?: string[] }) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const searchParams = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(), // Convert 0-based to 1-based
        limit: pagination.pageSize.toString(),
        hideDelivered: hideDelivered.toString()
      });
      
      // Add search filter
      if (searchFilters?.name) {
        searchParams.set('search', searchFilters.name);
      }
      
      // Add status filter
      if (searchFilters?.status && searchFilters.status.length > 0) {
        searchParams.set('status', searchFilters.status.join(','));
      }
      
      const res = await fetch(`/api/customers?${searchParams.toString()}`);
      if (res.ok) {
        const response = await res.json();
        setData(response.data);
        setPaginationInfo(response.pagination);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load and when pagination/hideDelivered changes
  useEffect(() => {
    fetchCustomers();
  }, [pagination.pageIndex, pagination.pageSize, hideDelivered]);

  const handleAddCustomer = async (customer: {
    name: string;
    phone: string;
    location: string;
    preferredDeliveryTime?: string;
    notes?: string;
    orderItems: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => {
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customer),
      });

      if (res.ok) {
        await fetchCustomers(); // Refresh the data
      }
    } catch (error) {
      console.error("Error adding customer:", error);
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: {
    id: string;
    name: string;
    phone: string;
    location: string;
    preferredDeliveryTime?: string;
    notes?: string;
    orderItems?: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => {
    try {
      const res = await fetch(`/api/customers/${updatedCustomer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: updatedCustomer.name,
          phone: updatedCustomer.phone,
          location: updatedCustomer.location,
          preferredDeliveryTime: updatedCustomer.preferredDeliveryTime,
          notes: updatedCustomer.notes,
          orderItems: updatedCustomer.orderItems,
        }),
      });

      if (res.ok) {
        await fetchCustomers(); // Refresh the data
      } else {
        // Show error message from the API
        const errorData = await res.json();
        alert(errorData.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setData((prevData) =>
          prevData.filter((item) => item.id !== customerId)
        );
      } else {
        // Show error message from the API
        const errorData = await res.json();
        alert(errorData.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const handleStatusUpdate = async (
    customerId: string,
    orderId: string,
    newStatus: string
  ) => {
    try {
      const res = await fetch(
        `/api/customers/${customerId}/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (res.ok) {
        // Update the local state optimistically
        setData((prevData) =>
          prevData.map((customer) =>
            customer.id === customerId
              ? {
                  ...customer,
                  orders: customer.orders.map((order) =>
                    order.id === orderId
                      ? { ...order, status: newStatus }
                      : order
                  ),
                }
              : customer
          )
        );
      } else {
        // Show error message from the API
        const errorData = await res.json();
        alert(errorData.error || "Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const columns: ColumnDef<Item>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 28,
      enableSorting: false,
      enableHiding: false,
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      size: 180,
      filterFn: multiColumnFilterFn,
      enableHiding: false,
    },
    {
      header: "Phone",
      accessorKey: "phone",
      size: 150,
    },
    {
      header: "Location",
      accessorKey: "location",
      size: 150,
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleDateString();
      },
      size: 120,
    },
    {
      id: "orders",
      header: "Orders",
      accessorKey: "orders",
      cell: ({ row }) => {
        const orders = row.getValue("orders") as Array<{
          orderItems: Array<{
            quantity: number;
            product: { code: string; name: string };
          }>;
        }>;
        if (!orders.length)
          return <span className="text-muted-foreground">No orders</span>;

        const latestOrder = orders[0];
        const hasMoreItems = latestOrder.orderItems.length > 2;

        return (
          <div className="space-y-1">
            {latestOrder.orderItems.slice(0, 2).map((item, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">{item.product.code}</span> -{" "}
                {item.product.name} × {item.quantity}
              </div>
            ))}
            {hasMoreItems && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-xs text-muted-foreground cursor-help">
                      +{latestOrder.orderItems.length - 2} more...
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="px-3 py-2 text-sm max-w-xs">
                    <div className="space-y-1">
                      {latestOrder.orderItems.slice(2).map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">
                            {item.product.code}
                          </span>{" "}
                          - {item.product.name} × {item.quantity}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
      size: 200,
    },
    {
      id: "total",
      header: "Total",
      accessorKey: "orders",
      cell: ({ row }) => {
        const orders = row.getValue("orders") as Array<{ totalAmount: number }>;
        if (!orders.length) return "$0.00";

        const total = orders.reduce(
          (sum, order) => sum + parseFloat(order.totalAmount.toString()),
          0
        );
        const formatted = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(total);
        return formatted;
      },
      size: 120,
    },
    {
      id: "status",
      header: "Latest Status",
      accessorKey: "orders",
      cell: ({ row }) => {
        const orders = row.getValue("orders") as Array<{
          id: string;
          status: string;
        }>;
        if (!orders.length) return <Badge variant="secondary">No orders</Badge>;

        const latestOrder = orders[0];
        const customerId = row.original.id;

        if (latestOrder.status === "delivered") {
          return (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                ✓ Completed
              </Badge>
            </div>
          );
        }

        return (
          <StatusSelect
            value={latestOrder.status}
            onValueChange={(newStatus) =>
              handleStatusUpdate(customerId, latestOrder.id, newStatus)
            }
            disabled={false}
            customerName={row.original.name}
            orderId={latestOrder.id}
          />
        );
      },
      size: 150,
      filterFn: statusFilterFn,
      sortingFn: (rowA, rowB) => {
        const ordersA = rowA.getValue("orders") as Array<{ status: string }>;
        const ordersB = rowB.getValue("orders") as Array<{ status: string }>;
        
        const statusA = ordersA.length > 0 ? ordersA[0].status : "";
        const statusB = ordersB.length > 0 ? ordersB[0].status : "";
        
        // Put delivered orders at the bottom
        if (statusA === "delivered" && statusB !== "delivered") return 1;
        if (statusA !== "delivered" && statusB === "delivered") return -1;
        
        // For non-delivered orders, sort alphabetically
        return statusA.localeCompare(statusB);
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const hasDeliveredOrder = row.original.orders.some(order => order.status === "delivered");
        return (
          <RowActions
            row={row}
            onEdit={() => setEditingCustomer(row.original)}
            onDelete={() => handleDeleteCustomer(row.original.id)}
            hasDeliveredOrder={hasDeliveredOrder}
          />
        );
      },
      size: 60,
      enableHiding: false,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    // Manual pagination for server-side
    manualPagination: true,
    pageCount: paginationInfo.totalPages,
    onPaginationChange: setPagination,
    // Manual filtering for server-side
    manualFiltering: true,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  });

  // Debounced search effect (runs after table is created)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const nameFilter = table.getColumn("name")?.getFilterValue() as string;
      const statusFilter = table.getColumn("status")?.getFilterValue() as string[];
      
      fetchCustomers({
        name: nameFilter,
        status: statusFilter
      });
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [table.getColumn("name")?.getFilterValue(), table.getColumn("status")?.getFilterValue()]);

  const handleDeleteRows = async () => {
    const selectedRows = table.getSelectedRowModel().rows;
    const deletePromises = selectedRows.map((row) =>
      fetch(`/api/customers/${row.original.id}`, { method: "DELETE" })
    );

    try {
      await Promise.all(deletePromises);
      const updatedData = data.filter(
        (item) => !selectedRows.some((row) => row.original.id === item.id)
      );
      setData(updatedData);
      table.resetRowSelection();
    } catch (error) {
      console.error("Error deleting customers:", error);
    }
  };

  // Get unique status values from orders
  const uniqueStatusValues = useMemo(() => {
    const statuses = new Set<string>();
    data.forEach((customer) => {
      if (customer.orders.length === 0) {
        statuses.add("no-orders");
      } else {
        customer.orders.forEach((order) => {
          statuses.add(order.status);
        });
      }
    });
    return Array.from(statuses).sort();
  }, [data]);

  // Get counts for each status
  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    data.forEach((customer) => {
      if (customer.orders.length === 0) {
        counts.set("no-orders", (counts.get("no-orders") || 0) + 1);
      } else {
        const latestStatus = customer.orders[0].status;
        counts.set(latestStatus, (counts.get(latestStatus) || 0) + 1);
      }
    });
    return counts;
  }, [data]);

  const selectedStatuses = useMemo(() => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("status")?.getFilterValue()]);

  const handleStatusChange = (checked: boolean, value: string) => {
    const filterValue = table.getColumn("status")?.getFilterValue() as string[];
    const newFilterValue = filterValue ? [...filterValue] : [];

    if (checked) {
      newFilterValue.push(value);
    } else {
      const index = newFilterValue.indexOf(value);
      if (index > -1) {
        newFilterValue.splice(index, 1);
      }
    }

    table
      .getColumn("status")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Filter by name or phone */}
          <div className="relative">
            <Input
              id={`${id}-input`}
              ref={inputRef}
              className={cn(
                "peer min-w-60 ps-9",
                Boolean(table.getColumn("name")?.getFilterValue()) && "pe-9"
              )}
              value={
                (table.getColumn("name")?.getFilterValue() ?? "") as string
              }
              onChange={(e) =>
                table.getColumn("name")?.setFilterValue(e.target.value)
              }
              placeholder="Filter by name or phone..."
              type="text"
              aria-label="Filter by name or phone"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-3 peer-disabled:opacity-50">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(table.getColumn("name")?.getFilterValue()) && (
              <button
                className="text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Clear filter"
                onClick={() => {
                  table.getColumn("name")?.setFilterValue("");
                  if (inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
          {/* Filter by status */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Status
                {selectedStatuses.length > 0 && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {selectedStatuses.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Filters
                </div>
                <div className="space-y-3">
                  {uniqueStatusValues.map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-${i}`}
                        checked={selectedStatuses.includes(value)}
                        onCheckedChange={(checked: boolean) =>
                          handleStatusChange(checked, value)
                        }
                      />
                      <Label
                        htmlFor={`${id}-${i}`}
                        className="flex grow justify-between gap-2 font-normal"
                      >
                        {value === "no-orders"
                          ? "No Orders"
                          : value === "on_hold"
                          ? "On Hold"
                          : value.charAt(0).toUpperCase() + value.slice(1)}{" "}
                        <span className="text-muted-foreground ms-2 text-xs">
                          {statusCounts.get(value)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          {/* Hide delivered orders toggle */}
          <Button
            variant={hideDelivered ? "default" : "outline"}
            onClick={() => setHideDelivered(!hideDelivered)}
            className="gap-2"
          >
            {hideDelivered ? "✓" : ""} Hide Completed
          </Button>
          {/* Toggle columns visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Columns3Icon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3">
          {/* Delete button */}
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="ml-auto" variant="outline">
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  Delete
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex flex-col gap-2 max-sm:items-center sm:flex-row sm:gap-4">
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                    aria-hidden="true"
                  >
                    <CircleAlertIcon className="opacity-80" size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete{" "}
                      {table.getSelectedRowModel().rows.length} selected{" "}
                      {table.getSelectedRowModel().rows.length === 1
                        ? "row"
                        : "rows"}
                      .
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteRows}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Add Customer Modal */}
          <AddCustomerModal onAddCustomer={handleAddCustomer} />
        </div>
      </div>

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          open={!!editingCustomer}
          onOpenChange={(open) => !open && setEditingCustomer(null)}
          onUpdateCustomer={handleUpdateCustomer}
        />
      )}

      {/* Table */}
      <div className="bg-background overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: `${header.getSize()}px` }}
                      className="h-11"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <div
                          className={cn(
                            header.column.getCanSort() &&
                              "flex h-full cursor-pointer items-center justify-between gap-2 select-none"
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                          onKeyDown={(e) => {
                            // Enhanced keyboard handling for sorting
                            if (
                              header.column.getCanSort() &&
                              (e.key === "Enter" || e.key === " ")
                            ) {
                              e.preventDefault();
                              header.column.getToggleSortingHandler()?.(e);
                            }
                          }}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {{
                            asc: (
                              <ChevronUpIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                            desc: (
                              <ChevronDownIcon
                                className="shrink-0 opacity-60"
                                size={16}
                                aria-hidden="true"
                              />
                            ),
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const hasDeliveredOrder = row.original.orders.some(order => order.status === "delivered");
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={hasDeliveredOrder ? "opacity-60 bg-muted/30" : ""}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="last:py-0">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8">
        {/* Results per page */}
        <div className="flex items-center gap-3">
          <Label htmlFor={id} className="max-sm:sr-only">
            Rows per page
          </Label>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger id={id} className="w-fit whitespace-nowrap">
              <SelectValue placeholder="Select number of results" />
            </SelectTrigger>
            <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
              {[5, 10, 25, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Page number information */}
        <div className="text-muted-foreground flex grow justify-end text-sm whitespace-nowrap">
          <p
            className="text-muted-foreground text-sm whitespace-nowrap"
            aria-live="polite"
          >
            <span className="text-foreground">
              {(paginationInfo.currentPage - 1) * paginationInfo.limit + 1}
              -
              {Math.min(
                paginationInfo.currentPage * paginationInfo.limit,
                paginationInfo.totalCount
              )}
            </span>{" "}
            of{" "}
            <span className="text-foreground">
              {paginationInfo.totalCount.toString()}
            </span>
          </p>
        </div>

        {/* Pagination buttons */}
        <div>
          <Pagination>
            <PaginationContent>
              {/* First page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to first page"
                >
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Previous page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Next page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Last page button */}
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  className="disabled:pointer-events-none disabled:opacity-50"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                  aria-label="Go to last page"
                >
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  row,
  onEdit,
  onDelete,
  hasDeliveredOrder,
}: {
  row: Row<Item>;
  onEdit: () => void;
  onDelete: () => void;
  hasDeliveredOrder: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label="Actions"
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={hasDeliveredOrder ? undefined : onEdit}
          disabled={hasDeliveredOrder}
          className={hasDeliveredOrder ? "opacity-50 cursor-not-allowed" : ""}
        >
          <span>Edit</span>
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "text-destructive focus:text-destructive",
            hasDeliveredOrder && "opacity-50 cursor-not-allowed"
          )}
          onClick={hasDeliveredOrder ? undefined : onDelete}
          disabled={hasDeliveredOrder}
        >
          <span>Delete</span>
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
