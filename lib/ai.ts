import { gateway } from "@ai-sdk/gateway";

export const agentModel = gateway("google/gemini-3-flash");

export const embeddingModel = gateway.embeddingModel(
  "google/text-embedding-005",
);
