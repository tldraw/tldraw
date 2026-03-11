/**
 * Minimal user info that tldraw needs for identity features
 * (attribution labels, presence, display names).
 *
 * @public
 */
export interface TLIdentityUser {
	/** Stable user ID from your auth system. */
	readonly id: string
	/** Display name shown in attribution labels and presence cursors. */
	readonly name: string
	/** Presence / cursor color. If omitted a random color is used. */
	readonly color?: string
}

/**
 * Connects tldraw to your authentication system.
 *
 * Implement this interface to provide a single source of truth for
 * "who is the current user?" and "who is user X?". The editor uses it
 * for shape attribution (`meta.__tldraw`), display-name resolution, and
 * (in the future) presence.
 *
 * @example
 * ```ts
 * const identity: TLIdentityProvider = {
 *   getCurrentUser: () => ({ id: myAuth.userId, name: myAuth.displayName }),
 *   resolveUser: (id) => myUserCache.get(id) ?? null,
 * }
 *
 * <Tldraw identity={identity} />
 * ```
 *
 * @public
 */
export interface TLIdentityProvider {
	/**
	 * Return the currently authenticated user, or null for anonymous / unknown.
	 * Called when stamping `meta.__tldraw` on shape create/update.
	 */
	getCurrentUser(): TLIdentityUser | null

	/**
	 * Resolve an arbitrary user ID to display info.
	 * Called when rendering attribution labels for shapes that may have been
	 * created or edited by someone else.
	 * Return null if the user cannot be resolved.
	 */
	resolveUser(userId: string): TLIdentityUser | null
}
