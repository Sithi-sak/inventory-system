import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  return POST(); // Reuse the same logic
}

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { id: 1 },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: "Admin already exists",
        exists: true,
      });
    }

    // Create default admin with password "admin123"
    const defaultPassword = "admin123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    await prisma.admin.create({
      data: {
        id: 1,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      message: "Admin created successfully",
      defaultPassword: defaultPassword,
      warning:
        "Please change the default password immediately after first login",
    });
  } catch (error) {
    console.error("Error seeding admin:", error);
    return NextResponse.json(
      { error: "Failed to seed admin" },
      { status: 500 }
    );
  }
}
