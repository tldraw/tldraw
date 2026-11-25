import { assertExists, uniqueId } from '@tldraw/utils'
import { IRequest } from 'itty-router'
import { ImageInfo, StoredImage, readImageInfo } from '../../mcpImage'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { base64UrlDecode, base64UrlEncode } from '../../utils/base64'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { getPublicOrigin } from '../../utils/getPublicOrigin'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import { hasWriteAccessToFile } from '../../utils/tla/hasWriteAccessToFile'
import {
	AddImageRefusal,
	IMAGE_UPLOAD_MAX_BYTES,
	IMAGE_UPLOAD_MIME_TYPES,
	IMAGE_UPLOAD_TTL_MS,
	ImageSource,
	ImageUploadMimeType,
	ImageUploadTicket,
} from './boardTools'

/** The route an upload URL points at, as the router sees it; the public form has the `/api` prefix. */
export const MCP_IMAGE_UPLOAD_ROUTE = '/app/mcp/uploads/:objectName'

const IMAGE_FETCH_TIMEOUT_MS = 10_000

// --- Upload grants ------------------------------------------------------------------------------

/**
 * What an upload URL is signed over. The agent's shell uploads with no credentials of its own, so
 * the URL is the whole authorization: which board, for whom, into which object, until when.
 *
 * Signed with the render token secret. `t` keeps the two kinds of token apart: a render job has no
 * `t` and is refused here, and this has no `kind`, which verifyThumbnailRenderToken requires.
 */
interface ImageUploadGrant {
	v: 1
	t: 'mcp_image_upload'
	fileId: string
	userId: string
	objectName: string
	mimeType: ImageUploadMimeType
	name: string
	exp: number
}

async function getHmacKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	)
}

export async function mintImageUploadToken(env: Environment, grant: ImageUploadGrant) {
	const secret = assertExists(
		env.MCP_SCREENSHOT_TOKEN_SECRET,
		'MCP_SCREENSHOT_TOKEN_SECRET is not configured'
	)
	const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(grant)))
	const signature = await crypto.subtle.sign(
		'HMAC',
		await getHmacKey(secret),
		new TextEncoder().encode(payload)
	)
	return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyImageUploadToken(
	env: Environment,
	token: string,
	now = Date.now()
): Promise<ImageUploadGrant | null> {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) return null
	const [payload, signature, ...rest] = token.split('.')
	if (!payload || !signature || rest.length > 0) return null
	try {
		const isValid = await crypto.subtle.verify(
			'HMAC',
			await getHmacKey(secret),
			base64UrlDecode(signature),
			new TextEncoder().encode(payload)
		)
		if (!isValid) return null
		const grant = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
		if (
			grant?.v !== 1 ||
			grant.t !== 'mcp_image_upload' ||
			typeof grant.fileId !== 'string' ||
			typeof grant.userId !== 'string' ||
			typeof grant.objectName !== 'string' ||
			typeof grant.name !== 'string' ||
			!IMAGE_UPLOAD_MIME_TYPES.includes(grant.mimeType) ||
			typeof grant.exp !== 'number' ||
			grant.exp <= now
		) {
			return null
		}
		return grant
	} catch {
		return null
	}
}

// --- Access -------------------------------------------------------------------------------------

/**
 * Whether the caller may put images on this board, checked before anything is fetched or stored on
 * their say-so. The durable object checks again when it writes, against the live file record.
 */
async function refuseUnlessWritable(
	env: Environment,
	boardId: string,
	userId: string
): Promise<AddImageRefusal | null> {
	const db = createPostgresConnectionPool(env, 'sync-worker')
	try {
		if (await hasWriteAccessToFile(db, boardId, userId)) return null
	} finally {
		await db.destroy()
	}
	const canRead = await hasReadAccessToFile(env, userId, boardId)
	return { reason: canRead.ok ? 'image_forbidden' : 'not_found' }
}

// --- create_image_upload ------------------------------------------------------------------------

const EXTENSIONS: Record<ImageUploadMimeType, string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/gif': 'gif',
	'image/webp': 'webp',
}

// Named the way tldraw.com names its own uploads: an id, then the file's name with anything R2 or a
// URL could trip on replaced.
function createObjectName(name: string) {
	return `${uniqueId()}-${name.replace(/\W/g, '-').slice(0, 200)}`
}

export async function createImageUpload(
	env: Environment,
	request: IRequest,
	userId: string,
	input: { boardId: string; mimeType: ImageUploadMimeType; name: string | null }
): Promise<{ ok: true; ticket: ImageUploadTicket } | ({ ok: false } & AddImageRefusal)> {
	const refusal = await refuseUnlessWritable(env, input.boardId, userId)
	if (refusal) return { ok: false, ...refusal }

	const name = input.name ?? `image.${EXTENSIONS[input.mimeType]}`
	const objectName = createObjectName(name)
	const exp = Date.now() + IMAGE_UPLOAD_TTL_MS
	const token = await mintImageUploadToken(env, {
		v: 1,
		t: 'mcp_image_upload',
		fileId: input.boardId,
		userId,
		objectName,
		mimeType: input.mimeType,
		name,
		exp,
	})
	return {
		ok: true,
		ticket: {
			uploadId: objectName,
			uploadUrl: `${getPublicOrigin(request, env)}/api/app/mcp/uploads/${objectName}?token=${token}`,
			method: 'PUT',
			headers: { 'Content-Type': input.mimeType },
			maxBytes: IMAGE_UPLOAD_MAX_BYTES,
			expiresAt: new Date(exp).toISOString(),
		},
	}
}

// --- Storing an image ---------------------------------------------------------------------------

/** The whole body, or null once it passes `maxBytes`, without buffering more than that. */
async function readCapped(
	body: ReadableStream<Uint8Array> | null,
	maxBytes: number
): Promise<Uint8Array | null> {
	if (!body) return new Uint8Array()
	const chunks: Uint8Array[] = []
	let size = 0
	const reader = body.getReader()
	for (;;) {
		const { done, value } = await reader.read()
		if (done) break
		size += value.byteLength
		if (size > maxBytes) {
			await reader.cancel()
			return null
		}
		chunks.push(value)
	}
	const bytes = new Uint8Array(size)
	let offset = 0
	for (const chunk of chunks) {
		bytes.set(chunk, offset)
		offset += chunk.byteLength
	}
	return bytes
}

function getUserContentUrl(env: Environment) {
	return assertExists(env.USER_CONTENT_URL, 'USER_CONTENT_URL is required')
}

/**
 * Writes an image to the uploads bucket the way a tldraw.com upload does, with what was read from
 * its header kept beside it so add_image does not have to read the object again.
 */
async function storeImage(
	env: Environment,
	{
		bytes,
		info,
		objectName,
		fileId,
		userId,
		name,
		onlyIfNew = false,
	}: {
		bytes: Uint8Array
		info: ImageInfo
		objectName: string
		fileId: string
		userId: string
		name: string
		/** Store nothing and return null when the object already exists. */
		onlyIfNew?: boolean
	}
): Promise<StoredImage | null> {
	const stored = await env.UPLOADS.put(objectName, bytes, {
		onlyIf: onlyIfNew ? new Headers({ 'If-None-Match': '*' }) : undefined,
		httpMetadata: { contentType: info.mimeType },
		customMetadata: {
			fileId,
			name,
			w: String(info.w),
			h: String(info.h),
			isAnimated: String(info.isAnimated),
		},
	})
	if (!stored) return null
	await env.QUEUE.send({ type: 'asset-upload', objectName, fileId, userId })
	return {
		objectName,
		src: `${getUserContentUrl(env)}/${objectName}`,
		name,
		fileSize: bytes.byteLength,
		info,
	}
}

/** `PUT /app/mcp/uploads/:objectName?token=…`: where the URL from create_image_upload leads. */
export async function uploadMcpImage(request: IRequest, env: Environment): Promise<Response> {
	const token = new URL(request.url).searchParams.get('token') ?? ''
	const grant = await verifyImageUploadToken(env, token)
	if (!grant || grant.objectName !== request.params.objectName) {
		return Response.json(
			{ error: 'This upload URL is not valid or has expired. Call create_image_upload again.' },
			{ status: 403 }
		)
	}

	const tooLarge = Response.json(
		{ error: `The file is over the ${IMAGE_UPLOAD_MAX_BYTES / (1024 * 1024)} MB limit.` },
		{ status: 413 }
	)
	if (Number(request.headers.get('content-length')) > IMAGE_UPLOAD_MAX_BYTES) return tooLarge
	const bytes = await readCapped(request.body, IMAGE_UPLOAD_MAX_BYTES)
	if (!bytes) return tooLarge

	const info = readImageInfo(bytes)
	if (!info || info.mimeType !== grant.mimeType) {
		return Response.json(
			{
				error: `The file is not ${grant.mimeType}${info ? `; it is ${info.mimeType}` : ''}. Call create_image_upload with the type of the file you are uploading.`,
			},
			{ status: 415 }
		)
	}

	// What makes the URL good for one file. The write decides, not a check before it: two requests
	// arriving together would both pass a check and the second would replace the first.
	const stored = await storeImage(env, {
		bytes,
		info,
		objectName: grant.objectName,
		fileId: grant.fileId,
		userId: grant.userId,
		name: grant.name,
		onlyIfNew: true,
	})
	if (!stored) {
		return Response.json(
			{ error: 'A file was already uploaded to this URL. Pass its uploadId to add_image.' },
			{ status: 409 }
		)
	}
	return Response.json({ uploadId: grant.objectName, w: info.w, h: info.h })
}

// --- add_image ----------------------------------------------------------------------------------

/**
 * An upload made for this board through create_image_upload, or null. Null too for any other
 * object in the bucket: only our own upload route writes this metadata, so an uploadId cannot be
 * used to put a different board's image, or anything else stored there, on this one.
 */
async function readUploadedImage(
	env: Environment,
	fileId: string,
	uploadId: string
): Promise<StoredImage | null> {
	const object = await env.UPLOADS.head(uploadId).catch(() => null)
	const meta = object?.customMetadata
	const mimeType = object?.httpMetadata?.contentType as ImageUploadMimeType | undefined
	const w = Number(meta?.w)
	const h = Number(meta?.h)
	if (!object || !meta || meta.fileId !== fileId || !mimeType || !(w > 0) || !(h > 0)) return null
	if (!IMAGE_UPLOAD_MIME_TYPES.includes(mimeType)) return null
	return {
		objectName: uploadId,
		src: `${getUserContentUrl(env)}/${uploadId}`,
		name: meta.name ?? uploadId,
		fileSize: object.size,
		info: { mimeType, w, h, isAnimated: meta.isAnimated === 'true' },
	}
}

/** Copies an image off the web into the uploads bucket, so the board does not depend on the URL. */
async function storeImageFromUrl(
	env: Environment,
	fileId: string,
	userId: string,
	url: string
): Promise<{ ok: true; image: StoredImage } | ({ ok: false } & AddImageRefusal)> {
	let response: Response
	try {
		response = await fetch(url, {
			headers: { accept: IMAGE_UPLOAD_MIME_TYPES.join(', ') },
			signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
		})
	} catch {
		return { ok: false, reason: 'image_fetch_failed', url }
	}
	if (!response.ok) {
		await response.body?.cancel()
		return { ok: false, reason: 'image_fetch_failed', url }
	}
	if (Number(response.headers.get('content-length')) > IMAGE_UPLOAD_MAX_BYTES) {
		await response.body?.cancel()
		return { ok: false, reason: 'image_too_large' }
	}
	let bytes: Uint8Array | null
	try {
		bytes = await readCapped(response.body, IMAGE_UPLOAD_MAX_BYTES)
	} catch {
		return { ok: false, reason: 'image_fetch_failed', url }
	}
	if (!bytes) return { ok: false, reason: 'image_too_large' }
	const info = readImageInfo(bytes)
	if (!info) return { ok: false, reason: 'image_unsupported' }

	const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '') || 'image'
	const image = await storeImage(env, {
		bytes,
		info,
		objectName: createObjectName(name),
		fileId,
		userId,
		name,
	})
	// Null only answers a conditional write, which this is not.
	return { ok: true, image: assertExists(image) }
}

export type AddImageOutcome =
	| {
			ok: true
			shapeId: string
			pageId: string
			pageName: string
			x: number
			y: number
			w: number
			h: number
	  }
	| ({ ok: false } & AddImageRefusal)

export async function addImageForUser(
	env: Environment,
	userId: string,
	input: {
		boardId: string
		source: ImageSource
		pageId: string | null
		position: { x: number; y: number } | null
		w: number | null
		altText: string | null
	}
): Promise<AddImageOutcome> {
	const refusal = await refuseUnlessWritable(env, input.boardId, userId)
	if (refusal) return { ok: false, ...refusal }

	let image: StoredImage
	if (input.source.kind === 'upload') {
		const uploaded = await readUploadedImage(env, input.boardId, input.source.uploadId)
		if (!uploaded) {
			return { ok: false, reason: 'upload_not_found', uploadId: input.source.uploadId }
		}
		image = uploaded
	} else {
		const stored = await storeImageFromUrl(env, input.boardId, userId, input.source.url)
		if (!stored.ok) return stored
		image = stored.image
	}

	return getRoomDurableObject(env, input.boardId).writeMcpImage({
		fileId: input.boardId,
		userId,
		image,
		pageId: input.pageId,
		position: input.position,
		w: input.w,
		altText: input.altText,
	})
}
