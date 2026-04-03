"use server";

import action from "../handlers/action";
import handleError from "../handlers/error";
import {
  GetTagQuestionsSchema,
  PaginatedSearchParamsSchema,
} from "../validations";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";

export const getTags = async (
  params: PaginatedSearchParams
): Promise<ActionResponse<{ tags: Tag[]; isNext: boolean }>> => {
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { page = 1, pageSize = 10, query, filter } = params;

  const skip = (Number(page) - 1) * pageSize;
  const limit = Number(pageSize);

  const whereClause: Prisma.TagWhereInput = {};

  if (query) {
    whereClause.name = {
      contains: query,
      mode: "insensitive",
    };
  }

  let orderBy: Prisma.TagOrderByWithRelationInput = {};

  switch (filter) {
    case "popular":
      orderBy = { questionTags: { _count: "desc" } };
      break;
    case "recent":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "name":
      orderBy = { name: "asc" };
      break;
    default:
      orderBy = { questionTags: { _count: "desc" } };
      break;
  }

  try {
    const [tags, totalTags] = await prisma.$transaction([
      prisma.tag.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit + 1,
        include: {
          _count: {
            select: {
              questionTags: true,
            },
          },
        },
      }),
      prisma.tag.count({
        where: whereClause,
      }),
    ]);

    const isNext = tags.length > limit;
    const tagsToReturn = tags.slice(0, limit);

    // Format tags to include question count
    const formattedTags = tagsToReturn.map((tag) => ({
      id: tag.id,
      name: tag.name,
      questions: tag._count.questionTags,
      createdAt: tag.createdAt,
    }));

    return {
      success: true,
      data: {
        tags: formattedTags as Tag[],
        isNext,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export const getTagQuestions = async (
  params: GetTagQuestionsParams
): Promise<
  ActionResponse<{ tag: Tag; questions: Question[]; isNext: boolean }>
> => {
  const validationResult = await action({
    params,
    schema: GetTagQuestionsSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { tagId, page = 1, pageSize = 10, query } = params;

  const skip = (Number(page) - 1) * pageSize;
  const limit = Number(pageSize);

  try {
    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    if (!tag) throw new Error("Tag not found");

    const whereClause: Prisma.QuestionWhereInput = {
      tags: {
        some: {
          tagId,
        },
      },
    };

    if (query) {
      whereClause.title = {
        contains: query,
        mode: "insensitive",
      };
    }

    const [questions, totalQuestions] = await prisma.$transaction([
      prisma.question.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          content: true,
          views: true,
          upvotes: true,
          downvotes: true,
          createdAt: true,
          authorId: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
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
          _count: {
            select: {
              answers: true,
            },
          },
        },
        skip,
        take: limit + 1,
      }),
      prisma.question.count({
        where: whereClause,
      }),
    ]);

    const isNext = questions.length > limit;
    const questionsToReturn = questions.slice(0, limit);

    const formattedQuestions = questionsToReturn.map((q) => ({
      id: q.id,
      title: q.title,
      content: q.content,
      views: q.views,
      upvotes: q.upvotes,
      downvotes: q.downvotes,
      createdAt: q.createdAt,
      authorId: q.authorId,
      author: q.author,
      tags: q.tags.map((t) => t.tag),
      answers: q._count.answers,
    }));

    return {
      success: true,
      data: {
        tag: {
          id: tag.id,
          name: tag.name,
          questions: tag._count.questionTags,
        } as Tag,
        questions: formattedQuestions as Question[],
        isNext,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export const getTopTags = async (): Promise<ActionResponse<Tag[]>> => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: {
        questionTags: {
          _count: "desc",
        },
      },
      take: 5,
      include: {
        _count: {
          select: {
            questionTags: true,
          },
        },
      },
    });

    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      questions: tag._count.questionTags,
    }));

    return {
      success: true,
      data: formattedTags as Tag[],
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};
