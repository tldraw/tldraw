import {
	sortWhatsNewUpdates,
	WHATS_NEW_MEDIA_MAX_BYTES,
	WHATS_NEW_MEDIA_PREFIX,
	WHATS_NEW_MEDIA_TYPES,
	WhatsNewResponse,
	WhatsNewStore,
	WhatsNewUpdate,
} from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { IRequest, json, StatusError } from 'itty-router'
import { Environment } from './types'
import { getAuth, requireAdminAccess } from './utils/tla/getAuth'

const KV_KEY = 'updates'
const MAX_TITLE_LENGTH = 200
const MAX_BODY_LENGTH = 50_000

export async function readWhatsNewStore(
	env: Environment,
	opts?: { cacheTtl?: number }
): Promise<WhatsNewStore> {
	const raw = await env.WHATS_NEW.get(
		KV_KEY,
		opts?.cacheTtl ? { cacheTtl: opts.cacheTtl } : undefined
	)
	if (!raw) return { version: 0, updates: [] }
	return JSON.parse(raw)
}

export async function writeWhatsNewStore(env: Environment, store: WhatsNewStore) {
	await env.WHATS_NEW.put(KV_KEY, JSON.stringify(store))
}

/** Public, works signed out. `?drafts=1` is admin-only; the admin check is a Clerk API call, so plain reads never make it. */
export async function getWhatsNew(request: IRequest, env: Environment): Promise<Response> {
	const includeDrafts = new URL(request.url).searchParams.get('drafts') === '1'
	if (includeDrafts) {
		await requireAdminAccess(env, await getAuth(request, env))
	}
	const store = await readWhatsNewStore(env, includeDrafts ? undefined : { cacheTtl: 60 })
	const updates = includeDrafts
		? store.updates
		: store.updates.filter((u) => u.status === 'published')
	return json({ updates: sortWhatsNewUpdates(updates) } satisfies WhatsNewResponse)
}

function respondWithStore(store: WhatsNewStore) {
	return json({ version: store.version, updates: sortWhatsNewUpdates(store.updates) })
}

function parseContent(body: any): { title: string; body: string } {
	const title = typeof body?.title === 'string' ? body.title.trim() : ''
	if (!title || title.length > MAX_TITLE_LENGTH) {
		throw new StatusError(400, `title must be 1-${MAX_TITLE_LENGTH} characters`)
	}
	if (typeof body.body !== 'string' || body.body.length > MAX_BODY_LENGTH) {
		throw new StatusError(400, `body must be a string of at most ${MAX_BODY_LENGTH} characters`)
	}
	return { title, body: body.body }
}

/** Every write carries the version the admin loaded, so a save based on stale data is rejected. */
async function mutate(
	req: IRequest,
	env: Environment,
	fn: (updates: WhatsNewUpdate[], body: any, now: number) => WhatsNewUpdate[]
) {
	const body: any = await req.json()
	if (typeof body?.version !== 'number') {
		throw new StatusError(400, 'version (number) is required')
	}
	const store = await readWhatsNewStore(env)
	if (body.version !== store.version) {
		throw new StatusError(409, 'What’s new was changed by someone else')
	}
	const next = { version: store.version + 1, updates: fn(store.updates, body, Date.now()) }
	await writeWhatsNewStore(env, next)
	return respondWithStore(next)
}

function updateById(
	updates: WhatsNewUpdate[],
	id: string,
	fn: (update: WhatsNewUpdate) => WhatsNewUpdate
) {
	if (!updates.some((u) => u.id === id)) throw new StatusError(404, 'Update not found')
	return updates.map((u) => (u.id === id ? fn(u) : u))
}

export async function getWhatsNewAdmin(_req: IRequest, env: Environment) {
	return respondWithStore(await readWhatsNewStore(env))
}

export async function createWhatsNewUpdate(req: IRequest, env: Environment) {
	return mutate(req, env, (updates, body, now) => [
		...updates,
		{
			id: uniqueId(),
			...parseContent(body),
			status: 'draft',
			publishedAt: null,
			createdAt: now,
			updatedAt: now,
		},
	])
}

export async function editWhatsNewUpdate(req: IRequest, env: Environment) {
	return mutate(req, env, (updates, body, now) => {
		const content = parseContent(body)
		return updateById(updates, req.params.id, (u) => ({ ...u, ...content, updatedAt: now }))
	})
}

export async function publishWhatsNewUpdate(req: IRequest, env: Environment) {
	return mutate(req, env, (updates, _body, now) =>
		updateById(updates, req.params.id, (u) => ({
			...u,
			status: 'published',
			publishedAt: u.publishedAt ?? now,
		}))
	)
}

export async function unpublishWhatsNewUpdate(req: IRequest, env: Environment) {
	return mutate(req, env, (updates) =>
		updateById(updates, req.params.id, (u) => ({ ...u, status: 'draft' }))
	)
}

export async function deleteWhatsNewUpdate(req: IRequest, env: Environment) {
	return mutate(req, env, (updates) => {
		if (!updates.some((u) => u.id === req.params.id)) throw new StatusError(404, 'Update not found')
		return updates.filter((u) => u.id !== req.params.id)
	})
}

export async function uploadWhatsNewMedia(req: IRequest, env: Environment) {
	const contentType = req.headers.get('content-type') ?? ''
	const ext = WHATS_NEW_MEDIA_TYPES[contentType]
	if (!ext) throw new StatusError(415, `Unsupported media type: ${contentType}`)
	if (Number(req.headers.get('content-length') ?? 0) > WHATS_NEW_MEDIA_MAX_BYTES) {
		throw new StatusError(413, 'File is too large')
	}
	const bytes = await req.arrayBuffer()
	if (bytes.byteLength > WHATS_NEW_MEDIA_MAX_BYTES) throw new StatusError(413, 'File is too large')
	const objectName = `${WHATS_NEW_MEDIA_PREFIX}${uniqueId()}.${ext}`
	await env.UPLOADS.put(objectName, bytes, { httpMetadata: { contentType } })
	return json({ objectName })
}
