export const MAX_NUMBER_OF_FILES = 200
export const MAX_NUMBER_OF_WORKSPACES = 20
export const MAX_WORKSPACE_NAME_LENGTH = 100

export const ROOM_SIZE_LIMIT_MB = 25

/**
 * `createSource` marker for a new workspace's first file. The sync worker resolves it to the
 * committed default welcome snapshot, forking that content into the new file. Unlike the other
 * `createSource` prefixes this carries no id — the worker owns the welcome content — and is
 * optionally tagged with the creator's locale (`welcome:fr`) so the worker can seed the
 * localized variant baked at build time. See {@link welcomeCreateSource}.
 */
export const WELCOME_CREATE_SOURCE = 'welcome'

/**
 * Build the welcome `createSource`, tagged with the creating user's locale (e.g. `welcome:fr`) so
 * the sync worker seeds localized welcome content. Untagged (`welcome`) when no locale is known.
 * See {@link parseWelcomeCreateSource}.
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
