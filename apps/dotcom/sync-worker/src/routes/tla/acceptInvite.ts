import { AcceptInviteResponseBody } from '@tldraw/dotcom-shared'
import { getIndexBelow, IndexKey } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { requireAuth } from '../../utils/tla/getAuth'
import { getJoinableWorkspaceFromInvite } from '../../utils/tla/getJoinableWorkspaceFromInvite'

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
			const workspace = await getJoinableWorkspaceFromInvite(tx, token)

			if (!workspace) {
				return Response.json(
					{
						error: true,
						message: 'Invalid or expired invite token',
					} satisfies AcceptInviteResponseBody,
					{ status: 404 }
				)
			}

			const existingMember = await tx
				.selectFrom('group_user')
				.select('userId')
				.where('groupId', '=', workspace.id)
				.where('userId', '=', auth.userId)
				.executeTakeFirst()

			if (existingMember) {
				return Response.json({
					error: false,
					message: 'You are already a member of this group',
					workspaceId: workspace.id,
					workspaceName: workspace.name,
					alreadyMember: true,
				} satisfies AcceptInviteResponseBody)
			}

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
			// New groups go at the top, so find the current lowest index and generate one below it.
			const lowestIndexGroup = await sql<{
				index: string
				// kysely doesn't support 'collate' in the query builder, so we have to use raw sql
				// collate "C" makes it use straight up byte comparison instead of lexicographic comparison
			}>`select index from group_user where "userId" = ${auth.userId} order by index collate "C" asc limit 1`.execute(
				tx
			)

			const lowestIndex = lowestIndexGroup.rows[0]?.index as IndexKey | undefined
			const index = lowestIndex ? getIndexBelow(lowestIndex) : ('a1' as IndexKey)

			await tx
				.insertInto('group_user')
				.values({
					groupId: workspace.id,
					userId: auth.userId,
					userColor: user.color || '#000000',
					userName: user.name,
					role: 'member',
					index,
					createdAt: Date.now(),
					updatedAt: Date.now(),
				})
				.execute()

			return Response.json({
				error: false,
				message: 'Successfully joined the group',
				workspaceId: workspace.id,
				workspaceName: workspace.name,
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
