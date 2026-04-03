import { NextResponse } from "next/server";
import slugify from "slugify";

import handleError from "@/lib/handlers/error";
import { ValidationError } from "@/lib/http-errors";
import { SignInWithOAuthSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { provider, providerAccountId, user } = await request.json();

  try {
    const validatedData = SignInWithOAuthSchema.safeParse({
      provider,
      providerAccountId,
      user,
    });
    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.flatten().fieldErrors);
    }

    const { name, username, email, image } = validatedData.data.user;
    const slugifiedUsername = slugify(username, {
      lower: true,
      strict: true,
      trim: true,
    });

    await prisma.$transaction(async (tx) => {
      let existingUser = await tx.user.findUnique({
        where: { email },
      });
      if (!existingUser) {
        existingUser = await tx.user.create({
          data: {
            name,
            username: slugifiedUsername,
            email,
            image,
          },
        });
      } else {
        const updatedData: { name?: string; image?: string } = {};

        if (existingUser.name !== name) updatedData.name = name;
        if (existingUser.image !== image) updatedData.image = image;

        if (Object.keys(updatedData).length > 0) {
          await tx.user.update({
            where: {
              id: existingUser.id,
            },
            data: updatedData,
          });
        }

        const existingAccount = await tx.account.findUnique({
          where: {
            id: existingUser.id,
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await tx.account.create({
            data: {
              userId: existingUser.id,
              name,
              image,
              provider,
              providerAccountId,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, "api") as APIErrorResponse;
  }
}
