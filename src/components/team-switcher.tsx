"use client";

import * as React from "react";

import { DropdownMenu, DropdownMenuTrigger } from "@/components/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/sidebar";

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string;
  }[];
}) {
  const [activeTeam] = React.useState(teams[0] ?? null);

  if (!teams.length) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="text-sidebar-accent-foreground gap-3 [&>svg]:size-auto"
            >
              <div className="grid flex-1 text-left text-base leading-tight">
                <span className="truncate font-bold text-2xl ml-2">
                  {activeTeam?.name}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
