"use server";

import { revalidatePath } from "next/cache";

import ROUTES from "@/constants/routes";

import action from "../handlers/action";
import handleError from "../handlers/error";
import {
  CreateVoteSchema,
  HasVotedSchema,
} from "../validations";
import { after } from "next/server";
import { createInteraction } from "./interaction.action";
import { prisma } from "../prisma";
import { VoteDirection } from "@/generated/prisma/client";

export async function createVote(
  params: CreateVoteParams
): Promise<ActionResponse> {
  const validationResult = await action({
    params,
    schema: CreateVoteSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { id, type, voteType } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  if (!userId) return handleError(new Error("Unauthorized")) as ErrorResponse;

  try {
    const isQuestion = type === "question";
    const voteDirection: VoteDirection =
      voteType === "upvote" ? "upvote" : "downvote";

    await prisma.$transaction(async (tx) => {
      // Get the content to find the author
      const content = isQuestion
        ? await tx.question.findUnique({
            where: { id },
            select: { authorId: true },
          })
        : await tx.answer.findUnique({
            where: { id },
            select: { authorId: true },
          });

      if (!content) throw new Error("Content not found");

      const contentAuthorId = content.authorId;

      if (isQuestion) {
        // Handle question vote
        const existingVote = await tx.questionVote.findUnique({
          where: {
            questionId_userId: {
              questionId: id,
              userId,
            },
          },
        });

        if (existingVote) {
          if (existingVote.voteDirection === voteDirection) {
            // Remove vote if clicking the same vote type
            await tx.questionVote.delete({
              where: {
                id: existingVote.id,
              },
            });

            // Decrement vote count
            const updateField =
              voteType === "upvote" ? "upvotes" : "downvotes";
            await tx.question.update({
              where: { id },
              data: { [updateField]: { decrement: 1 } },
            });
          } else {
            // Switch vote direction
            await tx.questionVote.update({
              where: { id: existingVote.id },
              data: { voteDirection },
            });

            // Update vote counts - decrement old, increment new
            const oldField =
              existingVote.voteDirection === "upvote" ? "upvotes" : "downvotes";
            const newField = voteType === "upvote" ? "upvotes" : "downvotes";

            await tx.question.update({
              where: { id },
              data: {
                [oldField]: { decrement: 1 },
                [newField]: { increment: 1 },
              },
            });
          }
        } else {
          // Create new vote
          await tx.questionVote.create({
            data: {
              userId,
              questionId: id,
              voteDirection,
            },
          });

          // Increment vote count
          const updateField = voteType === "upvote" ? "upvotes" : "downvotes";
          await tx.question.update({
            where: { id },
            data: { [updateField]: { increment: 1 } },
          });
        }
      } else {
        // Handle answer vote
        const existingVote = await tx.answerVote.findUnique({
          where: {
            answerId_userId: {
              answerId: id,
              userId,
            },
          },
        });

        if (existingVote) {
          if (existingVote.voteDirection === voteDirection) {
            // Remove vote if clicking the same vote type
            await tx.answerVote.delete({
              where: {
                id: existingVote.id,
              },
            });

            // Decrement vote count
            const updateField =
              voteType === "upvote" ? "upvotes" : "downvotes";
            await tx.answer.update({
              where: { id },
              data: { [updateField]: { decrement: 1 } },
            });
          } else {
            // Switch vote direction
            await tx.answerVote.update({
              where: { id: existingVote.id },
              data: { voteDirection },
            });

            // Update vote counts - decrement old, increment new
            const oldField =
              existingVote.voteDirection === "upvote" ? "upvotes" : "downvotes";
            const newField = voteType === "upvote" ? "upvotes" : "downvotes";

            await tx.answer.update({
              where: { id },
              data: {
                [oldField]: { decrement: 1 },
                [newField]: { increment: 1 },
              },
            });
          }
        } else {
          // Create new vote
          await tx.answerVote.create({
            data: {
              userId,
              answerId: id,
              voteDirection,
            },
          });

          // Increment vote count
          const updateField = voteType === "upvote" ? "upvotes" : "downvotes";
          await tx.answer.update({
            where: { id },
            data: { [updateField]: { increment: 1 } },
          });
        }
      }

      after(async () => {
        await createInteraction({
          action: voteType,
          actionId: id,
          actionTarget: type,
          authorId: contentAuthorId,
        });
      });
    });

    revalidatePath(ROUTES.QUESTION(id));

    return { success: true };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}

export async function hasVoted(
  params: HasVotedParams
): Promise<ActionResponse<HasVotedResponse>> {
  const validationResult = await action({
    params,
    schema: HasVotedSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const { id, type } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  try {
    const isQuestion = type === "question";

    const vote = isQuestion
      ? await prisma.questionVote.findUnique({
          where: {
            questionId_userId: {
              questionId: id,
              userId: userId!,
            },
          },
        })
      : await prisma.answerVote.findUnique({
          where: {
            answerId_userId: {
              answerId: id,
              userId: userId!,
            },
          },
        });

    if (!vote) {
      return {
        success: false,
        data: { hasUpvoted: false, hasDownvoted: false },
      };
    }

    return {
      success: true,
      data: {
        hasUpvoted: vote.voteDirection === "upvote",
        hasDownvoted: vote.voteDirection === "downvote",
      },
    };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
