import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Auto-create default locations if they don't exist
    const defaultLocations = [
      { name: "Fulfillment", description: "Ready for delivery" },
      { name: "In Transit", description: "Currently being delivered" },
      { name: "Production", description: "Manufacturing/Production area" }
    ];

    for (const defaultLocation of defaultLocations) {
      await prisma.inventoryLocation.upsert({
        where: { name: defaultLocation.name },
        update: {}, // Don't update if exists
        create: {
          name: defaultLocation.name,
          description: defaultLocation.description,
          isActive: true
        }
      });
    }

    const products = await prisma.product.findMany({
      include: {
        inventoryItems: {
          include: {
            location: true,
          },
        },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    const inventoryData = products.map((product) => {
      const locationStock = locations.reduce((acc, location) => {
        const inventoryItem = product.inventoryItems.find(
          (item) => item.locationId === location.id
        );
        acc[location.name] = inventoryItem?.quantity || 0;
        return acc;
      }, {} as Record<string, number>);

      const totalStock = Object.values(locationStock).reduce(
        (sum, qty) => sum + qty,
        0
      );

      return {
        id: product.id,
        name: product.name,
        code: product.code,
        price: product.price,
        locationStock,
        totalStock,
        lastActivity: product.stockMovements[0]?.createdAt || null,
      };
    });

    return NextResponse.json({
      inventory: inventoryData,
      locations: locations.map((loc) => ({ id: loc.id, name: loc.name })),
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}