import { generateText, embed } from "ai";
import { NextResponse } from "next/server";
import { agentModel, embeddingModel } from "@/lib/ai";

export async function GET() {
  try {
    const [textResult, embedResult] = await Promise.all([
      generateText({
        model: agentModel,
        prompt: "Respond with only the word: connected",
      }),
      embed({
        model: embeddingModel,
        value: "test embedding",
      }),
    ]);

    return NextResponse.json({
      status: "connected",
      text: textResult.text,
      embeddingDimensions: embedResult.embedding.length,
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 },
    );
  }
}
