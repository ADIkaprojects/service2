// ─────────────────────────────────────────────────────────────────────────────
// SIGNAL Platform — NextAuth Route Handler (Google + Microsoft Entra ID)
// ─────────────────────────────────────────────────────────────────────────────

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import MicrosoftEntraID from 'next-auth/providers/microsoft-entra-id';

const { handlers } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy',
    }),
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID || 'dummy',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'dummy',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session && token) {
        (session as any).provider = token.provider;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-at-least-32-chars-long-or-more',
});

export const { GET, POST } = handlers;
export const dynamic = 'force-dynamic';

