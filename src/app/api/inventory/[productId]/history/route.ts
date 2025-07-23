import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params
  try {
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        productId,
      },
      include: {
        location: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get all unique location IDs from fromLocation and toLocation fields
    const locationIds = new Set<string>();
    stockMovements.forEach(movement => {
      if (movement.fromLocation) locationIds.add(movement.fromLocation);
      if (movement.toLocation) locationIds.add(movement.toLocation);
    });

    // Fetch location names for transfer movements
    const locations = await prisma.inventoryLocation.findMany({
      where: {
        id: { in: Array.from(locationIds) }
      },
      select: {
        id: true,
        name: true
      }
    });

    const locationMap = new Map(locations.map(loc => [loc.id, loc.name]));

    const formattedMovements = stockMovements.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: movement.quantity,
      location: movement.location?.name || null,
      fromLocation: movement.fromLocation ? locationMap.get(movement.fromLocation) || movement.fromLocation : null,
      toLocation: movement.toLocation ? locationMap.get(movement.toLocation) || movement.toLocation : null,
      notes: movement.notes,
      createdAt: movement.createdAt,
    }));

    return NextResponse.json(formattedMovements);
  } catch (error) {
    console.error("Error fetching stock history:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock history" },
      { status: 500 }
    );
  }
}