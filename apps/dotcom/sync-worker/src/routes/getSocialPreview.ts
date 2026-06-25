import {
	FILE_PREFIX,
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	RoomOpenMode,
	SNAPSHOT_PREFIX,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { getR2KeyForRoom, getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { getSlug } from '../utils/roomOpenMode'
import { R2Snapshot } from './createRoomSnapshot'

// These mirror the static social preview metadata in apps/dotcom/client/index.html. They are used
// as fallbacks so that bot-rendered previews stay consistent with the rest of the site.
const SOCIAL_PREVIEW_DESCRIPTION = 'A free and instant collaborative whiteboarding tool.'
const SOCIAL_PREVIEW_IMAGE = 'https://www.tldraw.com/social-og.png'
const SOCIAL_PREVIEW_IMAGE_ALT = 'A collaborative whiteboarding tool interface'
const SOCIAL_PREVIEW_TWITTER_IMAGE = 'https://www.tldraw.com/social-twitter.png'

/**
 * Serves a minimal HTML document with social preview (Open Graph / Twitter card) metadata for a
 * board. Social crawlers (Slack, Discord, Twitter, Facebook, etc.) don't run JavaScript, so the
 * single-page app's runtime title updates never reach them. Instead, Vercel routes those crawlers
 * here based on their user-agent, and we render the board's name into the preview title.
 *
 * Humans are never routed here — they get the regular single-page app.
 */
export async function getSocialPreview(request: IRequest, env: Environment): Promise<Response> {
	const { prefix, slug } = request.params
	if (!prefix || !slug) {
		return html(renderSocialPreview(null))
	}

	let name: string | null = null
	try {
		name = await getBoardName(env, prefix, slug)
	} catch {
		// If anything goes wrong looking up the name, fall back to the generic preview rather than
		// failing the request — a crawler should always get _something_.
		name = null
	}

	return html(renderSocialPreview(name))
}

async function getBoardName(
	env: Environment,
	prefix: string,
	slug: string
): Promise<string | null> {
	switch (prefix) {
		case FILE_PREFIX:
			return await getTlaFileName(env, slug)
		case PUBLISH_PREFIX:
			return await getPublishedFileName(env, slug)
		case SNAPSHOT_PREFIX:
			return await getSnapshotName(env, slug)
		case ROOM_PREFIX:
			return await getLegacyRoomName(env, slug, ROOM_OPEN_MODE.READ_WRITE)
		case READ_ONLY_PREFIX:
			return await getLegacyRoomName(env, slug, ROOM_OPEN_MODE.READ_ONLY)
		case READ_ONLY_LEGACY_PREFIX:
			return await getLegacyRoomName(env, slug, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
		default:
			return null
	}
}

// Live multiplayer files (`/f/:slug`). Only surface the name for shared files so we don't leak the
// names of private boards into link previews.
async function getTlaFileName(env: Environment, slug: string): Promise<string | null> {
	const db = createPostgresConnectionPool(env, 'getSocialPreview')
	try {
		const file = await db
			.selectFrom('file')
			.select(['name', 'shared'])
			.where('id', '=', slug)
			.executeTakeFirst()
		if (!file || !file.shared) return null
		return cleanName(file.name)
	} finally {
		await db.destroy()
	}
}

// Published files (`/p/:slug`). The published slug maps to a parent file id.
async function getPublishedFileName(env: Environment, slug: string): Promise<string | null> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(slug)
	if (!parentSlug) return null

	const db = createPostgresConnectionPool(env, 'getSocialPreview')
	try {
		const file = await db
			.selectFrom('file')
			.select(['name', 'published'])
			.where('id', '=', parentSlug)
			.executeTakeFirst()
		if (!file || !file.published) return null
		return cleanName(file.name)
	} finally {
		await db.destroy()
	}
}

// Snapshot links (`/s/:slug`). The name lives in the snapshot's document record.
async function getSnapshotName(env: Environment, slug: string): Promise<string | null> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(slug)
	const object = await env.ROOM_SNAPSHOTS.get(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: slug, isApp: false })
	)
	if (!object) return null
	const data = ((await object.json()) as R2Snapshot)?.drawing
	return getDocumentNameFromSnapshot(data)
}

// Legacy multiplayer rooms (`/r/`, `/ro/`, `/v/`). The persisted room snapshot lives in R2 and the
// name is stored on its document record.
async function getLegacyRoomName(
	env: Environment,
	slug: string,
	roomOpenMode: RoomOpenMode
): Promise<string | null> {
	const roomId = await getSlug(env, slug, roomOpenMode)
	if (!roomId) return null
	const object = await env.ROOMS.get(getR2KeyForRoom({ slug: roomId, isApp: false }))
	if (!object) return null
	const data = (await object.json()) as RoomSnapshot
	return getDocumentNameFromSnapshot(data)
}

/**
 * Reads the board name from a room snapshot's `document` record, returning null if there's no
 * usable name.
 */
export function getDocumentNameFromSnapshot(
	snapshot: RoomSnapshot | undefined | null
): string | null {
	if (!snapshot?.documents) return null
	for (const { state } of snapshot.documents) {
		if (state && (state as any).typeName === 'document') {
			return cleanName((state as any).name)
		}
	}
	return null
}

function cleanName(name: string | null | undefined): string | null {
	const trimmed = name?.trim()
	return trimmed ? trimmed : null
}

/**
 * Builds the social preview HTML for a board. When the board has a name we use `<name> •
 * tldraw.com` as the title, otherwise we fall back to `tldraw.com`.
 */
export function renderSocialPreview(name: string | null): string {
	const title = name ? `${name} • tldraw.com` : 'tldraw.com'
	const escapedTitle = escapeHtml(title)
	const description = escapeHtml(SOCIAL_PREVIEW_DESCRIPTION)
	return `<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>${escapedTitle}</title>
		<meta name="description" content="${description}" />
		<meta property="og:type" content="website" />
		<meta property="og:site_name" content="tldraw" />
		<meta property="og:title" content="${escapedTitle}" />
		<meta property="og:description" content="${description}" />
		<meta property="og:image" content="${SOCIAL_PREVIEW_IMAGE}" />
		<meta property="og:image:alt" content="${escapeHtml(SOCIAL_PREVIEW_IMAGE_ALT)}" />
		<meta name="twitter:card" content="summary" />
		<meta name="twitter:title" content="${escapedTitle}" />
		<meta name="twitter:description" content="${description}" />
		<meta name="twitter:image" content="${SOCIAL_PREVIEW_TWITTER_IMAGE}" />
		<meta name="twitter:image:alt" content="${escapeHtml(SOCIAL_PREVIEW_IMAGE_ALT)}" />
		<meta name="twitter:creator" content="@tldraw" />
	</head>
	<body></body>
</html>
`
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function html(body: string): Response {
	return new Response(body, {
		headers: {
			'content-type': 'text/html; charset=utf-8',
			// Allow crawlers and CDNs to cache previews briefly without going stale for long.
			'cache-control': 'public, max-age=120',
		},
	})
}
