import { EvaluatedFeatureFlag, FeatureFlagKey } from '@tldraw/dotcom-shared'
import { fetch } from 'tldraw'

export type FeatureFlags = Record<FeatureFlagKey, EvaluatedFeatureFlag>

export const DEFAULT_FLAGS: FeatureFlags = {
	rum_enabled: { enabled: false },
	first_load_rum: { enabled: false },
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
// Whose flags the last authenticated response holds, so an account switch without a reload refetches.
let flagsUserId: string | null = null
let _hasResolvedOnce = false
// Whether `flagsPromise` has settled; stops concurrent callers each starting a refetch.
let settled = false

// Fetched once per page load, not polled: a flip reaches a tab on its next load, so no flag here
// can act as a live kill switch.
let flagsPromise = loadFlags()

function loadFlags(): Promise<FeatureFlags> {
	settled = false
	return (async () => {
		try {
			const r = await fetch('/api/app/feature-flags')
			if (!r.ok) throw new Error(`HTTP ${r.status}`)
			_wasAuthenticated = r.headers.get('x-authenticated') === '1'
			currentFlags = (await r.json()) as FeatureFlags
		} catch (err) {
			console.error('[FeatureFlags] fetch failed:', err)
			_wasAuthenticated = false
			currentFlags = { ...DEFAULT_FLAGS }
		}
		_hasResolvedOnce = true
		settled = true
		return currentFlags
	})()
}

/** This page load's flags. Never refetches. */
export function getFeatureFlags(): Promise<FeatureFlags> {
	return flagsPromise
}

/**
 * `userId`'s flags, refetched when the last request failed, had no session (Clerk cookie not ready
 * yet) or was for another account. Signed-in boot only, so signed-out pages don't send a request per
 * caller.
 */
export function fetchFeatureFlags(userId: string): Promise<FeatureFlags> {
	const otherUser = flagsUserId !== null && flagsUserId !== userId
	if (settled && (!_wasAuthenticated || otherUser)) flagsPromise = loadFlags()
	flagsUserId = userId
	return flagsPromise
}

export function wasAuthenticated(): boolean {
	return _wasAuthenticated
}

export function getCurrentFlags(): FeatureFlags {
	return currentFlags
}

/**
 * Whether the feature flag fetch has settled at least once (either
 * successfully or by falling back to defaults). Used by the A/B hook to
 * decide whether the values returned by `getCurrentFlags()` are meaningful
 * yet, or whether we should wait.
 */
export function hasResolvedFlagsOnce(): boolean {
	return _hasResolvedOnce
}
