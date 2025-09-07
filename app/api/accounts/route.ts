import { NextResponse } from "next/server";

import { Account, User } from "@/database";
import handleError from "@/lib/handlers/error";
import { ForbiddenError, ValidationError } from "@/lib/http-errors";
import dbConnect from "@/lib/mongoose";
import { AccountSchema } from "@/lib/validations";

// GET /api/accounts
export async function GET() {
  try {
    await dbConnect();
    const users = await User.find();
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    return handleError(error, "api") as APIErrorResponse;
  }
}

// POST /api/accounts
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const validatedData = AccountSchema.safeParse(body);

    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.flatten().fieldErrors);
    }

    const existingAccount = await Account.findOne({
      provider: validatedData.data.provider,
      providerAccountId: validatedData.data.providerAccountId,
    });
    if (existingAccount) {
      throw new ForbiddenError("Account with the same provider already exists");
    }

    const newAccount = await Account.create(validatedData.data);
    return NextResponse.json(
      { success: true, data: newAccount },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error, "api") as APIErrorResponse;
  }
}
