// Better Auth Server Configuration
// Server-side auth instance for API routes and server components

import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

// Create PostgreSQL connection pool for Better Auth
// Uses Supabase connection string
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

export const auth = betterAuth({
	database: pool,
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Disable for MVP - can add later
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Refresh if session is older than 1 day
	},
	secret: process.env.BETTER_AUTH_SECRET!,
	baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
	// Use nextCookies plugin for automatic cookie handling in server actions
	plugins: [nextCookies()],
})
