export interface RootRedirectInput {
	/** Path stashed in session storage by the OAuth sign-in flow. */
	redirectTo: string | null
	/** `location.state.importUrl` from the `/import?url=` route. */
	hasPendingImport: boolean
	/** The scratch board has content the app must slurp into a new file. */
	shouldSlurp: boolean
	/** Last file this browser synced to for the signed-in account. */
	cachedFileId: string | null
}

export type RootRedirect =
	| { kind: 'redirect-to'; to: string }
	| { kind: 'cached-file'; fileId: string }
	| { kind: 'wait-for-app' }

/**
 * Where a signed-in `/` load should go before Zero has resolved. Anything that needs the app
 * (imports, slurping, the Zero-derived most recent file) waits; the cache only wins when nothing
 * else is pending, so it never preempts a file the user is mid-way through creating.
 */
export function resolveRootRedirect(input: RootRedirectInput): RootRedirect {
	if (input.redirectTo?.startsWith('/')) return { kind: 'redirect-to', to: input.redirectTo }
	if (input.hasPendingImport || input.shouldSlurp) return { kind: 'wait-for-app' }
	if (input.cachedFileId) return { kind: 'cached-file', fileId: input.cachedFileId }
	return { kind: 'wait-for-app' }
}
