import { hasActiveFairyAccess } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
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
		return Response.json({ error: 'Invalid invite code' }, { status: 400 })
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
				return Response.json({ error: 'Invalid invite code' }, { status: 404 })
			}

			// Check if invite has been fully used (0 means unlimited)
			if (invite.maxUses > 0 && invite.currentUses >= invite.maxUses) {
				return Response.json({ error: 'This invite has been fully used' }, { status: 400 })
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
				return Response.json({
					success: true,
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

			return Response.json({
				success: true,
				fairyLimit: invite.fairyLimit,
				expiresAt,
			})
		})
	} catch (error) {
		console.error('Error redeeming fairy invite:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	} finally {
		await db.destroy()
	}
}
