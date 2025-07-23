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

    const product = await prisma.product.create({
      data: {
        name,
        code,
        price: parseFloat(price),
        description: description || null,
      }
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}