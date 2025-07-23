import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit
    
    // Search parameters
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('status') ? searchParams.get('status')!.split(',') : []
    const hideDelivered = searchParams.get('hideDelivered') === 'true'
    
    // Build where clause for filtering
    const whereClause: any = {}
    
    // Search by name or phone
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    // Simple status filtering for now - we'll do complex latest order filtering in frontend
    if (statusFilter.length > 0) {
      if (statusFilter.includes('no-orders')) {
        if (statusFilter.length === 1) {
          whereClause.orders = { none: {} }
        }
      } else {
        whereClause.orders = {
          some: {
            status: { in: statusFilter }
          }
        }
      }
    }
    
    // Hide customers with delivered orders
    if (hideDelivered) {
      whereClause.NOT = {
        orders: {
          some: { status: 'delivered' }
        }
      }
    }
    
    // Get total count for pagination
    const totalCount = await prisma.customer.count({
      where: whereClause
    })
    
    // Fetch customers with pagination
    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          },
          orderBy: {
            orderDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    })
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1
    
    return NextResponse.json({
      data: customers,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit
      }
    })
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, location, preferredDeliveryTime, notes, orderItems } = body

    if (!name || !phone || !location) {
      return NextResponse.json({ error: 'Name, phone, and location are required' }, { status: 400 })
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        location,
        preferredDeliveryTime: preferredDeliveryTime || null,
        notes: notes || null
      }
    })

    if (orderItems && orderItems.length > 0) {
      const totalAmount = orderItems.reduce((sum: number, item: any) => {
        return sum + (parseFloat(item.unitPrice) * parseInt(item.quantity))
      }, 0)

      const result = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            totalAmount: totalAmount,
            status: 'pending',
            orderItems: {
              create: orderItems.map((item: any) => ({
                productId: item.productId,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice)
              }))
            }
          },
          include: {
            orderItems: {
              include: {
                product: true
              }
            }
          }
        })

        // Trigger automatic inventory movement for pending order
        // Get locations
        const locations = await tx.inventoryLocation.findMany({
          where: { isActive: true }
        })

        const locationMap = locations.reduce((acc, loc) => {
          acc[loc.name] = loc.id
          return acc
        }, {} as Record<string, string>)

        const fulfillmentLocationId = locationMap["Fulfillment"]
        const inTransitLocationId = locationMap["In Transit"]

        // Move stock from Fulfillment to In Transit for each order item
        for (const orderItem of order.orderItems) {
          const quantity = orderItem.quantity

          // Check if Fulfillment has enough stock
          const fulfillmentInventory = await tx.inventoryItem.findUnique({
            where: {
              productId_locationId: {
                productId: orderItem.productId,
                locationId: fulfillmentLocationId
              }
            }
          })

          if (!fulfillmentInventory || fulfillmentInventory.quantity < quantity) {
            throw new Error(`Insufficient stock in Fulfillment for ${orderItem.product.name}. Available: ${fulfillmentInventory?.quantity || 0}, Required: ${quantity}`)
          }

          // Move stock from Fulfillment to In Transit
          await tx.inventoryItem.update({
            where: {
              productId_locationId: {
                productId: orderItem.productId,
                locationId: fulfillmentLocationId
              }
            },
            data: {
              quantity: {
                decrement: quantity
              }
            }
          })

          // Add to In Transit (create if doesn't exist)
          await tx.inventoryItem.upsert({
            where: {
              productId_locationId: {
                productId: orderItem.productId,
                locationId: inTransitLocationId
              }
            },
            update: {
              quantity: {
                increment: quantity
              }
            },
            create: {
              productId: orderItem.productId,
              locationId: inTransitLocationId,
              quantity: quantity
            }
          })

          // Record the transfer movement
          await tx.stockMovement.create({
            data: {
              productId: orderItem.productId,
              movementType: "transfer",
              quantity: quantity,
              fromLocation: fulfillmentLocationId,
              toLocation: inTransitLocationId,
              notes: `Order ${order.id} created - auto moved to transit`,
              orderId: order.id
            }
          })
        }

        return { customer, order }
      })

      return NextResponse.json(result, { status: 201 })
    }

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}