// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — First-Party Browser Signals Ingestion API
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import RawSignal from '@/lib/db/models/RawSignal';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const {
      sessionId,
      userAgent,
      language,
      timezone,
      screenWidth,
      screenHeight,
      referrer,
      landingUrl,
      utmSource,
      utmMedium,
      utmCampaign,
      geoPermissionGranted,
      latitude,
      longitude,
    } = body;

    if (!sessionId) {
      return Response.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'sessionId is required' }, requestId: 'unknown' },
        { status: 400 }
      );
    }

    const session = await VisitorSession.findOne({ sessionId });
    if (!session) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' }, requestId: sessionId },
        { status: 404 }
      );
    }

    // Update session signal fields
    if (userAgent) session.userAgent = userAgent;
    if (language) session.language = language;
    if (timezone) session.timezone = timezone;
    if (screenWidth !== undefined) session.screenWidth = screenWidth;
    if (screenHeight !== undefined) session.screenHeight = screenHeight;
    if (referrer) session.referrer = referrer;
    if (landingUrl) session.landingUrl = landingUrl;
    if (utmSource) session.utmSource = utmSource;
    if (utmMedium) session.utmMedium = utmMedium;
    if (utmCampaign) session.utmCampaign = utmCampaign;
    if (geoPermissionGranted !== undefined) session.geoPermissionGranted = geoPermissionGranted;
    if (latitude !== undefined) session.latitude = latitude;
    if (longitude !== undefined) session.longitude = longitude;

    // Create raw signals
    const collectedAt = new Date();
    if (screenWidth || screenHeight || timezone || language) {
      await RawSignal.create({
        sessionId,
        signalType: 'browser',
        rawPayload: { userAgent, language, timezone, screenWidth, screenHeight, referrer, landingUrl },
        collectedAt,
      });
    }

    if (utmSource || utmMedium || utmCampaign) {
      await RawSignal.create({
        sessionId,
        signalType: 'utm',
        rawPayload: { utmSource, utmMedium, utmCampaign },
        collectedAt,
      });
    }

    if (latitude !== undefined || longitude !== undefined || geoPermissionGranted !== undefined) {
      await RawSignal.create({
        sessionId,
        signalType: 'geolocation',
        rawPayload: { geoPermissionGranted, latitude, longitude },
        collectedAt,
      });
    }

    session.pipelineStatus = 'signals_collected';
    await session.save();

    return Response.json({
      success: true,
      data: { sessionId },
      requestId: sessionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error collecting signals';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId: 'unknown' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
