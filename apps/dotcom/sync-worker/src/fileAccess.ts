import { TLObjectStoreAccess } from '@tldraw/sync-core'

/** Inputs needed to decide what a connecting session may do with a file. */
export interface FileAccessInput {
	/** The file's `sharedLinkType`. A plain string column, so treat anything but `edit` as view-only. */
	sharedLinkType: string
	/** True if the session owns the file directly or via its owning group. */
	hasOwnerAccess: boolean
	/** True if the session belongs to a signed-in user. */
	isAuthenticated: boolean
}

/** The per-session access a file grants, split across the two sync lanes. */
export interface FileAccess {
	/** Canvas (document-lane) read-only flag. */
	isReadonly: boolean
	/** Comment (object-lane) write access, independent of `isReadonly`. */
	objectAccess: TLObjectStoreAccess
}

/**
 * Decide a connecting session's access to a shared file. Callers must reject sessions that
 * can neither own nor access a shared file *before* calling this (this maps an allowed
 * session to its two lanes).
 *
 * Tiers:
 * - `edit` — full canvas write + comments.
 * - anything else (`view`, plus legacy values) — read-only canvas, no comments.
 *
 * Owners/group members always get full access. Commenting additionally requires an
 * authenticated author, because comment authors are persisted in Postgres with a foreign
 * key to the user table, so an anonymous author can't be represented.
 *
 * A third `comment` tier — read-only canvas but comments allowed — is wired up but not shipped;
 * see the commented-out lines here and in `TlaInviteTab` to turn it on.
 */
export function computeFileAccess({
	sharedLinkType,
	hasOwnerAccess,
	isAuthenticated,
}: FileAccessInput): FileAccess {
	if (hasOwnerAccess) {
		return { isReadonly: false, objectAccess: 'write' }
	}

	// Non-owner guests: only `edit` links grant canvas write.
	const isReadonly = sharedLinkType !== 'edit'
	// `edit` links grant comment write, but only to a signed-in author.
	const canComment = isAuthenticated && sharedLinkType === 'edit'
	// Comment-only mode: `comment` links grant comment write on a read-only canvas.
	// const canComment = isAuthenticated && (sharedLinkType === 'edit' || sharedLinkType === 'comment')

	return { isReadonly, objectAccess: canComment ? 'write' : 'read' }
}
