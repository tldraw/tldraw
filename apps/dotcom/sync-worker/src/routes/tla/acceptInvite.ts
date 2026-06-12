import { AcceptInviteResponseBody, userHasFlag } from '@tldraw/dotcom-shared'
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
			// First, validate the invite token and get workspace info
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

			// Check if user is already a member of this workspace (with row lock to prevent race conditions)
			const existingMember = await tx
				.selectFrom('workspace_user')
				.select('userId')
				.where('workspaceId', '=', workspace.id)
				.where('userId', '=', auth.userId)
				.executeTakeFirst()

			if (existingMember) {
				return Response.json({
					error: false,
					message: 'You are already a member of this workspace',
					workspaceId: workspace.id,
					workspaceName: workspace.name,
					alreadyMember: true,
				} satisfies AcceptInviteResponseBody)
			}

			// Get the user's information for the workspace_user record
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
			if (!userHasFlag(user.flags, 'groups_backend')) {
				return Response.json(
					{
						error: true,
						message: 'User is not migrated to the workspaces model',
					} satisfies AcceptInviteResponseBody,
					{ status: 400 }
				)
			}

			// Ensure user has groups_frontend flag when accepting invite
			if (!userHasFlag(user.flags, 'groups_frontend')) {
				const currentFlags = user.flags ? user.flags.split(/[,\s]+/).filter(Boolean) : []
				const newFlags = [...currentFlags, 'groups_frontend'].join(',')
				await tx
					.updateTable('user')
					.set({ flags: newFlags })
					.where('id', '=', auth.userId)
					.execute()
			}

			// Get the lowest index to place new workspace at the top
			const lowestIndexWorkspace = await sql<{
				index: string
				// kysely doesn't support 'collate' in the query builder, so we have to use raw sql
				// collate "C" makes it use straight up byte comparison instead of lexicographic comparison
			}>`select index from workspace_user where "userId" = ${auth.userId} order by index collate "C" asc limit 1`.execute(
				tx
			)

			// Use tldraw's fractional indexing to place new workspace at the top
			let index: IndexKey
			if (!lowestIndexWorkspace.rows[0]) {
				// First workspace gets 'a1'
				index = 'a1' as IndexKey
			} else {
				// Generate a new index below the current lowest (to place at top)
				index = getIndexBelow(lowestIndexWorkspace.rows[0].index as IndexKey)
			}

			// Add user to the workspace
			await tx
				.insertInto('workspace_user')
				.values({
					workspaceId: workspace.id,
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
				message: 'Successfully joined the workspace',
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
