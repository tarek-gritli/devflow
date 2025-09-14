import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";

import handleError from "@/lib/handlers/error";
import { ValidationError } from "@/lib/http-errors";
import { AIAnswerSchema } from "@/lib/validations";

export const runtime = "edge";

export async function POST(request: Request) {
  const { question, content, userAnswer } = await request.json();

  try {
    const validatedData = AIAnswerSchema.safeParse({
      question,
      content,
      userAnswer,
    });
    if (!validatedData.success) {
      throw new ValidationError(validatedData.error.flatten().fieldErrors);
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Generate a markdown formatted answer for the following question: ${question} based on the provided content ${content}\n\n Also, prioritize and incorporate the user's answer when formulating your response:  
      **User's Answer:** ${userAnswer}
      Prioritize the user's answer only if it is correct and relevant to the question. If the user's answer is incorrect correct it in your response.
      Make sure the answer is comprehensive and well-structured.`,
      system:
        "You are a helpful assistant that provides informative responses in markdown format. Don't greet the user, just provide the answer. When including code blocks, always specify a language identifier after the opening backticks (e.g., \`\`\`javascript, \`\`\`python, \`\`\`bash, etc.). If the language is unknown or for plain text, use \`\`\`txt. Never use empty code block declarations like \`\`\` without a language identifier.",
    });

    return NextResponse.json({ success: true, data: text }, { status: 200 });
  } catch (error) {
    return handleError(error, "api") as APIErrorResponse;
  }
}
