export const MAX_NUMBER_OF_FILES = 200
export const MAX_NUMBER_OF_WORKSPACES = 20

export const ROOM_SIZE_LIMIT_MB = 25

/**
 * `createSource` value for a new workspace's first file. The sync worker resolves it to the
 * current welcome template's published snapshot (or a committed default if none is set),
 * forking that content into the new file. Unlike the other `createSource` prefixes this is a
 * fixed marker with no id — the worker decides which file is the welcome template — so the
 * client never needs to know the template's slug and an admin can retarget it without a
 * client change.
 */
export const WELCOME_CREATE_SOURCE = 'welcome'

/**
 * Build the welcome `createSource`, optionally tagged with the creating user's locale (e.g.
 * `welcome:fr`) so the sync worker can seed localized content. See {@link parseWelcomeCreateSource}.
 */
export function welcomeCreateSource(locale?: string): string {
	return locale ? `${WELCOME_CREATE_SOURCE}:${locale}` : WELCOME_CREATE_SOURCE
}

/**
 * Parse a `createSource`: returns `{ locale }` (locale possibly undefined) when it's a welcome
 * marker, or `null` when it isn't. The locale is whatever the client tagged at creation time.
 */
export function parseWelcomeCreateSource(
	createSource: string | null | undefined
): { locale: string | undefined } | null {
	if (!createSource) return null
	if (createSource === WELCOME_CREATE_SOURCE) return { locale: undefined }
	const prefix = `${WELCOME_CREATE_SOURCE}:`
	if (createSource.startsWith(prefix)) {
		return { locale: createSource.slice(prefix.length) || undefined }
	}
	return null
}
