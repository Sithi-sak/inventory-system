import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventoryItems: {
          include: {
            location: true,
          },
        },
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Get active locations
    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // Calculate stock for each product
    const productsWithStock = products.map((product) => {
      const locationStock = locations.reduce((acc, location) => {
        const inventoryItem = product.inventoryItems.find(
          (item) => item.locationId === location.id
        );
        acc[location.name] = inventoryItem?.quantity || 0;
        return acc;
      }, {} as Record<string, number>);

      // Calculate available stock (Production + Fulfillment, excluding In Transit)
      const availableStock = (locationStock["Production"] || 0) + (locationStock["Fulfillment"] || 0);

      return {
        id: product.id,
        name: product.name,
        code: product.code,
        price: product.price,
        description: product.description,
        stock: availableStock, // Available to sell
        locationStock, // Detailed breakdown
      };
    });

    return NextResponse.json(productsWithStock)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, price, description } = body

    if (!name || !code || price === undefined) {
      return NextResponse.json({ error: 'Name, code, and price are required' }, { status: 400 })
    }

    // Auto-create default locations if they don't exist
    const defaultLocations = [
      { name: "Fulfillment", description: "Ready for delivery" },
      { name: "In Transit", description: "Currently being delivered" },
      { name: "Production", description: "Manufacturing/Production area" }
    ];

    for (const defaultLocation of defaultLocations) {
      await prisma.inventoryLocation.upsert({
        where: { name: defaultLocation.name },
        update: {},
        create: {
          name: defaultLocation.name,
          description: defaultLocation.description,
          isActive: true
        }
      });
    }

    // Get all active locations
    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true }
    });

    const product = await prisma.product.create({
      data: {
        name,
        code,
        price: parseFloat(price),
        description: description || null,
      }
    })

    // Create inventory items for all locations with 0 quantity
    await Promise.all(
      locations.map(location =>
        prisma.inventoryItem.create({
          data: {
            productId: product.id,
            locationId: location.id,
            quantity: 0
          }
        })
      )
    );

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}