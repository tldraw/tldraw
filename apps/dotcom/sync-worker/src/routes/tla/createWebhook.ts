import { TlaFileWebhookEventType, TlaFileWebhookFilter } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest, StatusError } from 'itty-router'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { isRoomIdTooLong, roomIdIsTooLong } from '../../utils/roomIdIsTooLong'
import { requireAuth, requireWriteAccessForUser } from '../../utils/tla/getAuth'
import { validateWebhookUrl } from '../../utils/webhookValidation'

const SUPPORTED_EVENT_TYPES: ReadonlySet<TlaFileWebhookEventType> = new Set([
	'shape.created',
	'shape.updated',
	'shape.deleted',
])
const MAX_WEBHOOKS_PER_FILE = 10
const MAX_FILTER_PATHS = 20
const MAX_FILTER_PATH_LENGTH = 200
const SECRET_PREFIX = 'whsec_'
const SECRET_BODY_LENGTH = 32

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

export async function createWebhook(request: IRequest, env: Environment): Promise<Response> {
	const fileSlug = request.params.fileSlug
	if (!fileSlug) {
		return Response.json({ error: true, message: 'fileSlug required' }, { status: 400 })
	}
	if (isRoomIdTooLong(fileSlug)) return roomIdIsTooLong()

	const auth = await requireAuth(request, env)
	try {
		await requireWriteAccessForUser(env, auth.userId, fileSlug)
	} catch (e) {
		if (e instanceof StatusError) {
			return Response.json({ error: true, message: e.message }, { status: e.status })
		}
		throw e
	}

	const body = (await request.json().catch(() => null)) as {
		url?: string
		eventType?: string
		filter?: { paths?: unknown }
	} | null
	if (!body) {
		return Response.json({ error: true, message: 'Invalid JSON body' }, { status: 400 })
	}

	const eventType = body.eventType as TlaFileWebhookEventType | undefined
	if (!eventType || !SUPPORTED_EVENT_TYPES.has(eventType)) {
		return Response.json(
			{
				error: true,
				message: `eventType must be one of: ${[...SUPPORTED_EVENT_TYPES].join(', ')}`,
			},
			{ status: 400 }
		)
	}

	let filter: TlaFileWebhookFilter | null = null
	if (eventType === 'shape.updated') {
		const paths = body.filter?.paths
		if (
			!isStringArray(paths) ||
			paths.length === 0 ||
			paths.length > MAX_FILTER_PATHS ||
			paths.some((p) => !p || p.length > MAX_FILTER_PATH_LENGTH)
		) {
			return Response.json(
				{
					error: true,
					message: `shape.updated requires filter.paths: non-empty string[] of <= ${MAX_FILTER_PATHS} dot-paths, each <= ${MAX_FILTER_PATH_LENGTH} chars`,
				},
				{ status: 400 }
			)
		}
		filter = { paths }
	}

	const urlValidation = validateWebhookUrl(body.url ?? '', env)
	if (!urlValidation.ok) {
		return Response.json({ error: true, message: urlValidation.message }, { status: 400 })
	}

	const db = createPostgresConnectionPool(env, 'sync-worker/createWebhook')
	try {
		const count = await db
			.selectFrom('file_webhook')
			.select(db.fn.count<number>('id').as('count'))
			.where('fileId', '=', fileSlug)
			.executeTakeFirst()
		if (count && count.count >= MAX_WEBHOOKS_PER_FILE) {
			return Response.json(
				{ error: true, message: 'Webhook limit reached for this file' },
				{ status: 400 }
			)
		}

		const id = uniqueId()
		const secret = SECRET_PREFIX + uniqueId(SECRET_BODY_LENGTH)
		const createdAt = Date.now()
		await db
			.insertInto('file_webhook')
			.values({
				id,
				fileId: fileSlug,
				userId: auth.userId,
				url: body.url!,
				secret,
				eventType,
				filter,
				createdAt,
			})
			.execute()

		return Response.json({
			error: false,
			id,
			url: body.url,
			secret,
			eventType,
			filter,
			createdAt,
		})
	} finally {
		await db.destroy()
	}
}
