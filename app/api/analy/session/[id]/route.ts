// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — Full Visitor Session Details API (Dashboard Detail Panel)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import VisitorSession from '@/lib/db/models/VisitorSession';
import Consent from '@/lib/db/models/Consent';
import IpEnrichment from '@/lib/db/models/IpEnrichment';
import CompanyProfile from '@/lib/db/models/CompanyProfile';
import IdentityCandidate from '@/lib/db/models/IdentityCandidate';
import PatternSource from '@/lib/db/models/PatternSource';
import EmailCandidate from '@/lib/db/models/EmailCandidate';
import VerifiedEmail from '@/lib/db/models/VerifiedEmail';
import PipelineJob from '@/lib/db/models/PipelineJob';
import AuditLog from '@/lib/db/models/AuditLog';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();

    const session = await VisitorSession.findOne({ sessionId: id }).lean();
    if (!session) {
      return Response.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Session not found' }, requestId: id },
        { status: 404 }
      );
    }

    const [
      consent,
      ipEnrichment,
      companyProfile,
      identityCandidates,
      patternSources,
      emailCandidates,
      verifiedEmails,
      pipelineJobs,
      auditLogs,
    ] = await Promise.all([
      Consent.findOne({ sessionId: id }).sort({ createdAt: -1 }).lean(),
      IpEnrichment.findOne({ sessionId: id }).sort({ createdAt: -1 }).lean(),
      CompanyProfile.findOne({ sessionId: id }).sort({ createdAt: -1 }).lean(),
      IdentityCandidate.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
      PatternSource.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
      EmailCandidate.find({ sessionId: id }).sort({ rank: 1 }).lean(),
      VerifiedEmail.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
      PipelineJob.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
      AuditLog.find({ sessionId: id }).sort({ createdAt: 1 }).lean(),
    ]);

    return Response.json({
      success: true,
      data: {
        session,
        consent,
        ipEnrichment,
        companyProfile,
        identityCandidates,
        patternSources,
        emailCandidates,
        verifiedEmails,
        pipelineJobs,
        auditLogs,
      },
      requestId: id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error fetching session details';
    return Response.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message }, requestId: id },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
