import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      movementType,
      quantity,
      locationId,
      fromLocationId,
      toLocationId,
      notes,
      stockDate,
    } = body;

    const result = await prisma.$transaction(async (tx) => {
      if (movementType === "transfer") {
        const fromInventory = await tx.inventoryItem.findUnique({
          where: {
            productId_locationId: {
              productId,
              locationId: fromLocationId,
            },
          },
        });

        if (!fromInventory || fromInventory.quantity < quantity) {
          throw new Error("Insufficient stock for transfer");
        }

        await tx.inventoryItem.update({
          where: {
            productId_locationId: {
              productId,
              locationId: fromLocationId,
            },
          },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        });

        await tx.inventoryItem.upsert({
          where: {
            productId_locationId: {
              productId,
              locationId: toLocationId,
            },
          },
          update: {
            quantity: {
              increment: quantity,
            },
          },
          create: {
            productId,
            locationId: toLocationId,
            quantity,
          },
        });

        return await tx.stockMovement.create({
          data: {
            productId,
            movementType: "transfer",
            quantity,
            fromLocation: fromLocationId,
            toLocation: toLocationId,
            notes,
            stockDate: stockDate ? new Date(stockDate) : new Date(),
          },
        });
      } else {
        // Determine if this is an increment or decrement operation
        const isDeduction = movementType === "sale" || (movementType === "adjustment" && quantity < 0);
        const absQuantity = Math.abs(quantity);
        
        if (isDeduction) {
          // Check if there's enough stock for deduction
          const existingInventory = await tx.inventoryItem.findUnique({
            where: {
              productId_locationId: {
                productId,
                locationId,
              },
            },
          });

          if (!existingInventory || existingInventory.quantity < absQuantity) {
            throw new Error("Insufficient stock for this operation");
          }

          await tx.inventoryItem.update({
            where: {
              productId_locationId: {
                productId,
                locationId,
              },
            },
            data: {
              quantity: {
                decrement: absQuantity,
              },
            },
          });
        } else {
          // Increment operation (production, positive adjustments)
          await tx.inventoryItem.upsert({
            where: {
              productId_locationId: {
                productId,
                locationId,
              },
            },
            update: {
              quantity: {
                increment: absQuantity,
              },
            },
            create: {
              productId,
              locationId,
              quantity: absQuantity,
            },
          });
        }

        return await tx.stockMovement.create({
          data: {
            productId,
            locationId,
            movementType,
            quantity: isDeduction ? -absQuantity : absQuantity,
            notes,
            stockDate: stockDate ? new Date(stockDate) : new Date(),
          },
        });
      }
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating stock movement:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create stock movement" },
      { status: 500 }
    );
  }
}