import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { IRequest, StatusError, json } from 'itty-router'
import { sql } from 'kysely'
import { upsertFairyAccessWithDb } from '../../adminRoutes'
import { FAIRY_WORLDWIDE_EXPIRATION } from '../../config'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { sendDiscordNotification } from '../../utils/discord'
import { getFeatureFlag } from '../../utils/featureFlags'
import { getClerkClient, requireAuth } from '../../utils/tla/getAuth'

export async function redeemFairyInvite(
	request: IRequest,
	env: Environment,
	ctx: ExecutionContext
): Promise<Response> {
	const fairiesEnabled = await getFeatureFlag(env, 'fairies')
	if (!fairiesEnabled) {
		throw new StatusError(403, 'Fairy invites are currently disabled')
	}

	const auth = await requireAuth(request, env)
	const body: any = await request.json()
	const inviteCode = body?.inviteCode

	if (!inviteCode || typeof inviteCode !== 'string') {
		throw new StatusError(400, 'Invalid invite code')
	}

	// Get user's email from Clerk
	const clerkClient = getClerkClient(env)
	const clerkUser = await clerkClient.users.getUser(auth.userId)
	const userEmail = clerkUser.emailAddresses[0]?.emailAddress

	if (!userEmail) {
		throw new StatusError(400, 'User email not found')
	}

	const db = createPostgresConnectionPool(env, 'redeemFairyInvite')

	try {
		const invite = await db.transaction().execute(async (tx) => {
			// Get the invite with a row lock to prevent race conditions
			const invite = await tx
				.selectFrom('fairy_invite')
				.selectAll()
				.where('id', '=', inviteCode)
				.forUpdate()
				.executeTakeFirst()

			if (!invite) {
				throw new StatusError(404, 'Invalid invite code')
			}

			// Check if invite has been fully used (0 means unlimited)
			if (invite.maxUses > 0 && invite.currentUses >= invite.maxUses) {
				throw new StatusError(400, 'This invite has been fully used')
			}

			// Check if user already has active fairy access
			const existingFairies = await tx
				.selectFrom('user_fairies')
				.select(['fairyAccessExpiresAt', 'fairyLimit'])
				.where('userId', '=', auth.userId)
				.executeTakeFirst()

			// If user already has active fairy access, don't modify anything
			if (
				existingFairies &&
				hasActiveFairyAccess(existingFairies.fairyAccessExpiresAt, existingFairies.fairyLimit)
			) {
				return null // Signal that user already has access
			}

			// Increment the invite usage count and append user email to redeemedBy
			await sql`
				UPDATE fairy_invite
				SET
					"currentUses" = "currentUses" + 1,
					"redeemedBy" = COALESCE("redeemedBy", '[]'::jsonb) || jsonb_build_array(${userEmail}::text)
				WHERE id = ${inviteCode}
			`.execute(tx)

			return invite
		})

		// If user already has access, return early
		if (!invite) {
			return json({
				success: true,
				alreadyHasAccess: true,
			})
		}

		// Grant fairy access using helper (handles upsert + DO refresh)
		const result = await upsertFairyAccessWithDb(
			env,
			auth.userId,
			invite.fairyLimit,
			FAIRY_WORLDWIDE_EXPIRATION
		)

		if (!result.success) {
			throw new StatusError(500, `Failed to grant fairy access: ${result.error}`)
		}

		sendDiscordNotification(
			env.DISCORD_FAIRY_PURCHASE_WEBHOOK_URL,
			{
				type: 'invite_redeemed',
				email: userEmail,
				description: invite.description ?? undefined,
			},
			ctx
		)

		return json({
			success: true,
		})
	} catch (error) {
		console.error('Error redeeming fairy invite:', error)
		if (error instanceof StatusError) {
			throw error
		}
		throw new StatusError(500, 'Internal server error')
	} finally {
		await db.destroy()
	}
}
