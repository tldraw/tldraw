import { TlaFileSharedLinkType } from '@tldraw/dotcom-shared'
import { TLObjectStoreAccess } from '@tldraw/sync-core'

/** Inputs needed to decide what a connecting session may do with a file. */
export interface FileAccessInput {
	/** The file's `sharedLinkType` tier (`edit` | `comment` | `view`). */
	sharedLinkType: TlaFileSharedLinkType | string
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
 * - `comment` — read-only canvas, but comments allowed.
 * - `view` — read-only canvas, no comments.
 *
 * Owners/group members always get full access. Commenting additionally requires an
 * authenticated author, because comment authors are persisted in Postgres with a foreign
 * key to the user table, so an anonymous author can't be represented.
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
	// `edit` and `comment` links grant comment write, but only to a signed-in author.
	const canComment = isAuthenticated && (sharedLinkType === 'edit' || sharedLinkType === 'comment')

	return { isReadonly, objectAccess: canComment ? 'write' : 'read' }
}
