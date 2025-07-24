import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // Filter by status if provided
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where = status ? { status } : {}

    const [cancellations, total] = await Promise.all([
      prisma.orderCancellation.findMany({
        where,
        include: {
          items: true
        },
        orderBy: {
          cancelledAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.orderCancellation.count({ where })
    ])

    return NextResponse.json({
      cancellations: cancellations.map(cancellation => ({
        ...cancellation,
        items: cancellation.items.map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice) // Convert Decimal to number
        }))
      })),
      total,
      hasMore: offset + limit < total
    })
  } catch (error) {
    console.error('Error fetching cancellations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cancellations' },
      { status: 500 }
    )
  }
}