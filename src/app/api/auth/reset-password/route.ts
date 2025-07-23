import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST() {
  try {
    // Generate a random temporary password
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let tempPassword = ''
    for (let i = 0; i < 12; i++) {
      tempPassword += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(tempPassword, 12)

    // Update admin password
    await prisma.admin.update({
      where: { id: 1 },
      data: { password: hashedPassword }
    })

    return NextResponse.json({
      message: 'Password reset successfully',
      newPassword: tempPassword
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}