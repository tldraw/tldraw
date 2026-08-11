// https://developers.cloudflare.com/analytics/analytics-engine/

import { Queue } from '@cloudflare/workers-types'
import { RoomSnapshot } from '@tldraw/sync-core'
import type { TLFileDurableObject } from './TLFileDurableObject'
import type { TLFileEffectProcessor } from './TLFileEffectProcessor'
import type { TLLoggerDurableObject } from './TLLoggerDurableObject'
import type { TLPostgresReplicator } from './TLPostgresReplicator'
import { TLStatsDurableObject } from './TLStatsDurableObject'
import type { TLUserDurableObject } from './TLUserDurableObject'

// The Browser Rendering binding's Quick Actions method. Cloudflare exposes `env.BROWSER.quickAction`
// so a Worker can call the Quick Actions endpoints (`screenshot`, `pdf`, …) straight through the
// binding — no API token, no @cloudflare/puppeteer. Requires compatibility_date >= 2026-03-24. Not
// in @cloudflare/workers-types yet, so the small surface we use is declared here; it resolves to a
// standard `Response` (PNG bytes for `screenshot`, with an `X-Browser-Ms-Used` header).
export interface BrowserBinding {
	quickAction(action: 'screenshot', options: unknown): Promise<Response>
}

// This type isn't available in @cloudflare/workers-types yet
export interface Analytics {
	writeDataPoint(data: {
		blobs?: string[]
		doubles?: number[]
		indexes?: [string] // only one here
	}): void
}

export interface Environment {
	// bindings
	TLDR_DOC: DurableObjectNamespace<TLFileDurableObject>
	TL_PG_REPLICATOR: DurableObjectNamespace<TLPostgresReplicator>
	TL_USER: DurableObjectNamespace<TLUserDurableObject>
	TL_FILE_EFFECTS: DurableObjectNamespace<TLFileEffectProcessor>
	TL_LOGGER: DurableObjectNamespace<TLLoggerDurableObject>
	TL_STATS: DurableObjectNamespace<TLStatsDurableObject>

	BOTCOM_POSTGRES_CONNECTION_STRING: string
	BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: string

	DISCORD_FEEDBACK_WEBHOOK_URL?: string
	PLAIN_API_KEY?: string
	PLAIN_LABEL_TYPE_ID?: string
	PLAIN_WORKSPACE_ID?: string

	MEASURE: Analytics | undefined

	ROOMS: R2Bucket
	ROOMS_HISTORY_EPHEMERAL: R2Bucket

	ROOM_SNAPSHOTS: R2Bucket
	SNAPSHOT_SLUG_TO_PARENT_SLUG: KVNamespace

	UPLOADS: R2Bucket
	USER_DO_SNAPSHOTS: R2Bucket

	SLUG_TO_READONLY_SLUG: KVNamespace
	READONLY_SLUG_TO_SLUG: KVNamespace

	FEATURE_FLAGS: KVNamespace

	CF_VERSION_METADATA: WorkerVersionMetadata

	// env vars
	SUPABASE_URL: string | undefined
	SUPABASE_KEY: string | undefined

	CLERK_SECRET_KEY: string | undefined
	CLERK_PUBLISHABLE_KEY: string | undefined

	TLDRAW_ENV: string | undefined
	SENTRY_DSN: string | undefined
	SENTRY_CSP_REPORT_URI: string | undefined
	IS_LOCAL: string | undefined
	WORKER_NAME: string | undefined
	ASSET_UPLOAD_ORIGIN: string | undefined
	USER_CONTENT_URL: string | undefined
	MULTIPLAYER_SERVER: string | undefined

	HEALTH_CHECK_BEARER_TOKEN: string | undefined
	HEALTH_CHECK_DB_SIZE_THRESHOLD_GB: string | undefined
	HEALTH_CHECK_CHANGELOG_SIZE_THRESHOLD_MB: string | undefined
	HEALTH_CHECK_WAL_SIZE_THRESHOLD_MB: string | undefined

	ANALYTICS_API_URL: string | undefined
	ANALYTICS_API_TOKEN: string | undefined

	PIERRE_KEY: string | undefined

	RATE_LIMITER: RateLimit
	// Rate limit bindings for the Browser Run-backed MCP screenshot tool, declared in wrangler.toml.
	// All three bound what an agent calling the public MCP endpoint can spend; board thumbnail
	// rendering is subject to none of them. Separate bindings because a binding carries one `limit`
	// applied per key, so budgets with different numbers cannot share one. The route falls back to an
	// isolate-local guard when they are absent (local dev, tests).
	/** Per-IP `get_shared_board_screenshot` calls. */
	MCP_SCREENSHOT_RATE_LIMITER: RateLimit | undefined
	/** Per-board Browser Run captures, applied only on cache misses. */
	MCP_SERVER_BOARD_RATE_LIMITER: RateLimit | undefined
	/** Total Browser Run invocations made by the tool, on one shared key. */
	MCP_SERVER_BROWSER_RATE_LIMITER: RateLimit | undefined

	QUEUE: Queue<QueueMessage>

	// R2 cache for board OG images (`og/…` keys), their pending-render markers and render token
	// records. None of those keys carry a version, so a board costs one object per key however often it
	// re-renders, nothing accumulates, and the bucket must have NO expiration rule — the current
	// thumbnail has to outlive any lifecycle window.
	// Optional so tests and unconfigured environments degrade to cacheless rendering.
	THUMBNAILS: R2Bucket | undefined

	// R2 storage for MCP tool output (`mcp/…` keys, screenshots today). Its own bucket rather than a
	// prefix inside THUMBNAILS because these keys include the board's content version, so the set grows
	// without bound and needs the expiration rule that would be actively wrong on THUMBNAILS. See "Why
	// two buckets" in browser-run-thumbnails.md.
	// Optional on the same terms as THUMBNAILS.
	MCP_DATA_BUCKET: R2Bucket | undefined

	// Cloudflare Browser Rendering binding. The worker takes thumbnails by calling the binding's
	// `quickAction` Quick Actions method (e.g. `screenshot`) directly — no @cloudflare/puppeteer and
	// no API token. Chrome runs in Cloudflare's fleet, not in this isolate. The dev binding is
	// deliberately NOT marked `remote` (that would make plain `wrangler dev` require a
	// CLOUDFLARE_API_TOKEN, breaking the credential-free e2e stack), so under `wrangler dev` it is a
	// non-functional local binding and the render path fails closed; real local captures need
	// `wrangler dev --remote` with credentials or a preview deploy. Undefined in tests.
	BROWSER: BrowserBinding | undefined
	// Kill switch for the MCP screenshot server (POST /app/mcp). Absent means enabled, so an
	// environment that never configured it behaves as it did before the flag existed. Anything other
	// than 'true' turns the endpoint off, so a typo fails in the safe direction. Editing this var in
	// the Cloudflare dashboard takes the server down without a rebuild or a code deploy — but the
	// next deploy restores the wrangler.toml value, so follow an emergency flip with a config change.
	MCP_SCREENSHOT_ENABLED: string | undefined
	// Origin serving the client thumbnail render page (THUMBNAIL_RENDER_PATH). Set per
	// environment in wrangler.toml.
	MCP_SCREENSHOT_RENDER_ORIGIN: string | undefined
	// HMAC secret for short-lived thumbnail render job tokens.
	MCP_SCREENSHOT_TOKEN_SECRET: string | undefined
	// HMAC secret for server-authored comment grants. Unset disables the endpoint outright, since
	// verification fails closed.
	SERVER_COMMENT_TOKEN_SECRET: string | undefined
	// Development only: a local HTTP screenshot service to use instead of the BROWSER binding, which
	// cannot reach Browser Run in local dev. Set in [env.dev.vars] to the client dev server's
	// screenshot endpoint; unset everywhere else, which is what keeps deployed environments on
	// Browser Run.
	LOCAL_SCREENSHOT_SERVICE_URL: string | undefined
}

export function isDebugLogging(env: Environment) {
	return env.TLDRAW_ENV === 'development' || env.TLDRAW_ENV === 'preview'
}

export function getUserDoSnapshotKey(env: Environment, userId: string) {
	const snapshotPrefix = env.TLDRAW_ENV === 'preview' ? env.WORKER_NAME + '/' : ''
	return `${snapshotPrefix}${userId}`
}

export interface DBLoadResult {
	snapshot: RoomSnapshot
	roomSizeMB: number
}

// Events written by TLFileDurableObject. None of them carry a room id: the object serves exactly
// one room, and its `writeEvent` indexes every data point on that object's durable object id. A
// roomId here would only ever restate what the object already knows, while implying call sites can
// attribute an event to some other room.
export type TLServerEvent =
	| {
			type: 'client'
			name: 'room_create' | 'room_reopen' | 'enter' | 'leave' | 'last_out'
			instanceId: string
	  }
	| {
			type: 'client'
			name: 'rate_limited'
			userId: string | undefined
	  }
	| {
			type: 'room'
			name:
				| 'failed_load_from_db'
				| 'failed_persist_to_db'
				| 'failed_persist_comments_to_db'
				| 'comment_author_deleted_prune'
				| 'comment_thread_emptied_prune'
				| 'comment_soft_delete_prune'
				| 'comment_reaction_orphan_prune'
				| 'room_empty'
				| 'fail_persist'
				| 'room_start'
	  }
	| {
			type: 'send_message'
			messageType: string
			messageLength: number
	  }
	| {
			type: 'persist_success'
			attempts: number
			/**
			 * Whether this board is link-shared. The shared fraction of *actively edited* boards is what
			 * sizes thumbnail spend, and nothing else can answer it: Postgres knows which files are shared
			 * but not which are being edited, and this event's index is one-way, so the dataset cannot be
			 * joined back to a file row.
			 *
			 * `unknown` is an app file whose record has not loaded yet; `legacy` a non-app room, which has
			 * no shareable board identity; `deleted` an app file whose record has been deleted. All three
			 * stay distinct from `private` so the denominator is honest, and all are computed by
			 * `getBoardRenderState`, which is also what gates the render.
			 */
			sharedState: 'shared' | 'private' | 'unknown' | 'legacy' | 'deleted'
	  }

export type TLPostgresReplicatorRebootSource =
	| 'constructor'
	| 'inactivity'
	| 'retry'
	| 'subscription_closed'
	| 'test'

export type TLPostgresReplicatorEvent =
	| { type: 'reboot'; source: TLPostgresReplicatorRebootSource }
	| { type: 'request_lsn_update' }
	| {
			type:
				| 'reboot_error'
				| 'register_user'
				| 'unregister_user'
				| 'get_file_record'
				| 'prune'
				| 'resume_sequence'
	  }
	| { type: 'reboot_duration'; duration: number }
	| { type: 'rpm'; rpm: number }
	| { type: 'active_users'; count: number }

export type TLUserDurableObjectEvent =
	| {
			type:
				| 'reboot'
				| 'full_data_fetch'
				| 'full_data_fetch_hard'
				| 'found_snapshot'
				| 'reboot_error'
				| 'rate_limited'
				| 'broadcast_message'
				| 'mutation'
				| 'reject_mutation'
				| 'replication_event'
				| 'connect_retry'
				| 'user_do_abort'
				| 'not_enough_history_for_fast_reboot'
				| 'woken_up_by_replication_event'
			id: string
	  }
	| { type: 'reboot_duration'; id: string; duration: number }
	| { type: 'cold_start_time'; id: string; duration: number }

export interface AssetUploadQueueMessage {
	type: 'asset-upload'
	objectName: string
	fileId: string
	userId: string | null
}

/**
 * The two kinds of publicly viewable board the thumbnail/OG screenshot surfaces render:
 * `published` is a frozen tldraw.com/p/:slug snapshot; `shared_file` is the live snapshot of an
 * anonymously-shared tldraw.com/f/:slug file.
 */
export type ThumbnailBoardKind = 'published' | 'shared_file'

/**
 * Which board, in which namespace. Everything that keys, enqueues, or cleans up a thumbnail takes
 * this and nothing more — the pair is what a cache key is built from, so a function that took only a
 * slug could silently address the wrong board's image.
 */
export interface ThumbnailBoardRef {
	kind: ThumbnailBoardKind
	slug: string
}

/**
 * How much of a board a caller is entitled to. `public` is the anonymous gate: the board must be
 * shared via link. `render` is for generating a thumbnail we will store but not necessarily serve
 * publicly, so it only requires that the board exists and has content.
 *
 * Required at every call site rather than defaulted: a default would be wrong for half of them, and
 * silence is the wrong way to pick a gate. It also rides inside the signed render job, so the gate a
 * board was resolved under is the same one the snapshot route applies when it is read.
 */
export type ThumbnailBoardAccess = 'public' | 'render'

// What prompted a board thumbnail render. Purely telemetry — every trigger is treated identically by
// the consumer — so renders can be attributed to the thing that asked for them. `publish` and `edit`
// are the two producers; `crawler` is reachable only as the fallback for a queued message that
// carries no reason of its own.
export type OgImageRenderReason = 'crawler' | 'publish' | 'edit'

// Asks the queue consumer to render a board's OG image through Browser Run and refresh the R2
// cache read by GET /app/social-preview/:prefix/:slug/image. Board state (share gate, content
// version) is deliberately not carried in the message; the consumer re-resolves it at render time.
export interface OgImageRenderQueueMessage {
	type: 'og-image-render'
	kind: ThumbnailBoardKind
	slug: string
	// Optional only because a message may already be in the queue without one; every producer sets it.
	reason?: OgImageRenderReason
	/**
	 * Set on a job the consumer enqueued for itself, having found the board changed while it was
	 * capturing. A follow-up never spawns another: a board edited without pause would otherwise render
	 * continuously instead of at the debounce's cadence.
	 */
	followUp?: boolean
}

export type QueueMessage = AssetUploadQueueMessage | OgImageRenderQueueMessage
