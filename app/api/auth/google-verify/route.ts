import { NextRequest } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '@/lib/db/connect';
import GoogleAccount from '@/lib/db/models/GoogleAccount';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export async function POST(req: NextRequest) {
  try {
    const { credential, sessionId } = await req.json().catch(() => ({}));

    if (!credential) {
      return Response.json(
        { success: false, error: { message: 'Credential token is required' } },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return Response.json(
        { success: false, error: { message: 'Google Client ID is not configured on the server' } },
        { status: 500 }
      );
    }

    // Verify token with Google's public keys
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return Response.json(
        { success: false, error: { message: 'Invalid token payload' } },
        { status: 400 }
      );
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || 'Google User';
    const picture = payload.picture || undefined;
    const googleId = payload.sub;

    // Connect to database and store in google_accounts collection
    await connectDB();
    const account = await GoogleAccount.findOneAndUpdate(
      { email },
      {
        googleId,
        email,
        name,
        picture,
        sessionId: sessionId || undefined,
      },
      { upsert: true, new: true }
    );

    console.log(`Saved Google profile to database under google_accounts: ${email}`);

    return Response.json({
      success: true,
      data: {
        email,
        name,
        picture,
        googleId,
        accountId: account._id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to verify Google ID token';
    return Response.json(
      { success: false, error: { message } },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
