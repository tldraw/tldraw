import { AcceptInviteResponseBody } from '@tldraw/dotcom-shared'
import { getIndexBelow, IndexKey } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'

export async function acceptInvite(request: IRequest, env: Environment): Promise<Response> {
	const { token } = request.params
	if (!token) {
		return Response.json(
			{ error: true, message: 'Invite token is required' } satisfies AcceptInviteResponseBody,
			{ status: 400 }
		)
	}

	const auth = await requireAuth(request, env)
	const db = createPostgresConnectionPool(env, 'acceptInvite')

	try {
		return await db.transaction().execute(async (tx) => {
			// First, validate the invite token and get group info
			const group = await tx
				.selectFrom('group')
				.select(['id', 'name', 'isDeleted'])
				.where('inviteSecret', '=', token)
				.executeTakeFirst()

			if (!group || group.isDeleted) {
				return Response.json(
					{
						error: true,
						message: 'Invalid or expired invite token',
					} satisfies AcceptInviteResponseBody,
					{ status: 404 }
				)
			}

			// Check if user is already a member of this group (with row lock to prevent race conditions)
			const existingMember = await tx
				.selectFrom('group_user')
				.select('userId')
				.where('groupId', '=', group.id)
				.where('userId', '=', auth.userId)
				.executeTakeFirst()

			if (existingMember) {
				return Response.json({
					error: false,
					message: 'You are already a member of this group',
					groupId: group.id,
					groupName: group.name,
					alreadyMember: true,
				} satisfies AcceptInviteResponseBody)
			}

			// Get the user's information for the group_user record
			const user = await tx
				.selectFrom('user')
				.select(['name', 'color', 'flags'])
				.where('id', '=', auth.userId)
				.executeTakeFirst()

			if (!user) {
				return Response.json(
					{
						error: true,
						message: 'User not found',
					} satisfies AcceptInviteResponseBody,
					{ status: 404 }
				)
			}

			// Get the lowest index to place new group at the top
			const lowestIndexGroup = await sql<{
				index: string
				// kysely doesn't support 'collate' in the query builder, so we have to use raw sql
				// collate "C" makes it use straight up byte comparison instead of lexicographic comparison
			}>`select index from group_user where "userId" = ${auth.userId} order by index collate "C" asc limit 1`.execute(
				tx
			)

			// Use tldraw's fractional indexing to place new group at the top
			let index: IndexKey
			if (!lowestIndexGroup.rows[0]) {
				// First group gets 'a1'
				index = 'a1' as IndexKey
			} else {
				// Generate a new index below the current lowest (to place at top)
				index = getIndexBelow(lowestIndexGroup.rows[0].index as IndexKey)
			}

			// Add user to the group
			await tx
				.insertInto('group_user')
				.values({
					groupId: group.id,
					userId: auth.userId,
					userColor: user.color || '#000000',
					userName: user.name,
					role: 'admin',
					index,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
				.execute()

			// give user the groups flag if they don't have it yet
			if (!user.flags.includes('groups')) {
				await tx
					.updateTable('user')
					.set({ flags: (user.flags + ' groups').trim() })
					.where('id', '=', auth.userId)
					.execute()
			}

			return Response.json({
				error: false,
				message: 'Successfully joined the group',
				groupId: group.id,
				groupName: group.name,
				success: true,
			} satisfies AcceptInviteResponseBody)
		})
	} catch (error) {
		console.error('Error accepting invite:', error)
		return Response.json(
			{
				error: true,
				message: 'Internal server error',
			} satisfies AcceptInviteResponseBody,
			{ status: 500 }
		)
	} finally {
		await db.destroy()
	}
}
