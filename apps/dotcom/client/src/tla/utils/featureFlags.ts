import { EvaluatedFeatureFlag, FeatureFlagKey } from '@tldraw/dotcom-shared'
import { fetch } from 'tldraw'

export type FeatureFlags = Record<FeatureFlagKey, EvaluatedFeatureFlag>

export const DEFAULT_FLAGS: FeatureFlags = {
	rum_enabled: { enabled: false },
	load_rum: { enabled: false },
	// Nothing in the client reads this one — it gates the MCP server, which is enforced worker-side
	// for callers that are not this app. It rides along because the flags endpoint returns every flag;
	// a client-side check would not be a check at all, since the callers are Claude and ChatGPT.
	mcp_server_access: { enabled: false },
	// Server-side only: the sync worker evaluates this per room to pick the version write mode. The
	// per-user value here means nothing to the client.
	version_chain: { enabled: false },
}

let currentFlags: FeatureFlags = { ...DEFAULT_FLAGS }
let _wasAuthenticated = false
let _hasResolvedOnce = false
// Whether `flagsPromise` has settled; stops concurrent callers each starting a refetch.
let settled = false
let lastLoadFailed = false
let retryScheduled = false

// One retry per page, so a failed page-load fetch doesn't leave defaults in place until reload.
const RETRY_DELAY_MS = 30_000

// Not polled: a flip reaches a tab on its next load, so no flag here can act as a live kill switch.
let flagsPromise = loadFlags()

function loadFlags(): Promise<FeatureFlags> {
	settled = false
	return (async () => {
		try {
			const r = await fetch('/api/app/feature-flags')
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			_wasAuthenticated = r.headers.get('x-authenticated') === '1'
			currentFlags = (await r.json()) as FeatureFlags
			_hasResolvedOnce = true
			lastLoadFailed = false
		} catch (err) {
			console.error('[FeatureFlags] fetch failed:', err)
			_wasAuthenticated = false
			currentFlags = { ...DEFAULT_FLAGS }
			lastLoadFailed = true
			scheduleRetry()
		}
		settled = true
		return currentFlags
	})()
}

function scheduleRetry() {
	if (retryScheduled) return
	retryScheduled = true
	setTimeout(() => {
		if (settled && lastLoadFailed) flagsPromise = loadFlags()
	}, RETRY_DELAY_MS)
}

/** The latest flags. Never starts a fetch. */
export function getFeatureFlags(): Promise<FeatureFlags> {
	return flagsPromise
}

/**
 * Refetches when the last request failed or had no session: the Clerk cookie wasn't ready yet, or
 * the user signed in without a reload (email code). Signed-in boot only, so signed-out pages don't
 * send a request per caller. An account switch with no signed-out fetch in between keeps the old
 * account's flags until the next load; the client only reads telemetry flags, so that's accepted.
 */
export function fetchFeatureFlags(): Promise<FeatureFlags> {
	if (settled && !_wasAuthenticated) flagsPromise = loadFlags()
	return flagsPromise
}

export function wasAuthenticated(): boolean {
	return _wasAuthenticated
}

export function getCurrentFlags(): FeatureFlags {
	return currentFlags
}

/** Whether a flag fetch has succeeded, i.e. `getCurrentFlags()` holds real values, not defaults. */
export function hasResolvedFlagsOnce(): boolean {
	return _hasResolvedOnce
}
