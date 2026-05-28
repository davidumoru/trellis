import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { runIntake, type IntakeEvent } from "@/lib/agent/intake";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { url } = (await request.json()) as { url?: string };
  if (!url || !/^https?:\/\//.test(url)) {
    return new Response("Valid URL required", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function emit(event: IntakeEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      try {
        await runIntake({ url, userId: session!.user.id, emit });
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
