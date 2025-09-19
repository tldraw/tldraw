import { GetInviteInfoResponseBody } from '@tldraw/dotcom-shared'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'

export async function getInviteInfo(request: IRequest, env: Environment): Promise<Response> {
	const { token } = request.params
	if (!token) {
		return Response.json({ error: true, message: 'Invite token is required' }, { status: 400 })
	}

	const db = createPostgresConnectionPool(env, 'getInviteInfo')

	try {
		const group = await db
			.selectFrom('group')
			.select(['id', 'name', 'isDeleted'])
			.where('inviteSecret', '=', token)
			.executeTakeFirst()

		if (!group || group.isDeleted) {
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
			groupId: group.id,
			groupName: group.name,
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
