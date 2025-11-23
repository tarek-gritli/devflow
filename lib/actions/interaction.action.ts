import { Interaction } from "@/generated/prisma/client";
import action from "../handlers/action";
import handleError from "../handlers/error";
import { CreateInteractionSchema } from "../validations";
import { prisma } from "../prisma";

export async function createInteraction(
  params: CreateInteractionParams
): Promise<ActionResponse<Interaction>> {
  const validationResult = await action({
    params,
    schema: CreateInteractionSchema,
    authorize: true,
  });

  if (validationResult instanceof Error) {
    return handleError(validationResult) as ErrorResponse;
  }

  const {
    action: actionType,
    actionId,
    actionTarget,
    authorId,
  } = validationResult?.params!;
  const userId = validationResult?.session?.user?.id;

  try {
    const interaction = await prisma.$transaction(async (tx) => {
      const interaction = await tx.interaction.create({
        data: {
          authorId: userId!,
          action: actionType,
          actionTarget,
          answerId: actionTarget === "answer" ? actionId : null,
          questionId: actionTarget === "question" ? actionId : null,
        },
      });

      let performerPoints = 0;
      let authorPoints = 0;

      switch (actionType) {
        case "upvote":
          performerPoints = 2;
          authorPoints = 10;
          break;
        case "downvote":
          performerPoints = -1;
          authorPoints = -2;
          break;
        case "post":
          authorPoints = actionTarget === "question" ? 5 : 10;
          break;
        case "delete":
          authorPoints = actionTarget === "question" ? -5 : -10;
          break;
      }

      if (userId === authorId) {
        await tx.user.update({
          where: { id: userId! },
          data: { reputation: { increment: authorPoints } },
        });
      } else {
        await tx.user.update({
          where: { id: userId! },
          data: { reputation: { increment: performerPoints } },
        });

        await tx.user.update({
          where: { id: authorId },
          data: { reputation: { increment: authorPoints } },
        });
      }

      return interaction;
    });

    return { success: true, data: interaction };
  } catch (error) {
    return handleError(error) as ErrorResponse;
  }
}
