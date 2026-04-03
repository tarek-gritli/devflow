import { NextResponse } from "next/server";

import handleError from "@/lib/handlers/error";
import { NotFoundError, ValidationError } from "@/lib/http-errors";
import { AccountSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

// POST /api/accounts/provider
export async function POST(request: Request) {
  const { providerAccountId } = await request.json();
  try {
    const validatedData = AccountSchema.partial().safeParse({
      providerAccountId,
    });
    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.flatten().fieldErrors);
    }
    const user = await prisma.account.findFirst({
      where: {
        providerAccountId: validatedData.data.providerAccountId,
      },
    });
    if (!user) {
      throw new NotFoundError("Account");
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (error) {
    return handleError(error, "api") as APIErrorResponse;
  }
}
