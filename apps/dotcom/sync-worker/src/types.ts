// https://developers.cloudflare.com/analytics/analytics-engine/

import { Queue } from '@cloudflare/workers-types'
import { RoomSnapshot } from '@tldraw/sync-core'
import type { TLFileDurableObject } from './TLFileDurableObject'
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
	// Rate limit bindings for the Browser Run-backed MCP screenshot tool, declared in
	// wrangler.toml. MCP_SCREENSHOT_RATE_LIMITER guards per-IP and per-board request rates;
	// MCP_SCREENSHOT_BROWSER_RATE_LIMITER caps total Browser Run invocations across all callers.
	// The route falls back to an isolate-local guard when the bindings are absent (local dev,
	// tests).
	MCP_SCREENSHOT_RATE_LIMITER: RateLimit | undefined
	MCP_SCREENSHOT_BROWSER_RATE_LIMITER: RateLimit | undefined

	QUEUE: Queue<QueueMessage>

	// R2 cache for generated thumbnails, keyed on board identity, published version, and theme.
	// Optional so tests and unconfigured environments degrade to cacheless rendering.
	THUMBNAILS: R2Bucket | undefined

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

export type TLServerEvent =
	| {
			type: 'client'
			name: 'room_create' | 'room_reopen' | 'enter' | 'leave' | 'last_out'
			roomId: string
			instanceId: string
			localClientId: string
	  }
	| {
			type: 'client'
			name: 'rate_limited'
			userId: string | undefined
			localClientId: string
	  }
	| {
			type: 'room'
			name:
				| 'failed_load_from_db'
				| 'failed_persist_to_db'
				| 'room_empty'
				| 'fail_persist'
				| 'room_start'
			roomId: string
	  }
	| {
			type: 'send_message'
			roomId: string
			messageType: string
			messageLength: number
	  }
	| {
			type: 'persist_success'
			attempts: number
			/** How long the successful attempt took; retries show up in `attempts`, not here. */
			durationMs: number
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

// Asks the queue consumer to render a board's OG image through Browser Run and refresh the R2
// cache read by GET /app/social-preview/:prefix/:slug/image. Board state (share gate, content
// version) is deliberately not carried in the message; the consumer re-resolves it at render time.
export interface OgImageRenderQueueMessage {
	type: 'og-image-render'
	kind: 'published' | 'shared_file'
	slug: string
	// How many times this job has been re-enqueued because the shared global Browser Run cap was busy
	// (see requeueForRateLimit). Bounds the rate-limit backoff loop: each rate-limited delivery still
	// spends one slot of the shared limiter just to discover it can't render, so an unbounded requeue
	// chain would let the OG queue's own capacity checks saturate the limiter and starve every render
	// surface. Absent on the initial enqueue.
	rateLimitRequeues?: number
}

export type QueueMessage = AssetUploadQueueMessage | OgImageRenderQueueMessage
