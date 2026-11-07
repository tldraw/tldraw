import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getJoinableWorkspaceFromInvite } from '../../utils/tla/getJoinableWorkspaceFromInvite'

export async function getInviteInfo(request: IRequest, env: Environment): Promise<Response> {
	const { token } = request.params
	if (!token) {
		return Response.json({ error: true, code: 'bad_request' } satisfies GetInviteInfoResponseBody, {
			status: 400,
		})
	}

	const db = createPostgresConnectionPool(env, 'getInviteInfo')

	try {
		const workspace = await getJoinableWorkspaceFromInvite(db, token)

		if (!workspace) {
			return Response.json(
				{
					error: true,
					code: 'invite_not_found',
				} satisfies GetInviteInfoResponseBody,
				{ status: 404 }
			)
		}

		return Response.json({
			error: false,
			workspaceId: workspace.id,
			workspaceName: workspace.name,
			isValid: true,
			inviteSecret: token,
		} satisfies GetInviteInfoResponseBody)
	} catch (error) {
		console.error('Error getting invite info:', error)
		return Response.json(
			{
				error: true,
				code: 'internal_error',
			} satisfies GetInviteInfoResponseBody,
			{ status: 500 }
		)
	} finally {
		await db.destroy()
	}
}
