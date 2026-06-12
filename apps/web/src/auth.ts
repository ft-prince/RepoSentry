import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'

/**
 * GitHub OAuth via Auth.js. Auth is OPTIONAL in local dev: when
 * GITHUB_CLIENT_ID is unset the dashboard runs open so contributors can try
 * it with nothing but docker-compose + a seed. Set the OAuth credentials in
 * production and every dashboard route requires sign-in.
 */
export const isAuthEnabled = Boolean(process.env.GITHUB_CLIENT_ID)

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID ?? 'unset',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? 'unset',
    }),
  ],
  pages: { signIn: '/signin' },
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
  },
})
