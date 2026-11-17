import type { TLPermission } from '@tldraw/tlschema'
import { Role, can } from './roles'
import type { TlaFile, TlaFilePartial } from './tlaSchema'

// tldraw.com's own permissions, next to the SDK's `tl:` ones. The data is the file the check is
// on, so a later rule (folders, per-file grants) can read it without a new signature.
declare module '@tldraw/tlschema' {
	interface TLPermissionDataMap {
		'file:rename': { file: TlaFile }
		'file:share': { file: TlaFile }
		'file:publish': { file: TlaFile }
	}
}

/**
 * How a user reaches a file: as a member of the workspace that owns it, through its share link
 * (`editor` for an edit link, `viewer` for any other), or not at all.
 */
export type FileAccess = 'member' | 'editor' | 'viewer' | 'none'

/**
 * The one statement of who reaches a file, read by the room on connect, by the room when the file
 * row changes, by the MCP comment write, by the Zero mutators and by the client.
 *
 * `sharedLinkType` is a plain string column with legacy values in it, so anything but `edit`
 * fails closed to `viewer`.
 */
export function getFileAccess(
	file: Pick<TlaFile, 'shared' | 'sharedLinkType'>,
	role: Role | null | undefined
): FileAccess {
	if (can(role, 'accessFiles')) return 'member'
	if (!file.shared) return 'none'
	return file.sharedLinkType === 'edit' ? 'editor' : 'viewer'
}

const canvas = [
	'tl:shape:create',
	'tl:shape:edit',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:edit',
	'tl:page:delete',
] as const satisfies TLPermission[]

const comments = [
	'tl:comment:create',
	'tl:comment:edit',
	'tl:comment:delete',
	'tl:comment-thread:delete',
] as const satisfies TLPermission[]

const fileSettings = ['file:rename', 'file:share', 'file:publish'] as const satisfies TLPermission[]

/**
 * The permissions each kind of access gives. A viewer gets none: the room also connects viewers
 * read-only, so the client UI is read-only before any check runs. Comments need a signed-in user,
 * because a comment's author is a row in the user table.
 *
 * A comment-only link (view and comment) would be one more case here: `viewer` plus `comments`.
 *
 * Not possible here: a page only some users can see. Every session in a room gets every document
 * record, so a private page must be its own file.
 */
export function getFilePermissions(access: FileAccess, isSignedIn: boolean): TLPermission[] {
	switch (access) {
		case 'member':
			return [...canvas, ...comments, ...fileSettings]
		case 'editor':
			return isSignedIn ? [...canvas, ...comments] : [...canvas]
		case 'viewer':
		case 'none':
			return []
	}
}

/**
 * The permission a `file.update` mutation needs for each column it changes. The Zero mutators
 * enforce file settings, because those writes never reach the room's hooks.
 */
const fileColumnPermissions = {
	name: 'file:rename',
	shared: 'file:share',
	sharedLinkType: 'file:share',
	published: 'file:publish',
	lastPublished: 'file:publish',
} as const satisfies Partial<Record<keyof TlaFile, TLPermission>>

/**
 * The permissions a `file.update` with these columns needs. Other columns (`isEmpty`) need
 * `file:rename`, which, as before, only members have.
 */
export function getFileUpdatePermissions(update: TlaFilePartial): TLPermission[] {
	const needed = new Set<TLPermission>()
	for (const column of Object.keys(update)) {
		if (column === 'id') continue
		needed.add(fileColumnPermissions[column as keyof typeof fileColumnPermissions] ?? 'file:rename')
	}
	return [...needed]
}
