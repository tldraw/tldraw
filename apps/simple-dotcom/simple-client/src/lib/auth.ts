// Better Auth Server Configuration
// Server-side auth instance for API routes and server components

import { betterAuth, createMiddleware } from 'better-auth'
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
	// Hooks to provision private workspace on signup
	hooks: {
		after: createMiddleware(async (ctx) => {
			// Provision private workspace after successful signup
			// Better Auth uses /sign-up/email for email/password signups
			if (ctx.path === '/sign-up/email') {
				const newSession = ctx.context.newSession
				if (newSession?.user?.id) {
					const client = await pool.connect()
					try {
						// Use transaction to ensure atomicity - both workspace and member must succeed
						await client.query('BEGIN')

						// Create private workspace
						const workspaceResult = await client.query(
							`INSERT INTO workspaces (owner_id, name, is_private)
							 VALUES ($1, $2, true)
							 RETURNING id`,
							[newSession.user.id, 'My Private Workspace']
						)

						const workspaceId = workspaceResult.rows[0]?.id

						if (!workspaceId) {
							throw new Error('Failed to get workspace ID after insert')
						}

						// Add owner as member
						await client.query(
							`INSERT INTO workspace_members (workspace_id, user_id, workspace_role)
							 VALUES ($1, $2, $3)`,
							[workspaceId, newSession.user.id, 'owner']
						)

						// Commit transaction - both operations succeeded
						await client.query('COMMIT')
					} catch (error) {
						// Rollback transaction on any error
						await client.query('ROLLBACK')
						console.error('Failed to provision private workspace:', error)
						// Rethrow to fail signup - user must have workspace before proceeding
						throw new Error('Failed to provision private workspace. Please try signing up again.')
					} finally {
						client.release()
					}
				}
			}
		}),
	},
})
