import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";
import { checkRateLimit, resetRateLimit } from "./rate-limit";
import { headers } from "next/headers";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        // Rate limiting by IP
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        const rateCheck = checkRateLimit(ip);
        if (!rateCheck.allowed) {
          throw new Error("Too many login attempts. Try again in 15 minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) {
          // Log failed attempt
          logAuthEvent(null, credentials.email, "login_failed", ip, "User not found");
          return null;
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          logAuthEvent(user.id, credentials.email, "login_failed", ip, "Invalid password");
          return null;
        }

        // Successful login — reset rate limit and log
        resetRateLimit(ip);
        logAuthEvent(user.id, credentials.email, "login_success", ip);

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours — force re-login daily
  },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true } });
        token.role = dbUser?.role || "member";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Fire-and-forget auth event logging
function logAuthEvent(userId: string | null, email: string, action: string, ip: string, detail?: string) {
  prisma.activityEvent.create({
    data: {
      userId: userId || "system",
      action,
      detail: detail || "",
      metadata: JSON.stringify({ email, ip, timestamp: new Date().toISOString() }),
    },
  }).catch(() => {
    // Silently fail — don't block auth flow
  });
}
