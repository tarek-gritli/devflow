"use server";

import { after } from "next/server";
import action from "../handlers/action";
import handleError from "../handlers/error";
import { prisma } from "../prisma";
import {
  AskQuestionSchema,
  DeleteQuestionSchema,
  EditQuestionSchema,
  GetQuestionSchema,
  IncrementViewsSchema,
  PaginatedSearchParamsSchema,
} from "../validations";
import { createInteraction } from "./interaction.action";
import { NotFoundError, UnauthorizedError } from "../http-errors";
import { cache } from "react";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import ROUTES from "@/constants/routes";

export async function createQuestion(
  params: CreateQuestionParams
): Promise<ActionResponse<{ id: string }>> {
  const validationResult = await action({
    params,
    schema: AskQuestionSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }
  const { title, content, tags } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id!;

  try {
    const question = await prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          title,
          content,
          authorId: userId,
        },
      });

      if (!question) {
        throw new Error("Failed to create question");
      }

      for (const tagName of tags) {
        let tag = await tx.tag.findFirst({
          where: {
            name: {
              equals: tagName,
              mode: "insensitive",
            },
          },
        });

        if (!tag) {
          tag = await tx.tag.create({
            data: {
              name: tagName,
            },
          });
        }

        await tx.questionTag.create({
          data: {
            tagId: tag.id,
            questionId: question.id,
          },
        });
      }

      return question;
    });
    after(async () => {
      await createInteraction({
        action: "post",
        actionId: question.id.toString(),
        actionTarget: "question",
        authorId: userId,
      });
    });
    return {
      success: true,
      data: question,
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function editQuestion(
  params: EditQuestionParams
): Promise<ActionResponse<{ id: string }>> {
  const validationResult = await action({
    params,
    schema: EditQuestionSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { title, content, tags, questionId } = validationResult!.params;
  const userId = validationResult?.session?.user?.id;

  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
      include: {
        tags: {
          select: {
            tag: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundError("Question");
    }

    if (question.authorId !== userId) {
      throw new UnauthorizedError();
    }

    const updatedQuestion = await prisma.$transaction(async (tx) => {
      const updatedData: { title?: string; content?: string } = {};
      if (question.title !== title) {
        updatedData.title = title;
      }
      if (question.content !== content) {
        updatedData.content = content;
      }

      if (Object.keys(updatedData).length > 0) {
        await tx.question.update({
          where: {
            id: question.id,
          },
          data: updatedData,
        });
      }

      const tagsToAdd = tags.filter(
        (tag) =>
          !question.tags.some((t) =>
            t.tag.name.toLowerCase().includes(tag.toLowerCase())
          )
      );

      const tagsToRemove = question.tags.filter(
        (tag) =>
          !tags.some((t) => t.toLowerCase() === tag.tag.name.toLowerCase())
      );

      // Add new tags
      if (tagsToAdd.length > 0) {
        for (const tagName of tagsToAdd) {
          let tag = await tx.tag.findFirst({
            where: {
              name: {
                equals: tagName,
                mode: "insensitive",
              },
            },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                name: tagName,
              },
            });
          }

          await tx.questionTag.create({
            data: {
              tagId: tag.id,
              questionId: question.id,
            },
          });
        }
      }

      // Remove old tags
      if (tagsToRemove.length > 0) {
        const tagIdsToRemove = tagsToRemove.map((tag) => tag.tag.id);

        await tx.questionTag.deleteMany({
          where: {
            questionId: question.id,
            tagId: { in: tagIdsToRemove },
          },
        });
      }

      return question;
    });

    revalidatePath(ROUTES.QUESTION(questionId));

    return { success: true, data: { id: updatedQuestion.id } };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export const getQuestion = cache(
  async (params: GetQuestionParams): Promise<ActionResponse<Question>> => {
    const validationResult = await action({
      params,
      schema: GetQuestionSchema,
      authorize: true,
    });

    if (validationResult instanceof Error) {
      return handleError(validationResult) as ErrorResponse;
    }

    const { questionId } = validationResult!.params;
    try {
      const question = await prisma.question.findUnique({
        where: {
          id: questionId,
        },
        include: {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              answers: true,
            },
          },
        },
      });

      if (!question) {
        throw new NotFoundError("Question");
      }

      const formattedQuestion = {
        ...question,
        tags: question.tags.map((t) => t.tag),
        answers: question._count.answers,
      };

      return { success: true, data: formattedQuestion as Question };
    } catch (error) {
      return handleError(error) as ErrorResponse;
    }
  }
);

export async function getQuestions(
  params: PaginatedSearchParams
): Promise<ActionResponse<{ questions: Question[]; isNext: boolean }>> {
  const validationResult = await action({
    params,
    schema: PaginatedSearchParamsSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { page = 1, pageSize = 10, query, filter } = validationResult?.params!;
  const skip = (Number(page) - 1) * pageSize;
  const limit = Number(pageSize);

  let whereClause: Prisma.QuestionWhereInput = {};

  if (filter === "recommended") {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { success: true, data: { questions: [], isNext: false } };
    }

    const recommended = await getRecommendedQuestions({
      userId,
      query,
      skip,
      limit,
    });

    return { success: true, data: recommended };
  }

  if (query) {
    whereClause.OR = [
      {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      {
        content: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];
  }

  let orderBy: Prisma.QuestionOrderByWithRelationInput = {};

  switch (filter) {
    case "newest":
      orderBy = { createdAt: "desc" };
      break;
    case "unanswered":
      whereClause.answers = { none: {} };
      orderBy = { createdAt: "desc" };
      break;
    case "popular":
      orderBy = { upvotes: "desc" };
      break;
    default:
      orderBy = { createdAt: "desc" };
      break;
  }

  try {
    const questions = await prisma.question.findMany({
      where: whereClause,
      include: {
        tags: {
          select: {
            tag: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy,
      skip,
      take: limit + 1,
    });

    const isNext = questions.length > limit;
    const questionsToReturn = questions.slice(0, limit).map((q) => ({
      ...q,
      tags: q.tags.map((t) => t.tag),
      answers: q._count.answers,
    }));

    return {
      success: true,
      data: { questions: questionsToReturn as Question[], isNext },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function incrementViews(
  params: IncrementViewsParams
): Promise<ActionResponse<{ views: number }>> {
  const validationResult = await action({
    params,
    schema: IncrementViewsSchema,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { questionId } = validationResult?.params!;
  try {
    const question = await prisma.question.findUnique({
      where: {
        id: questionId,
      },
    });
    if (!question) {
      throw new NotFoundError("Question");
    }

    const updatedQuestion = await prisma.question.update({
      where: {
        id: questionId,
      },
      data: {
        views: { increment: 1 },
      },
    });

    return {
      success: true,
      data: {
        views: updatedQuestion.views,
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function getHotQuestions(): Promise<
  ActionResponse<{ id: string; title: string }[]>
> {
  try {
    const questions = await prisma.question.findMany({
      orderBy: [{ upvotes: "desc" }, { views: "desc" }],
      take: 10,
    });

    return {
      success: true,
      data: questions,
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function deleteQuestion(
  params: DeleteQuestionParams
): Promise<ActionResponse> {
  const validationResult = await action({
    params,
    schema: DeleteQuestionSchema,
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

    if (question.authorId !== userId) {
      throw new UnauthorizedError(
        "You are not authorized to delete this question"
      );
    }

    await prisma.question.delete({
      where: {
        id: questionId,
      },
    });

    after(
      async () =>
        await createInteraction({
          action: "delete",
          actionId: questionId,
          actionTarget: "question",
          authorId: userId,
        })
    );

    revalidatePath(`/profile/${userId}`);

    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

async function getRecommendedQuestions({
  userId,
  query,
  skip,
  limit,
}: RecommendationParams) {
  try {
    const uniqueTagIdsQuery = prisma.$queryRaw<Array<{ tag_id: string }>>`
      SELECT DISTINCT qt.tag_id
      FROM questions_tags qt
      INNER JOIN question_interactions qi ON qt.question_id = qi.question_id
      WHERE qi.author_id = ${userId}::uuid
        AND qi.action IN ('upvote', 'bookmark', 'view', 'post')
      ORDER BY qt.tag_id
      LIMIT 50
    `;

    const interactedIdsQuery = prisma.$queryRaw<Array<{ question_id: string }>>`
      SELECT DISTINCT question_id
      FROM question_interactions
      WHERE author_id = ${userId}::uuid
        AND action IN ('upvote', 'bookmark', 'view', 'post')
      LIMIT 100
    `;

    const [uniqueTagIdsResult, interactedIdsResult] = await Promise.all([
      uniqueTagIdsQuery,
      interactedIdsQuery,
    ]);

    const uniqueTagIds = uniqueTagIdsResult.map((row) => row.tag_id);
    const interactedQuestionIds = interactedIdsResult.map(
      (row) => row.question_id
    );

    if (uniqueTagIds.length === 0) {
      return { questions: [], isNext: false };
    }

    const recommendedQuery: Prisma.QuestionWhereInput = {
      id: { notIn: interactedQuestionIds },
      authorId: { not: userId },
      tags: {
        some: {
          tagId: { in: uniqueTagIds },
        },
      },
    };

    if (query) {
      recommendedQuery.OR = [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ];
    }

    const questions = await prisma.question.findMany({
      where: recommendedQuery,
      include: {
        tags: {
          select: {
            tag: {
              select: {
                name: true,
                id: true,
              },
            },
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            answers: true,
          },
        },
      },
      orderBy: [{ upvotes: "desc" }, { views: "desc" }],
      skip,
      take: limit + 1,
    });

    const isNext = questions.length > limit;

    return {
      questions: questions.slice(0, limit).map((q) => ({
        ...q,
        tags: q.tags.map((t) => t.tag),
        answers: q._count.answers,
      })) as Question[],
      isNext,
    };
  } catch (error) {
    throw error;
  }
}
