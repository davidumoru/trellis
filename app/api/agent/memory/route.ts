import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { runMemoryQuery, type MemoryEvent } from "@/lib/agent/memory";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { query } = (await request.json()) as { query?: string };
  if (!query || !query.trim()) {
    return new Response("Query required", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      function emit(event: MemoryEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        await runMemoryQuery({
          query: query.trim(),
          userId: session!.user.id,
          emit,
        });
      } catch (e) {
        emit({ type: "error", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
