import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { TOTP } from "otpauth";
import { prisma } from "./prisma";
import { checkRateLimit, resetRateLimit } from "./rate-limit";
import { headers } from "next/headers";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
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
          logAuthEvent(null, credentials.email, "login_failed", ip, "User not found");
          return null;
        }

        // Check account lockout
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
          logAuthEvent(user.id, credentials.email, "login_blocked", ip, "Account locked");
          throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
        }

        // Clear expired lockout
        if (user.lockedUntil && user.lockedUntil <= new Date()) {
          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: 0, lockedUntil: null },
          });
        }

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) {
          const newAttempts = user.failedAttempts + 1;
          const lockout = newAttempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
            : null;

          await prisma.user.update({
            where: { id: user.id },
            data: { failedAttempts: newAttempts, lockedUntil: lockout },
          });

          logAuthEvent(user.id, credentials.email, "login_failed", ip, `Invalid password (attempt ${newAttempts}/${MAX_FAILED_ATTEMPTS})`);

          if (lockout) {
            throw new Error(`Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`);
          }

          return null;
        }

        // 2FA check
        if (user.totpEnabled && user.totpSecret) {
          const code = credentials.totpCode?.trim();

          if (!code) {
            // Signal that 2FA is required (client catches this)
            throw new Error("2FA_REQUIRED");
          }

          // Check recovery codes first
          const recoveryCodes: string[] = JSON.parse(user.totpRecoveryCodes || "[]");
          const recoveryIndex = recoveryCodes.findIndex((rc) => rc === code);

          if (recoveryIndex >= 0) {
            // Valid recovery code — consume it
            recoveryCodes.splice(recoveryIndex, 1);
            await prisma.user.update({
              where: { id: user.id },
              data: { totpRecoveryCodes: JSON.stringify(recoveryCodes) },
            });
            logAuthEvent(user.id, credentials.email, "login_recovery_code", ip);
          } else {
            // Verify TOTP
            const totp = new TOTP({ secret: user.totpSecret, algorithm: "SHA1", digits: 6, period: 30 });
            const delta = totp.validate({ token: code, window: 1 });

            if (delta === null) {
              logAuthEvent(user.id, credentials.email, "login_failed_2fa", ip, "Invalid TOTP code");
              throw new Error("Invalid 2FA code. Please try again.");
            }
          }
        }

        // Successful login
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        resetRateLimit(ip);
        logAuthEvent(user.id, credentials.email, "login_success", ip);

        return { id: user.id, email: user.email };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.email = user.email;
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, mustChangePassword: true },
        });
        token.role = dbUser?.role || "member";
        token.mustChangePassword = dbUser?.mustChangePassword || false;
      } else if (trigger === "update" && token.id) {
        // Refresh role/mustChangePassword from DB on session.update()
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, mustChangePassword: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.mustChangePassword = dbUser.mustChangePassword;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email as string;
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

function logAuthEvent(userId: string | null, email: string, action: string, ip: string, detail?: string) {
  prisma.activityEvent.create({
    data: {
      userId: userId || "system",
      action,
      detail: detail || "",
      metadata: JSON.stringify({ email, ip, timestamp: new Date().toISOString() }),
    },
  }).catch(() => {});
}
