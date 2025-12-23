"use server";

import action from "../handlers/action";
import {
  GetUserAnswersSchema,
  GetUserQuestionsSchema,
  GetUserSchema,
  GetUsersTagsSchema,
  PaginatedSearchParamsSchema,
  UpdateUserSchema,
} from "../validations";
import handleError from "../handlers/error";
import { NotFoundError } from "../http-errors";
import { assignBadges } from "../utils";
import { cache } from "react";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";

export async function getUsers(
  params: PaginatedSearchParams
): Promise<ActionResponse<{ users: User[]; isNext: boolean }>> {
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { page = 1, pageSize = 10, query, filter } = params;

  const skip = (page - 1) * pageSize;
  const limit = pageSize;

  const whereClause: Prisma.UserWhereInput = {};

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  let orderBy: Prisma.UserOrderByWithRelationInput = {};

  switch (filter) {
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "popular":
      orderBy = { reputation: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  try {
    const [users, totalUsers] = await prisma.$transaction([
      prisma.user.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit + 1,
      }),
      prisma.user.count({
        where: whereClause,
      }),
    ]);

    const isNext = users.length > limit;
    const usersToReturn = users.slice(0, limit);

    return {
      success: true,
      data: { users: usersToReturn as User[], isNext },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export const getUser = cache(async function getUser(
  params: GetUserParams
): Promise<
  ActionResponse<{
    user: User;
    totalQuestions: number;
    totalAnswers: number;
  }>
> {
  const validationResult = await action({
    params,
    schema: GetUserSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { userId } = validationResult?.params!;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    const [totalQuestions, totalAnswers] = await prisma.$transaction([
      prisma.question.count({
        where: { authorId: userId },
      }),
      prisma.answer.count({
        where: { authorId: userId },
      }),
    ]);

    return {
      success: true,
      data: {
        user: user as User,
        totalQuestions,
        totalAnswers,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
});

export async function getUserQuestions(
  params: GetUserQuestionsParams
): Promise<ActionResponse<{ questions: Question[]; isNext: boolean }>> {
  const validationResult = await action({
    params,
    schema: GetUserQuestionsSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { userId, page = 1, pageSize = 10 } = validationResult?.params!;
  const skip = (page - 1) * pageSize;
  const limit = pageSize;

  try {
    const [questions, totalQuestions] = await prisma.$transaction([
      prisma.question.findMany({
        where: { authorId: userId },
        include: {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
            },
          },
          author: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        skip,
        take: limit + 1,
      }),
      prisma.question.count({
        where: { authorId: userId },
      }),
    ]);

    const isNext = questions.length > limit;
    const questionsToReturn = questions.slice(0, limit);

    return {
      success: true,
      data: { questions: questionsToReturn as Question[], isNext },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export const getUserAnswers = async (
  params: GetUserAnswersParams
): Promise<ActionResponse<{ answers: Answer[]; isNext: boolean }>> => {
  const validationResult = await action({
    params,
    schema: GetUserAnswersSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { userId, page = 1, pageSize = 10 } = validationResult?.params!;
  const skip = (page - 1) * pageSize;
  const limit = pageSize;

  try {
    const [answers, totalAnswers] = await prisma.$transaction([
      prisma.answer.findMany({
        where: { authorId: userId },
        include: {
          author: {
            select: {
              name: true,
              image: true,
            },
          },
        },
        skip,
        take: limit + 1,
      }),
      prisma.answer.count({
        where: { authorId: userId },
      }),
    ]);

    const isNext = answers.length > limit;
    const answersToReturn = answers.slice(0, limit);

    return {
      success: true,
      data: { answers: answersToReturn as Answer[], isNext },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export const getUserTopTags = async (
  params: GetUserTagsParams
): Promise<
  ActionResponse<{
    tags: { _id: string; name: string; count: number }[];
  }>
> => {
  const validationResult = await action({
    params,
    schema: GetUsersTagsSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { userId } = validationResult?.params!;

  try {
    // Get all questions by the user with their tags
    const questions = await prisma.question.findMany({
      where: { authorId: userId },
      select: {
        tags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Count tag occurrences
    const tagCounts = new Map<string, { id: string; name: string; count: number }>();

    questions.forEach((question) => {
      question.tags.forEach((qt) => {
        const existing = tagCounts.get(qt.tag.id);
        if (existing) {
          existing.count++;
        } else {
          tagCounts.set(qt.tag.id, {
            id: qt.tag.id,
            name: qt.tag.name,
            count: 1,
          });
        }
      });
    });

    // Convert to array and sort by count
    const tags = Array.from(tagCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((tag) => ({
        _id: tag.id,
        name: tag.name,
        count: tag.count,
      }));

    return {
      success: true,
      data: {
        tags,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export async function getUserStats(params: GetUserParams): Promise<
  ActionResponse<{
    totalQuestions: number;
    totalAnswers: number;
    badges: Badges;
  }>
> {
  const validationResult = await action({
    params,
    schema: GetUserSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { userId } = params;

  try {
    const [questionStats, answerStats] = await prisma.$transaction([
      prisma.question.aggregate({
        where: { authorId: userId },
        _count: true,
        _sum: {
          upvotes: true,
          views: true,
        },
      }),
      prisma.answer.aggregate({
        where: { authorId: userId },
        _count: true,
        _sum: {
          upvotes: true,
        },
      }),
    ]);

    const badges = assignBadges({
      criteria: [
        { type: "ANSWER_COUNT", count: answerStats._count || 0 },
        { type: "QUESTION_COUNT", count: questionStats._count || 0 },
        {
          type: "QUESTION_UPVOTES",
          count: (questionStats._sum.upvotes || 0) + (answerStats._sum.upvotes || 0),
        },
        { type: "TOTAL_VIEWS", count: questionStats._sum.views || 0 },
      ],
    });

    return {
      success: true,
      data: {
        totalQuestions: questionStats._count,
        totalAnswers: answerStats._count,
        badges,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function updateUserProfile(
  params: UpdateUserParams
): Promise<ActionResponse<{ user: User }>> {
  const validationResult = await action({
    params,
    schema: UpdateUserSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { user } = validationResult?.session!;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user?.id },
      data: params,
    });

    return {
      success: true,
      data: { user: updatedUser as User },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
