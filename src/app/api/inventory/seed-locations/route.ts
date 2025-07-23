import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Check if locations already exist
    const existingLocations = await prisma.inventoryLocation.findMany()
    
    if (existingLocations.length > 0) {
      return NextResponse.json({ 
        message: 'Locations already exist', 
        locations: existingLocations 
      })
    }

    // Create default inventory locations
    await prisma.inventoryLocation.createMany({
      data: [
        {
          name: 'Production',
          description: 'Factory/Production warehouse',
          isActive: true
        },
        {
          name: 'Fulfillment', 
          description: 'Delivery service warehouse',
          isActive: true
        },
        {
          name: 'In Transit',
          description: 'Items out for delivery',
          isActive: true
        }
      ]
    })

    const createdLocations = await prisma.inventoryLocation.findMany()

    return NextResponse.json({
      message: 'Inventory locations created successfully',
      locations: createdLocations
    })
  } catch (error) {
    console.error('Error seeding locations:', error)
    return NextResponse.json(
      { error: 'Failed to seed locations' },
      { status: 500 }
    )
  }
}