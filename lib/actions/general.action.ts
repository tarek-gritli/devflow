"use server";

import action from "../handlers/action";
import handleError from "../handlers/error";
import { GlobalSearchSchema } from "../validations";
import { prisma } from "../prisma";

export async function globalSearch(params: GlobalSearchParams) {
  try {
    const validationResult = await action({
      params,
      schema: GlobalSearchSchema,
    });

    if (validationResult instanceof Error) {
      return handleError(validationResult) as ErrorResponse;
    }

    const { query, type } = params;

    let results: GlobalSearchedItem[] = [];

    const typeLower = type?.toLowerCase();

    const SearchableTypes = ["question", "answer", "user", "tag"];
    if (!typeLower || !SearchableTypes.includes(typeLower)) {
      // If no type is specified, search in all models
      const [questions, users, answers, tags] = await Promise.all([
        prisma.question.findMany({
          where: {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            title: true,
          },
          take: 2,
        }),
        prisma.user.findMany({
          where: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
          },
          take: 2,
        }),
        prisma.answer.findMany({
          where: {
            content: {
              contains: query,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            questionId: true,
          },
          take: 2,
        }),
        prisma.tag.findMany({
          where: {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
          select: {
            id: true,
            name: true,
          },
          take: 2,
        }),
      ]);

      results.push(
        ...questions.map((item) => ({
          title: item.title,
          type: "question" as const,
          id: item.id,
        })),
        ...users.map((item) => ({
          title: item.name,
          type: "user" as const,
          id: item.id,
        })),
        ...answers.map((item) => ({
          title: `Answers containing ${query}`,
          type: "answer" as const,
          id: item.questionId,
        })),
        ...tags.map((item) => ({
          title: item.name,
          type: "tag" as const,
          id: item.id,
        }))
      );
    } else {
      // Search in the specified model type
      switch (typeLower) {
        case "question":
          const questions = await prisma.question.findMany({
            where: {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              title: true,
            },
            take: 8,
          });

          results = questions.map((item) => ({
            title: item.title,
            type: "question" as const,
            id: item.id,
          }));
          break;

        case "user":
          const users = await prisma.user.findMany({
            where: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              name: true,
            },
            take: 8,
          });

          results = users.map((item) => ({
            title: item.name,
            type: "user" as const,
            id: item.id,
          }));
          break;

        case "answer":
          const answers = await prisma.answer.findMany({
            where: {
              content: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              questionId: true,
            },
            take: 8,
          });

          results = answers.map((item) => ({
            title: `Answers containing ${query}`,
            type: "answer" as const,
            id: item.questionId,
          }));
          break;

        case "tag":
          const tags = await prisma.tag.findMany({
            where: {
              name: {
                contains: query,
                mode: "insensitive",
              },
            },
            select: {
              id: true,
              name: true,
            },
            take: 8,
          });

          results = tags.map((item) => ({
            title: item.name,
            type: "tag" as const,
            id: item.id,
          }));
          break;

        default:
          throw new Error("Invalid search type");
      }
    }

    return {
      success: true,
      data: results,
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
