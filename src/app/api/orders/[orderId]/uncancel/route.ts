import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params
  try {
    // Remove cancellation record and restore inventory if needed
    const result = await prisma.$transaction(async (tx) => {
      // Get the cancellation record first
      const cancellation = await tx.orderCancellation.findUnique({
        where: { orderId },
        include: {
          items: true
        }
      })

      if (!cancellation) {
        return { message: 'No cancellation record found' }
      }

      // Handle inventory movement if needed
      if (cancellation.status === 'returned') {
        // TODO: Move inventory back from Production to In Transit
        // For now, we'll skip inventory movement and just remove the cancellation record
        // This can be implemented later if needed
        console.log(`Cancellation ${cancellation.id} was returned, inventory movement may be needed`)
      }
      // If status is 'cancelled', items are already in 'In Transit', so no inventory movement needed

      // Delete the cancellation items first (foreign key constraint)
      await tx.orderCancellationItem.deleteMany({
        where: { cancellationId: cancellation.id }
      })

      // Then delete the cancellation record
      await tx.orderCancellation.delete({
        where: { orderId }
      })

      return { message: 'Cancellation removed successfully' }
    })

    return NextResponse.json({
      success: true,
      ...result
    })
  } catch (error) {
    console.error('Error removing cancellation:', error)
    console.error('Error details:', error instanceof Error ? error.message : error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to remove cancellation', 
        details: error instanceof Error ? error.message : 'Unknown error',
        orderId: orderId
      },
      { status: 500 }
    )
  }
}

// TODO: Implement inventory movement helper function if needed