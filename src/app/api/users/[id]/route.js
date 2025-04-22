import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Adjust the path if needed

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const deletedUser = await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json(deletedUser, { status: 200 });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
