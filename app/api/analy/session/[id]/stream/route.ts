// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Real-Time Session Pipeline SSE Stream API
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { createSSEStream, publishHeartbeat } from '@/lib/pipeline/sse';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const stream = createSSEStream(id);

  // Periodic heartbeat interval to prevent load balancer / CDN time-outs.
  // The stream subscriber will capture the published heartbeat from Redis and emit to the client.
  const intervalId = setInterval(async () => {
    try {
      await publishHeartbeat(id);
    } catch {
      // Suppress heartbeat errors (e.g. if Redis connection is temporarily failing)
    }
  }, 15000);

  // Intercept the stream close / cancel to clean up the heartbeat interval
  const originalCancel = stream.cancel ? stream.cancel.bind(stream) : () => {};
  stream.cancel = async (reason) => {
    clearInterval(intervalId);
    await originalCancel(reason);
  };

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering on Nginx/Vercel
    },
  });
}

export const dynamic = 'force-dynamic';
