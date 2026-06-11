// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Visitor Session Listing API (Dashboard Sidebar)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';

export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const status = searchParams.get('status') || undefined;

    const query: Record<string, any> = { deletedAt: null };
    if (status) {
      query.pipelineStatus = status;
    }

    const total = await VisitorSession.countDocuments(query);
    const pages = Math.ceil(total / limit);

    const sessions = await VisitorSession.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return Response.json({
      success: true,
      data: {
        sessions,
        total,
        page,
        limit,
        pages,
      },
      requestId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching sessions';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
