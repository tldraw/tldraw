import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { IRequest, StatusError, json } from 'itty-router'
import { FAIRY_WORLDWIDE_EXPIRATION } from '../../config'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getUserDurableObject } from '../../utils/durableObjects'
import { requireAuth } from '../../utils/tla/getAuth'

export async function redeemFairyInvite(request: IRequest, env: Environment): Promise<Response> {
	const auth = await requireAuth(request, env)
	const body: any = await request.json()
	const inviteCode = body?.inviteCode

	if (!inviteCode || typeof inviteCode !== 'string') {
		throw new StatusError(400, 'Invalid invite code')
	}

	const db = createPostgresConnectionPool(env, 'redeemFairyInvite')

	try {
		return await db.transaction().execute(async (tx) => {
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

			const expiresAt = FAIRY_WORLDWIDE_EXPIRATION

			// If user already has active fairy access, don't modify anything
			if (
				existingFairies &&
				hasActiveFairyAccess(existingFairies.fairyAccessExpiresAt, existingFairies.fairyLimit)
			) {
				return json({
					success: true,
					alreadyHasAccess: true,
				})
			}

			// Upsert user_fairies record
			await tx
				.insertInto('user_fairies')
				.values({
					userId: auth.userId,
					fairies: '{}',
					fairyLimit: invite.fairyLimit,
					fairyAccessExpiresAt: expiresAt,
				})
				.onConflict((oc) =>
					oc.column('userId').doUpdateSet({
						fairyLimit: invite.fairyLimit,
						fairyAccessExpiresAt: expiresAt,
					})
				)
				.execute()

			// Increment the invite usage count
			await tx
				.updateTable('fairy_invite')
				.set({
					currentUses: invite.currentUses + 1,
				})
				.where('id', '=', inviteCode)
				.execute()

			// Trigger User DO refresh to pick up new fairy access
			const userDO = getUserDurableObject(env, auth.userId)
			await userDO.refreshUserData(auth.userId)

			return json({
				success: true,
				fairyLimit: invite.fairyLimit,
				expiresAt,
			})
		})
	} catch (error) {
		console.error('Error redeeming fairy invite:', error)
		throw new StatusError(500, 'Internal server error')
	} finally {
		await db.destroy()
	}
}
