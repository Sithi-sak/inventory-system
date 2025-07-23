import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    const location = await prisma.inventoryLocation.create({
      data: {
        name,
        description,
      },
    });

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error creating location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const defaultLocations = [
      { name: "My Warehouse", description: "Main warehouse storage" },
      { name: "Delivery Service", description: "Delivery service location" },
    ];

    const existingLocations = await prisma.inventoryLocation.findMany();
    
    if (existingLocations.length === 0) {
      await prisma.inventoryLocation.createMany({
        data: defaultLocations,
      });
    }

    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ 
      message: "Default locations initialized",
      locations 
    });
  } catch (error) {
    console.error("Error initializing locations:", error);
    return NextResponse.json(
      { error: "Failed to initialize locations" },
      { status: 500 }
    );
  }
}