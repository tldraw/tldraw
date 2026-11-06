import { BaseRecord, RecordId, UnknownRecord, createRecordMigrationSequence } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLBinding } from '../records/TLBinding'
import { TLComment, TLCommentReaction, TLCommentThread } from '../records/TLComment'
import { CustomRecordInfo, createCustomRecordId } from '../records/TLCustomRecord'
import { TLDOCUMENT_ID } from '../records/TLDocument'
import { TLInstancePresence } from '../records/TLPresence'
import { TLShape } from '../records/TLShape'
import { TLUser, UserRecordType } from '../records/TLUser'
import {
	AccessEffect,
	AccessEntry,
	AccessModel,
	AccessModelConfig,
	AccessSubject,
	AccessTypeRule,
} from './AccessModel'

/**
 * An in-room access entry, stored as a record so it syncs, undoes, and copies with the room. See
 * {@link AccessEntry} for the fields. Opt-in: register with
 * `createTLSchema({ records: { ...accessSchemaRecords } })` on the client and the server.
 *
 * @public
 */
export interface TLAccessEntry extends BaseRecord<'access', TLAccessEntryId>, AccessEntry {
	readonly resource: string
	readonly subject: AccessSubject
	readonly effect: AccessEffect
	readonly verbs: string[]
	readonly meta: JsonObject
}

/** @public */
export type TLAccessEntryId = RecordId<TLAccessEntry>

/** @public */
export function createAccessEntryId(id?: string): TLAccessEntryId {
	return createCustomRecordId('access', id) as TLAccessEntryId
}

/** @public */
export function createAccessEntry(
	entry: Omit<TLAccessEntry, 'id' | 'typeName' | 'meta' | 'verbs'> & {
		id?: TLAccessEntryId
		verbs: readonly string[]
		meta?: JsonObject
	}
): TLAccessEntry {
	return {
		typeName: 'access',
		meta: {},
		...entry,
		id: entry.id ?? createAccessEntryId(),
		verbs: [...entry.verbs],
	}
}

const subjectValidator: T.Validator<AccessSubject> = T.union('type', {
	anyone: T.object({ type: T.literal('anyone') }),
	user: T.object({ type: T.literal('user'), id: T.string }),
	group: T.object({ type: T.literal('group'), id: T.string }),
	relation: T.object({ type: T.literal('relation'), relation: T.string }),
})

/** @public */
export const accessEntryRecordConfig: CustomRecordInfo = {
	scope: 'document',
	migrations: createRecordMigrationSequence({
		sequenceId: 'com.tldraw.access',
		recordType: 'access',
		sequence: [],
	}),
	validator: T.object({
		id: idValidator<TLAccessEntryId>('access'),
		typeName: T.literal('access'),
		resource: T.string,
		subject: subjectValidator,
		effect: T.literalEnum('allow', 'deny', 'block'),
		verbs: T.arrayOf(T.string),
		meta: T.jsonValue,
	}),
}

/**
 * The record types for in-room access entries. Pass to `createTLSchema({ records })`.
 *
 * @public
 */
export const accessSchemaRecords = { access: accessEntryRecordConfig }

/**
 * The root of the access tree in a tldraw room: the document record. Entries on the root apply to
 * the whole room. A host puts a session's room role here.
 *
 * @public
 */
export const TL_ACCESS_ROOT: string = TLDOCUMENT_ID

/**
 * The default roles. Code checks verbs, never role names.
 *
 * - `read`: see the record.
 * - `create`, `update`, `delete`: write records (shapes, pages, bindings, assets).
 * - `comment`: start threads, reply, and react.
 * - `comment:edit`: edit, resolve, or delete a comment. The model gives it to each comment's
 *   owner, so a commenter manages their own comments and an admin manages all.
 * - `manage`: write in-room access entries (share, lock, hide).
 * - `user:edit`: write a `user` record. The model gives it to the record's own user only.
 *
 * @public
 */
export const defaultAccessRoles = {
	viewer: ['read'],
	commenter: ['viewer', 'comment'],
	editor: ['commenter', 'create', 'update', 'delete'],
	admin: ['editor', 'comment:edit', 'manage'],
} as const satisfies Record<string, readonly string[]>

const shapeOwner: AccessTypeRule<TLShape>['owner'] = {
	get: (shape) => (typeof shape.meta?.ownerId === 'string' ? shape.meta.ownerId : null),
	set: (shape, ownerId) => ({ ...shape, meta: { ...shape.meta, ownerId } }),
}

// Writing, editing, and deleting a comment is its author's; resolving, reopening, and moving a
// thread, and reacting, are anyone's who may comment (as in @tldraw/commenting).
const commentVerbs = { create: 'comment', update: 'comment:edit', delete: 'comment:edit' }
const threadVerbs = { create: 'comment', update: 'comment', delete: 'comment:edit' }

/**
 * The resource tree for the default tldraw record types:
 *
 * ```
 * document (root)
 * ├── page ── shape ── shape ...   (a shape's parent is its parentId: a page, frame, or group)
 * │            ├── binding           (its parent is fromId; its toId must be readable too)
 * │            └── comment-thread ── comment ── comment-reaction
 * ├── asset
 * ├── user                         (each user writes only their own)
 * └── access entry                 (its parent is the resource it is on)
 * ```
 *
 * @public
 */
export const defaultAccessTypes: Record<string, AccessTypeRule<any>> = {
	document: { parent: () => null },
	page: { parent: () => TL_ACCESS_ROOT },
	asset: { parent: () => TL_ACCESS_ROOT },
	shape: { parent: (shape: TLShape) => shape.parentId, owner: shapeOwner },
	binding: {
		parent: (binding: TLBinding) => binding.fromId,
		alsoRead: (binding: TLBinding) => [binding.toId],
	},
	instance_presence: {
		parent: (presence: TLInstancePresence) => presence.currentPageId,
		// presence is never written through the model; the room owns it
		redact: (presence: TLInstancePresence, canRead) => {
			const selectedShapeIds = presence.selectedShapeIds.filter(canRead)
			return selectedShapeIds.length === presence.selectedShapeIds.length
				? presence
				: { ...presence, selectedShapeIds }
		},
	},
	'comment-thread': {
		parent: (thread: TLCommentThread) =>
			thread.anchor.type === 'shape' ? thread.anchor.shapeId : thread.pageId,
		verbs: threadVerbs,
		owner: {
			get: (thread) => thread.createdBy || null,
			set: (thread, ownerId) => ({ ...thread, createdBy: ownerId ?? '' }),
		},
	},
	comment: {
		parent: (comment: TLComment) => comment.threadId,
		verbs: commentVerbs,
		owner: {
			get: (comment) => comment.authorId || null,
			set: (comment, ownerId) => ({ ...comment, authorId: ownerId ?? '' }),
		},
	},
	'comment-reaction': {
		parent: (reaction: TLCommentReaction) => reaction.commentId,
		verbs: threadVerbs,
		owner: {
			get: (reaction) => reaction.userId || null,
			set: (reaction, ownerId) => ({ ...reaction, userId: ownerId ?? '' }),
		},
	},
	// Each user writes only their own record. The owner is the record id, so a stamp cannot change it.
	user: {
		parent: () => TL_ACCESS_ROOT,
		verbs: { create: 'user:edit', update: 'user:edit', delete: 'user:edit' },
		owner: { get: (user: TLUser) => UserRecordType.parseId(user.id), set: (user) => user },
	},
	access: {
		parent: (entry: TLAccessEntry) => entry.resource,
		verbs: { create: 'manage', update: 'manage', delete: 'manage' },
	},
}

/**
 * Entries that are part of the default model: each owner may edit and delete their own comments
 * and reactions, and write their own `user` record.
 *
 * @public
 */
export const defaultAccessEntries: readonly AccessEntry[] = [
	{
		resource: TL_ACCESS_ROOT,
		subject: { type: 'relation', relation: 'owner' },
		effect: 'allow',
		verbs: ['comment:edit', 'user:edit'],
	},
]

/** @public */
export interface TLAccessModelOptions<R extends UnknownRecord = UnknownRecord> {
	/** Roles to add to, or replace, {@link defaultAccessRoles}. */
	roles?: Record<string, readonly string[]>
	/** Record types to add to, or replace, {@link defaultAccessTypes}: custom shapes' records, plugin records. */
	types?: Record<string, AccessTypeRule<any>>
	/** Entries to add to {@link defaultAccessEntries}. */
	entries?: readonly AccessEntry[]
	relations?: AccessModelConfig<R>['relations']
}

/**
 * The access model for a tldraw room. The same object runs in the editor and in the sync server.
 *
 * @example
 * ```ts
 * const model = createTLAccessModel({
 *   roles: { student: ['viewer', 'comment', 'create'] },
 *   entries: [{ resource: TL_ACCESS_ROOT, subject: { type: 'relation', relation: 'owner' },
 *               effect: 'allow', verbs: ['update', 'delete'] }],
 * })
 * ```
 *
 * @public
 */
export function createTLAccessModel<R extends UnknownRecord = UnknownRecord>(
	opts: TLAccessModelOptions<R> = {}
): AccessModel<R> {
	return new AccessModel<R>({
		root: TL_ACCESS_ROOT,
		roles: { ...defaultAccessRoles, ...opts.roles },
		types: { ...defaultAccessTypes, ...opts.types },
		entries: [...defaultAccessEntries, ...(opts.entries ?? [])],
		relations: opts.relations,
		entryType: 'access',
	})
}
