"use server";

import { revalidatePath } from "next/cache";

import ROUTES from "@/constants/routes";

import action from "../handlers/action";
import handleError from "../handlers/error";
import {
  AnswerServerSchema,
  DeleteAnswerSchema,
  GetAnswersSchema,
} from "../validations";
import { after } from "next/server";
import { createInteraction } from "./interaction.action";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";

export async function createAnswer(
  params: CreateAnswerParams
): Promise<ActionResponse<{ id: string }>> {
  const validationResult = await action({
    params,
    schema: AnswerServerSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { content, questionId } = validationResult!.params;
  const userId = validationResult?.session?.user?.id;

  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
    });

    if (!question) throw new Error("Question not found");

    const newAnswer = await prisma.answer.create({
      data: {
        authorId: userId!,
        questionId,
        content,
      },
    });

    if (!newAnswer) throw new Error("Failed to create answer");

    after(async () => {
      await createInteraction({
        action: "post",
        actionId: newAnswer.id,
        actionTarget: "answer",
        authorId: userId as string,
      });
    });

    revalidatePath(ROUTES.QUESTION(questionId));

    return {
      success: true,
      data: newAnswer,
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function getAnswers(params: GetAnswersParams): Promise<
  ActionResponse<{
    answers: Answer[];
    isNext: boolean;
    totalAnswers: number;
  }>
> {
  const validationResult = await action({
    params,
    schema: GetAnswersSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { questionId, page = 1, pageSize = 10, filter } = params;

  const skip = (Number(page) - 1) * pageSize;
  const limit = pageSize;

  let orderBy: Prisma.AnswerOrderByWithRelationInput = {};

  switch (filter) {
    case "latest":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "popular":
      orderBy = { upvotes: "desc" };
      break;
    default:
      orderBy = { upvotes: "asc" };
      break;
  }

  try {
    const totalAnswers = await prisma.answer.count({
      where: {
        questionId,
      },
    });

    const answers = await prisma.answer.findMany({
      where: {
        questionId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    const isNext = totalAnswers > skip + answers.length;

    return {
      success: true,
      data: {
        answers: answers,
        isNext,
        totalAnswers,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function deleteAnswer(
  params: DeleteAnswerParams
): Promise<ActionResponse> {
  const validationResult = await action({
    params,
    schema: DeleteAnswerSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { answerId } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  try {
    const answer = await prisma.answer.findUnique({
      where: {
        id: answerId,
      },
    });
    if (!answer) throw new Error("Answer not found");

    if (answer.authorId !== userId)
      throw new Error("You're not allowed to delete this answer");

    await prisma.answerVote.deleteMany({
      where: {
        answerId,
      },
    });

    await prisma.answer.delete({
      where: {
        id: answerId,
      },
    });

    after(async () => {
      await createInteraction({
        action: "delete",
        actionId: answerId,
        actionTarget: "answer",
        authorId: userId as string,
      });
    });

    revalidatePath(`/profile/${userId}`);

    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
