"use server";

import action from "../handlers/action";
import handleError from "../handlers/error";
import {
  CollectionBaseSchema,
  PaginatedSearchParamsSchema,
} from "../validations";
import { NotFoundError } from "../http-errors";
import { revalidatePath } from "next/cache";
import ROUTES from "@/constants/routes";
import { prisma } from "../prisma";
import { Prisma } from "@/generated/prisma/client";

export const toggleSaveQuestion = async (
  params: CollectionBaseParams
): Promise<ActionResponse<{ saved: boolean }>> => {
  const validationResult = await action({
    params,
    schema: CollectionBaseSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { questionId } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
    });
    if (!question) {
      throw new NotFoundError("Question");
    }

    const collection = await prisma.collection.findFirst({
      where: {
        questionId,
        authorId: userId,
      },
    });

    if (collection) {
      await prisma.collection.delete({
        where: {
          id: collection.id,
        },
      });

      revalidatePath(ROUTES.QUESTION(questionId));

      return {
        success: true,
        data: {
          saved: false,
        },
      };
    }

    await prisma.collection.create({
      data: {
        questionId,
        authorId: userId!,
      },
    });

    revalidatePath(ROUTES.QUESTION(questionId));

    return {
      success: true,
      data: {
        saved: true,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export const hasSavedQuestion = async (
  params: CollectionBaseParams
): Promise<ActionResponse<{ saved: boolean }>> => {
  const validationResult = await action({
    params,
    schema: CollectionBaseSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { questionId } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  try {
    const collection = await prisma.collection.findFirst({
      where: {
        questionId,
        authorId: userId,
      },
    });

    return {
      success: true,
      data: {
        saved: !!collection,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};

export const getSavedQuestions = async (
  params: PaginatedSearchParams
): Promise<ActionResponse<{ collection: Collection[]; isNext: boolean }>> => {
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const userId = validationResult?.session?.user?.id;
  const { page = 1, pageSize = 10, query, filter } = params;
  const skip = (page - 1) * pageSize;
  const limit = pageSize;

  const whereClause: Prisma.CollectionWhereInput = {
    authorId: userId,
  };

  if (query) {
    whereClause.question = {
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    };
  }

  let orderBy: Prisma.CollectionOrderByWithRelationInput = {};

  switch (filter) {
    case "mostrecent":
      orderBy = { createdAt: "desc" };
      break;
    case "oldest":
      orderBy = { createdAt: "asc" };
      break;
    case "mostvoted":
      orderBy = { question: { upvotes: "desc" } };
      break;
    case "mostanswered":
      orderBy = { question: { answers: { _count: "desc" } } };
      break;
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  try {
    const [collections, totalCount] = await prisma.$transaction([
      prisma.collection.findMany({
        where: whereClause,
        include: {
          author: true,
          question: {
            include: {
              author: true,
              tags: {
                include: {
                  tag: true,
                },
              },
              _count: {
                select: { answers: true },
              },
            },
          },
        },
        orderBy,
        skip,
        take: pageSize,
      }),
      prisma.collection.count({
        where: whereClause,
      }),
    ]);

    const formattedCollections = collections.map((col) => ({
      id: col.id,
      authorId: col.authorId,
      author: col.author,
      questionId: col.questionId,
      question: {
        id: col.question.id,
        title: col.question.title,
        content: col.question.content,
        authorId: col.question.authorId,
        tags: col.question.tags.map((qt) => ({
          id: qt.tag.id,
          name: qt.tag.name,
        })),
        author: {
          id: col.question.author.id,
          name: col.question.author.name,
          image: col.question.author.image,
        },
        createdAt: col.question.createdAt,
        upvotes: col.question.upvotes,
        downvotes: col.question.downvotes,
        answers: col.question._count.answers,
        views: col.question.views,
      },
    }));

    const isNext = totalCount > skip + collections.length;

    return {
      success: true,
      data: { collection: formattedCollections, isNext },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
};
