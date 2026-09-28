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
let _hasResolvedOnce = false
// Whether `flagsPromise` has settled; stops concurrent callers each starting a refetch.
let settled = false

// Fetched once per page load, not polled: no flag today has to change under a running tab, so a
// flip reaches a tab on its next load. A kill switch would need polling back.
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
 * The flags, refetched when the last request failed or went out without a session (cookie missing
 * or expired before Clerk was ready): percentage and allowlist flags evaluate false without a user.
 * For the signed-in boot in useAppState; everything else reads `getFeatureFlags`, so a signed-out
 * page doesn't send a request per caller.
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

/**
 * Whether the feature flag fetch has settled at least once (either
 * successfully or by falling back to defaults). Used by the A/B hook to
 * decide whether the values returned by `getCurrentFlags()` are meaningful
 * yet, or whether we should wait.
 */
export function hasResolvedFlagsOnce(): boolean {
	return _hasResolvedOnce
}
