"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  PlusIcon,
  TrashIcon,
  HistoryIcon,
  PackageIcon,
  TruckIcon,
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
import { StockMovementModal } from "@/components/stock-movement-modal";
import { StockHistoryModal } from "@/components/stock-history-modal";
import {
  QuickActionPopover,
  getQuickActions,
} from "@/components/quick-action-popover";
import { Badge } from "@/components/ui/badge";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

type Location = {
  id: string;
  name: string;
};

type InventoryItem = {
  id: string;
  name: string;
  code: string;
  price: number;
  locationStock: Record<string, number>;
  totalStock: number;
  lastActivity: string | null;
};

// Custom filter function for multi-column searching
const multiColumnFilterFn: FilterFn<InventoryItem> = (
  row,
  columnId,
  filterValue
) => {
  const searchableRowContent =
    `${row.original.name} ${row.original.code}`.toLowerCase();
  const searchTerm = (filterValue ?? "").toLowerCase();
  return searchableRowContent.includes(searchTerm);
};

const stockFilterFn: FilterFn<InventoryItem> = (
  row,
  columnId,
  filterValue: string[]
) => {
  if (!filterValue?.length) return true;
  const stock = row.original.totalStock;
  return filterValue.some((value) => {
    if (value === "in-stock") return stock > 0;
    if (value === "out-of-stock") return stock === 0;
    return false;
  });
};

export default function Page() {
  useTitle("Inventory - LSTS");
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
      id: "name",
      desc: false,
    },
  ]);

  const [data, setData] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockMovementModal, setStockMovementModal] = useState<{
    open: boolean;
    productId: string;
    productName: string;
  }>({ open: false, productId: "", productName: "" });
  const [stockHistoryModal, setStockHistoryModal] = useState<{
    open: boolean;
    productId: string;
    productName: string;
  }>({ open: false, productId: "", productName: "" });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/inventory");
      if (res.ok) {
        const { inventory, locations: fetchedLocations } = await res.json();
        setData(inventory);
        setLocations(fetchedLocations);
      }
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleStockMovement = () => {
    fetchInventory();
    setStockMovementModal({ open: false, productId: "", productName: "" });
  };

  const openStockMovementModal = (productId: string, productName: string) => {
    setStockMovementModal({ open: true, productId, productName });
  };

  const openStockHistoryModal = (productId: string, productName: string) => {
    setStockHistoryModal({ open: true, productId, productName });
  };

  // Handle quick actions from popover
  const handleQuickAction = async (
    productId: string,
    actionId: string,
    quantity: number
  ) => {
    const locationMap = locations.reduce((acc, loc) => {
      acc[loc.name] = loc.id;
      return acc;
    }, {} as Record<string, string>);

    switch (actionId) {
      case "production":
        await quickStockMovement(
          productId,
          "production",
          quantity,
          "Production"
        );
        break;
      case "ship-to-fulfillment":
        await quickStockMovement(
          productId,
          "transfer",
          quantity,
          null,
          "Production",
          "Fulfillment"
        );
        break;
      case "send-for-delivery":
        await quickStockMovement(
          productId,
          "transfer",
          quantity,
          null,
          "Fulfillment",
          "In Transit"
        );
        break;
      case "mark-delivered":
        await quickStockMovement(productId, "sale", quantity, "In Transit");
        break;
      case "move-to-fulfillment":
        await quickStockMovement(
          productId,
          "transfer",
          quantity,
          null,
          "In Transit",
          "Fulfillment"
        );
        break;
    }
  };

  const quickStockMovement = async (
    productId: string,
    movementType: string,
    quantity: number,
    locationId?: string | null,
    fromLocationId?: string,
    toLocationId?: string
  ) => {
    try {
      // Find location IDs by name
      const locationMap = locations.reduce((acc, loc) => {
        acc[loc.name] = loc.id;
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch("/api/inventory/stock-movement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          movementType,
          quantity,
          locationId: locationId ? locationMap[locationId] : undefined,
          fromLocationId: fromLocationId
            ? locationMap[fromLocationId]
            : undefined,
          toLocationId: toLocationId ? locationMap[toLocationId] : undefined,
          notes: `Quick ${movementType} action`,
        }),
      });

      if (response.ok) {
        fetchInventory(); // Refresh the data
      } else {
        const error = await response.json();
        alert(error.error || "Failed to record stock movement");
      }
    } catch (error) {
      console.error("Error recording stock movement:", error);
      alert("Failed to record stock movement");
    }
  };

  const columns: ColumnDef<InventoryItem>[] = [
    {
      header: "Product Name",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
      size: 180,
      filterFn: multiColumnFilterFn,
      enableHiding: false,
    },
    {
      header: "Code",
      accessorKey: "code",
      size: 120,
    },
    ...locations.map(
      (location): ColumnDef<InventoryItem> => ({
        id: location.name,
        header: () => {
          const getLocationTooltip = (locationName: string) => {
            switch (locationName) {
              case "Production":
                return "Client's factory and production facility where products are manufactured";
              case "Fulfillment":
                return "Storage facility where completed products await delivery, managed by delivery express partners";
              case "In Transit":
                return "Products currently being delivered to customers by delivery partners";
              default:
                return `Stock location: ${locationName}`;
            }
          };

          return (
            <div className="text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="font-medium cursor-help">{location.name}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-48 text-center">{getLocationTooltip(location.name)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        },
        cell: ({ row }: { row: Row<InventoryItem> }) => {
          const stock = row.original.locationStock[location.name] || 0;
          const getStockColor = (stock: number) => {
            if (stock === 0) return "text-muted-foreground";
            if (stock <= 5) return "text-amber-600";
            return "text-emerald-600";
          };

          const renderQuickActions = () => {
            const productId = row.original.id;
            const quickActions = getQuickActions(location.name, stock > 0);

            return (
              <div className="flex gap-1 mt-1 justify-center">
                <QuickActionPopover
                  actions={quickActions}
                  onAction={(actionId, quantity) =>
                    handleQuickAction(productId, actionId, quantity)
                  }
                  currentStock={stock}
                  locationName={location.name}
                />
              </div>
            );
          };

          return (
            <div className="text-center">
              <span className={cn("font-medium", getStockColor(stock))}>
                {stock}
              </span>
              {renderQuickActions()}
            </div>
          );
        },
        size: 140,
        enableSorting: false,
      })
    ),
    {
      header: "Total",
      accessorKey: "totalStock",
      cell: ({ row }) => {
        const stock = row.original.totalStock;
        const getStockColor = (stock: number) => {
          if (stock === 0) return "bg-red-500";
          if (stock <= 10) return "bg-amber-500";
          return "bg-emerald-500";
        };
        return (
          <Badge variant="outline" className="gap-1.5">
            <span
              className={cn("size-1.5 rounded-full", getStockColor(stock))}
              aria-hidden="true"
            />
            {stock}
          </Badge>
        );
      },
      size: 100,
      filterFn: stockFilterFn,
    },
    {
      header: "Last Activity",
      accessorKey: "lastActivity",
      cell: ({ row }) => {
        const lastActivity = row.original.lastActivity;
        if (!lastActivity)
          return <span className="text-muted-foreground">-</span>;
        const now = new Date();
        const activityDate = new Date(lastActivity);
        const diffInHours = Math.floor(
          (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60)
        );

        let timeAgo;
        if (diffInHours < 1) {
          timeAgo = "< 1 hr ago";
        } else if (diffInHours < 24) {
          timeAgo = `${diffInHours} hr${diffInHours > 1 ? "s" : ""} ago`;
        } else {
          const diffInDays = Math.floor(diffInHours / 24);
          timeAgo = `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
        }

        return <span className="text-muted-foreground text-sm">{timeAgo}</span>;
      },
      size: 120,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <RowActions
          row={row}
          onUpdateStock={() =>
            openStockMovementModal(row.original.id, row.original.name)
          }
          onViewHistory={() =>
            openStockHistoryModal(row.original.id, row.original.name)
          }
        />
      ),
      size: 100,
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
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility,
    },
  });

  // Get unique stock status values
  const uniqueStockValues = useMemo(() => {
    return ["in-stock", "out-of-stock"];
  }, []);

  // Get counts for each stock status
  const stockCounts = useMemo(() => {
    const inStock = data.filter((item) => item.totalStock > 0).length;
    const outOfStock = data.filter((item) => item.totalStock === 0).length;
    return new Map([
      ["in-stock", inStock],
      ["out-of-stock", outOfStock],
    ]);
  }, [data]);

  const selectedStockStatuses = useMemo(() => {
    const filterValue = table
      .getColumn("totalStock")
      ?.getFilterValue() as string[];
    return filterValue ?? [];
  }, [table.getColumn("totalStock")?.getFilterValue(), table]);

  const handleStockStatusChange = (checked: boolean, value: string) => {
    const filterValue = table
      .getColumn("totalStock")
      ?.getFilterValue() as string[];
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
      .getColumn("totalStock")
      ?.setFilterValue(newFilterValue.length ? newFilterValue : undefined);
  };

  return (
    <div className="space-y-4">
      {/* Automated Flow Info */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex items-start gap-3">
          <PackageIcon size={20} className="text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-medium text-sm">Automated Inventory Flow</h3>
            <p className="text-sm text-muted-foreground">
              Inventory moves automatically with orders:{" "}
              <span className="font-bold bg-background px-1 rounded">
                order creation
              </span>{" "}
              moves Fulfillment → In Transit,{" "}
              <span className="font-bold bg-background px-1 rounded">
                delivered
              </span>{" "}
              removes from In Transit,{" "}
              <span className="font-bold bg-background px-1 rounded">
                cancelled
              </span>{" "}
              auto-returns to Fulfillment (unless held for manual confirmation). Revenue only counts on delivery.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Filter by name or email */}
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
              placeholder="Filter by name or code..."
              type="text"
              aria-label="Filter by name or code"
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
          {/* Filter by stock status */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                Stock
                {selectedStockStatuses.length > 0 && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {selectedStockStatuses.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-36 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  Stock Status
                </div>
                <div className="space-y-3">
                  {uniqueStockValues.map((value, i) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-stock-${i}`}
                        checked={selectedStockStatuses.includes(value)}
                        onCheckedChange={(checked: boolean) =>
                          handleStockStatusChange(checked, value)
                        }
                      />
                      <Label
                        htmlFor={`${id}-stock-${i}`}
                        className="flex grow justify-between gap-2 font-normal"
                      >
                        {value === "in-stock" ? "In Stock" : "Out of Stock"}{" "}
                        <span className="text-muted-foreground ms-2 text-xs">
                          {stockCounts.get(value)}
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
          <Button onClick={() => fetchInventory()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <StockMovementModal
        open={stockMovementModal.open}
        onOpenChange={(open) =>
          setStockMovementModal((prev) => ({ ...prev, open }))
        }
        productId={stockMovementModal.productId}
        productName={stockMovementModal.productName}
        locations={locations}
        onStockMovement={handleStockMovement}
      />

      <StockHistoryModal
        open={stockHistoryModal.open}
        onOpenChange={(open) =>
          setStockHistoryModal((prev) => ({ ...prev, open }))
        }
        productId={stockHistoryModal.productId}
        productName={stockHistoryModal.productName}
      />

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
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
              ))
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
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              -
              {Math.min(
                Math.max(
                  table.getState().pagination.pageIndex *
                    table.getState().pagination.pageSize +
                    table.getState().pagination.pageSize,
                  0
                ),
                table.getRowCount()
              )}
            </span>{" "}
            of{" "}
            <span className="text-foreground">
              {table.getRowCount().toString()}
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
  onUpdateStock,
  onViewHistory,
}: {
  row: Row<InventoryItem>;
  onUpdateStock: () => void;
  onViewHistory: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={onUpdateStock}
        className="h-8 px-2"
      >
        Update
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onViewHistory}
        className="h-8 px-2"
      >
        <HistoryIcon size={14} />
      </Button>
    </div>
  );
}
