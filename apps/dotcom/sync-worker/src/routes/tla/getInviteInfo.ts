import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getJoinableGroupFromInvite } from '../../utils/tla/getJoinableGroupFromInvite'

export async function getInviteInfo(request: IRequest, env: Environment): Promise<Response> {
	const { token } = request.params
	if (!token) {
		return Response.json({ error: true, message: 'Invite token is required' }, { status: 400 })
	}

	const db = createPostgresConnectionPool(env, 'getInviteInfo')

	try {
		const group = await getJoinableGroupFromInvite(db, token)

		if (!group) {
			return Response.json(
				{
					error: true,
					message: 'Invalid or expired invite token',
				} satisfies GetInviteInfoResponseBody,
				{ status: 404 }
			)
		}

		return Response.json({
			error: false,
			workspaceId: group.id,
			workspaceName: group.name,
			isValid: true,
			inviteSecret: token,
		} satisfies GetInviteInfoResponseBody)
	} catch (error) {
		console.error('Error getting invite info:', error)
		return Response.json(
			{
				error: true,
				message: 'Internal server error',
			} satisfies GetInviteInfoResponseBody,
			{ status: 500 }
		)
	} finally {
		await db.destroy()
	}
}
