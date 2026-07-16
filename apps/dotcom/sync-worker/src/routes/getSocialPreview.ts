import {
	FILE_PREFIX,
	PUBLISH_PREFIX,
	READ_ONLY_LEGACY_PREFIX,
	READ_ONLY_PREFIX,
	ROOM_OPEN_MODE,
	ROOM_PREFIX,
	RoomOpenMode,
	SNAPSHOT_PREFIX,
	SOCIAL_PREVIEW_BYPASS_PARAM,
} from '@tldraw/dotcom-shared'
import { RoomSnapshot } from '@tldraw/sync-core'
import { IRequest } from 'itty-router'
import { createPostgresConnectionPool } from '../postgres'
import { getR2KeyForRoom, getR2KeyForSnapshot } from '../r2'
import { Environment } from '../types'
import { createSupabaseClient } from '../utils/createSupabaseClient'
import { getSnapshotsTable } from '../utils/getSnapshotsTable'
import { getSlug } from '../utils/roomOpenMode'
import { R2Snapshot } from './createRoomSnapshot'
import { getPublicOrigin } from './tla/getOgImage'
import { getPublishedRoomSnapshot } from './tla/getPublishedFile'
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from './tla/ogImageQueue'

// These mirror the static social preview metadata in apps/dotcom/client/index.html. They are used
// as fallbacks so that bot-rendered previews stay consistent with the rest of the site.
const SOCIAL_PREVIEW_DESCRIPTION = 'A free and instant collaborative whiteboarding tool.'
const SOCIAL_PREVIEW_IMAGE = 'https://www.tldraw.com/social-og.png'
const SOCIAL_PREVIEW_IMAGE_ALT = 'A collaborative whiteboarding tool interface'
const SOCIAL_PREVIEW_TWITTER_IMAGE = 'https://www.tldraw.com/social-twitter.png'

/** Formats the preview title for a board: `<name> • tldraw.com`, or `tldraw.com` when unnamed. */
function formatSocialTitle(name: string | null): string {
	return name ? `${name} • tldraw.com` : 'tldraw.com'
}

/**
 * Serves a minimal HTML document with social preview (Open Graph / Twitter card) metadata for a
 * board. Social crawlers (Slack, Discord, Twitter, Facebook, etc.) don't run JavaScript, so the
 * single-page app's runtime title updates never reach them. Instead, Vercel routes those crawlers
 * here based on their user-agent, and we render the board's name into the preview title. tldraw's
 * own link-unfurl bot is routed here the same way, so pasting a board link into a tldraw canvas
 * picks the name up from this page's metadata too.
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

	return html(renderSocialPreview(name, getBoardOgImageUrl(request, env, prefix, slug)))
}

// Board kinds the og-image route can render (shared files and published boards) get a live
// board thumbnail as their preview image. The route self-gates: private, deleted, or unknown
// boards 302 to the default OG image, so it is safe to reference unconditionally, and the first
// crawler hit enqueues the board's render.
function getBoardOgImageUrl(
	request: IRequest,
	env: Environment,
	prefix: string,
	slug: string
): string | null {
	if (prefix !== FILE_PREFIX && prefix !== PUBLISH_PREFIX) return null
	return `${getPublicOrigin(request, env)}/api/app/og-image/${prefix}/${encodeURIComponent(slug)}`
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
	let file
	try {
		file = await db
			.selectFrom('file')
			.select(['name', 'shared'])
			.where('id', '=', slug)
			.executeTakeFirst()
	} finally {
		await db.destroy()
	}
	if (!file || !file.shared) return null

	const name = cleanName(file.name)
	if (name) return name

	// The file has no name set, so fall back to the editor document name — this matches the in-app
	// title, which uses the file name and then the document name. It lives on the document record in
	// the file's persisted room snapshot.
	const object = await env.ROOMS.get(getR2KeyForRoom({ slug, isApp: true }))
	if (!object) return null
	return getDocumentNameFromSnapshot((await object.json()) as RoomSnapshot)
}

// Published files (`/p/:slug`). The published page serves a frozen snapshot from R2, and that's what
// viewers see, so we take the name from the snapshot's document record rather than the live
// `file.name` (which can differ after a rename without republish). getPublishedRoomSnapshot also
// enforces that the file is actually published.
async function getPublishedFileName(env: Environment, slug: string): Promise<string | null> {
	const snapshot = await getPublishedRoomSnapshot(env, slug)
	return getDocumentNameFromSnapshot(snapshot)
}

// Snapshot links (`/s/:slug`). The name lives in the snapshot's document record. Mirrors
// getRoomSnapshot: read from R2 first, then fall back to Supabase for older snapshots.
async function getSnapshotName(env: Environment, slug: string): Promise<string | null> {
	const parentSlug = await env.SNAPSHOT_SLUG_TO_PARENT_SLUG.get(slug)
	const object = await env.ROOM_SNAPSHOTS.get(
		getR2KeyForSnapshot({ parentSlug, snapshotSlug: slug, isApp: false })
	)
	if (object) {
		const data = ((await object.json()) as R2Snapshot)?.drawing
		if (data) return getDocumentNameFromSnapshot(data)
	}

	const supabase = createSupabaseClient(env)
	if (!supabase) return null
	const result = await supabase
		.from(getSnapshotsTable(env))
		.select('drawing')
		.eq('slug', slug)
		.maybeSingle()
	return getDocumentNameFromSnapshot(result.data?.drawing as RoomSnapshot | undefined)
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
 * tldraw.com` as the title, otherwise we fall back to `tldraw.com`. When the board kind supports
 * rendered OG images (`boardImageUrl` is set) the preview uses the board's own thumbnail with a
 * large image card; otherwise it keeps the static site-wide images.
 *
 * The body redirects to the board with the bypass param set: some in-app browsers used by real
 * people carry a crawler token in their user-agent (WhatsApp, Pinterest), so they land here too.
 * The crawlers we target don't run JavaScript, so they only see the metadata; humans get bounced
 * straight back to the board. Deliberately a script rather than a meta refresh — several crawlers
 * follow meta refresh redirects without running JavaScript, which would send them to the app shell
 * and lose the board name.
 */
export function renderSocialPreview(
	name: string | null,
	boardImageUrl: string | null = null
): string {
	const escapedTitle = escapeHtml(formatSocialTitle(name))
	const description = escapeHtml(SOCIAL_PREVIEW_DESCRIPTION)
	const ogImage = escapeHtml(boardImageUrl ?? SOCIAL_PREVIEW_IMAGE)
	const twitterImage = escapeHtml(boardImageUrl ?? SOCIAL_PREVIEW_TWITTER_IMAGE)
	const twitterCard = boardImageUrl ? 'summary_large_image' : 'summary'
	const ogImageDimensions = boardImageUrl
		? `
		<meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
		<meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />`
		: ''
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
		<meta property="og:image" content="${ogImage}" />${ogImageDimensions}
		<meta property="og:image:alt" content="${escapeHtml(SOCIAL_PREVIEW_IMAGE_ALT)}" />
		<meta name="twitter:card" content="${twitterCard}" />
		<meta name="twitter:title" content="${escapedTitle}" />
		<meta name="twitter:description" content="${description}" />
		<meta name="twitter:image" content="${twitterImage}" />
		<meta name="twitter:image:alt" content="${escapeHtml(SOCIAL_PREVIEW_IMAGE_ALT)}" />
		<meta name="twitter:creator" content="@tldraw" />
	</head>
	<body>
		<a href="?${SOCIAL_PREVIEW_BYPASS_PARAM}=1">Open this board</a>
		<script>
			var url = new URL(location.href)
			// only redirect if the bypass param isn't already set, so a routing misconfiguration
			// can't reload this page forever.
			if (!url.searchParams.get(${JSON.stringify(SOCIAL_PREVIEW_BYPASS_PARAM)})) {
				// the '1' is load-bearing: an empty value reads as "param absent" to Vercel's
				// missing-matching and the redirect would loop. See SOCIAL_PREVIEW_BYPASS_PARAM.
				url.searchParams.set(${JSON.stringify(SOCIAL_PREVIEW_BYPASS_PARAM)}, '1')
				location.replace(url)
			}
		</script>
	</body>
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
			// Allow crawlers to cache previews briefly. This means a board's name can be served for
			// up to two minutes after it's unshared — accepted, because crawler-side preview caches
			// (Facebook, Slack, Discord) independently retain unfurled names for days regardless of
			// this header, so shortening it buys no real privacy. Vercel's edge does not cache these
			// responses (plain max-age without s-maxage passes through), so this only affects the
			// requesting client's own cache.
			'cache-control': 'public, max-age=120',
		},
	})
}
