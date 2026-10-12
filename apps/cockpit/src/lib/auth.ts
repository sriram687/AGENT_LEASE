import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@leash/db";
import { users } from "@leash/db";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user) return null;

        // TODO: compare hashed password (bcrypt) in Day 2
        // For now: placeholder that wires to real auth in Day 2
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) token["id"] = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token["id"]) {
        session.user.id = token["id"] as string;
      }
      return session;
    },
  },
});
