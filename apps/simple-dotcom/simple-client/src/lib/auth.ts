// Better Auth Server Configuration
// Server-side auth instance for API routes and server components

import { betterAuth } from 'better-auth'
import { createAuthMiddleware } from 'better-auth/api'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

// Create PostgreSQL connection pool for Better Auth
// Uses Supabase connection string
const pool = new Pool({
	connectionString: process.env.DATABASE_URL,
})

export const auth = betterAuth({
	database: pool,
	// Configure table names and field names to match our Supabase schema (snake_case)
	databaseType: 'postgres',
	// Use UUID for user IDs to match Supabase schema
	advanced: {
		database: {
			generateId: () => {
				// Use crypto.randomUUID() to generate UUIDs compatible with PostgreSQL UUID type
				return crypto.randomUUID()
			},
		},
	},
	user: {
		modelName: 'users', // Use 'users' table instead of 'user'
		fields: {
			email: 'email',
			emailVerified: 'email_verified',
			name: 'name',
			image: 'image',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	},
	session: {
		modelName: 'session',
		fields: {
			expiresAt: 'expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			userId: 'user_id',
			ipAddress: 'ip_address',
			userAgent: 'user_agent',
		},
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // Refresh if session is older than 1 day
	},
	account: {
		modelName: 'account',
		fields: {
			accountId: 'account_id',
			providerId: 'provider_id',
			userId: 'user_id',
			accessToken: 'access_token',
			refreshToken: 'refresh_token',
			idToken: 'id_token',
			accessTokenExpiresAt: 'access_token_expires_at',
			refreshTokenExpiresAt: 'refresh_token_expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	},
	verification: {
		modelName: 'verification',
		fields: {
			expiresAt: 'expires_at',
			createdAt: 'created_at',
			updatedAt: 'updated_at',
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false, // Disable for MVP - can add later
		// Password reset configuration
		sendResetPassword: async ({ user, url, token }) => {
			// For MVP, we'll log the reset URL to console
			// In production, this should send an email via a service like Resend
			console.log(`[Password Reset] User: ${user.email}\nReset URL: ${url}\nToken: ${token}`)
			// TODO: Replace with actual email service in production
			// Example with Resend:
			// await resend.emails.send({
			//   from: 'noreply@yourdomain.com',
			//   to: user.email,
			//   subject: 'Reset your password',
			//   html: `Click here to reset your password: ${url}`
			// })
		},
		resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
	},
	secret: process.env.BETTER_AUTH_SECRET!,
	baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
	// Use nextCookies plugin for automatic cookie handling in server actions
	plugins: [nextCookies()],
	// Hooks to provision private workspace on signup
	hooks: {
		after: createAuthMiddleware(async (ctx) => {
			// Provision private workspace after successful signup
			// Better Auth uses /sign-up/email for email/password signups
			if (ctx.path.startsWith('/sign-up')) {
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
							`INSERT INTO workspace_members (workspace_id, user_id, role)
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
