import * as React from "react";
import Link from "next/link";
import { RiArrowRightUpLine } from "@remixicon/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface StatsCardProps {
  title: string;
  value: string;
  change?: {
    value: string;
    trend: "up" | "down";
  };
  icon: React.ReactNode;
  href?: string;
}

export function StatsCard({
  title,
  value,
  change,
  icon,
  href,
}: StatsCardProps) {
  const isPositive = change?.trend === "up";
  const trendColor = isPositive ? "text-emerald-500" : "text-red-500";

  // Generate tooltip text based on title
  const getTooltipText = (title: string) => {
    const tooltipMap: Record<string, string> = {
      "Customers": "Go to customers page",
      "Products": "Go to products page", 
      "Revenue": "Go to reports page",
      "Ready to Ship": "Go to inventory page"
    };
    return tooltipMap[title] || `Go to ${title.toLowerCase()} page`;
  };

  const content = (
    <div className="relative flex items-center gap-4">
      <RiArrowRightUpLine
        className={cn(
          "absolute right-0 top-0 transition-opacity text-emerald-500",
          href
            ? "opacity-0 group-hover:opacity-100"
            : "opacity-0 group-has-[a:hover]:opacity-100"
        )}
        size={20}
        aria-hidden="true"
      />
      {/* Icon */}
      <div className="max-[480px]:hidden size-10 shrink-0 rounded-full bg-emerald-600/25 border border-emerald-600/50 flex items-center justify-center text-emerald-500">
        {icon}
      </div>
      {/* Content */}
      <div>
        <div className="font-medium tracking-widest text-xs uppercase text-muted-foreground/60">
          {title}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {change && (
          <div className="text-xs text-muted-foreground/60">
            <span className={cn("font-medium", trendColor)}>
              {isPositive ? "↗" : "↘"} {change.value}
            </span>{" "}
            vs last month
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} className="block">
            <div className="relative p-4 lg:p-5 group before:absolute before:inset-y-8 before:right-0 before:w-px before:bg-gradient-to-b before:from-input/30 before:via-input before:to-input/30 last:before:hidden hover:bg-muted/50 transition-colors cursor-pointer rounded-lg">
              {content}
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText(title)}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative p-4 lg:p-5 group before:absolute before:inset-y-8 before:right-0 before:w-px before:bg-gradient-to-b before:from-input/30 before:via-input before:to-input/30 last:before:hidden">
      {content}
    </div>
  );
}

interface StatsGridProps {
  stats: StatsCardProps[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 min-[1200px]:grid-cols-4 border border-border rounded-xl bg-gradient-to-br from-sidebar/60 to-sidebar">
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
