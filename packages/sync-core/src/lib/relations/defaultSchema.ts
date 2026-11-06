import {
	TLRelationTypeDef,
	allOf,
	anyOf,
	anyone,
	butNot,
	defineRelationSchema,
	direct,
	field,
	from,
	nobody,
	when,
} from './schema'

/**
 * Roles for objects above the room (file, folder, team). Each role includes the ones below it, and
 * each inherits from the parent.
 */
function container(extra: TLRelationTypeDef = {}): TLRelationTypeDef {
	return {
		parent: direct(),
		owner: anyOf(direct(), from('parent', 'owner')),
		editor: anyOf(direct(), 'owner', from('parent', 'editor')),
		contributor: anyOf(direct(), 'editor', from('parent', 'contributor')),
		commenter: anyOf(direct(), 'contributor', from('parent', 'commenter')),
		viewer: anyOf(direct(), 'commenter', from('parent', 'viewer')),
		moderator: anyOf(direct(), 'owner', from('parent', 'moderator')),
		// permissions: what code asks for
		read: 'viewer',
		comment: 'commenter',
		contribute: 'contributor',
		edit: 'editor',
		moderate: 'moderator',
		manage: 'owner',
		share: 'owner',
		...extra,
	}
}

const rootParent = field((_record, env) => env.root)

/** `user:ann` from a field that holds `ann`. Anonymous actors cannot be stamped into it. */
const userField = (key: string) =>
	field((r) => (r?.[key] ? `user:${r[key]}` : null), {
		stamp: (r, actor) => (actor?.startsWith('user:') ? { ...r, [key]: actor.slice(5) } : null),
	})

/** True when an update changes nothing except the listed keys. */
const onlyChanges = (keys: string[]) =>
	when((_r, env) => {
		const op = env.op
		if (op?.type !== 'update') return false
		const all = new Set([...Object.keys(op.prev), ...Object.keys(op.next)])
		for (const k of all) {
			if (keys.includes(k)) continue
			if (JSON.stringify(op.prev[k]) !== JSON.stringify(op.next[k])) return false
		}
		return true
	})

/**
 * A relation schema for tldraw's record types. Start here and override types to fit an app.
 *
 * Above the room: `team`, `folder`, and `file` share the roles `owner`, `editor`,
 * `contributor`, `commenter`, `viewer`, and `moderator`. A contributor may add shapes and change
 * only their own. Roles flow down `parent` tuples.
 *
 * In the room: pages and shapes inherit from their parent. Direct tuples on a page or shape add
 * access. A `restricted` tuple breaks inheritance for the subjects it names (use `*` for
 * everyone), so a page can be hidden from the file's viewers, or from one team only.
 *
 * Shapes are stamped with an owner (`meta.owner`). Comments, threads, and reactions are stamped
 * with their author. Shape types and editor actions are objects too (`shape_type:geo`,
 * `action:ai-generate`), so they can be restricted with tuples.
 *
 * @public
 */
export const defaultRelationSchema = defineRelationSchema({
	// tldraw's user records have ids like `user:ann`, the same as user subjects
	user: {
		self: field((r) => r?.id),
		read: anyone(),
		// only for yourself, so nobody can claim another person's name and color first
		create: 'self',
		update: 'self',
		delete: nobody(),
	},
	team: container({ member: anyOf(direct(), 'owner') }),
	folder: container(),
	file: container(),

	document: {
		parent: rootParent,
		read: from('parent', 'read'),
		update: from('parent', 'edit'),
	},

	page: {
		parent: rootParent,
		restricted: direct(),
		editor: direct(),
		contributor: direct(),
		commenter: direct(),
		viewer: direct(),
		manage: from('parent', 'manage'),
		share: from('parent', 'share'),
		moderate: from('parent', 'moderate'),
		edit: anyOf('editor', 'manage', butNot(from('parent', 'edit'), 'restricted')),
		contribute: anyOf('contributor', 'edit', butNot(from('parent', 'contribute'), 'restricted')),
		comment: anyOf('commenter', 'contribute', butNot(from('parent', 'comment'), 'restricted')),
		read: anyOf('viewer', 'comment', butNot(from('parent', 'read'), 'restricted')),
		create: from('parent', 'edit'),
		update: 'edit',
		delete: 'edit',
	},

	shape: {
		parent: field((r) => r?.parentId),
		owner: field((r) => r?.meta?.owner ?? null, {
			stamp: (r, actor) => (actor ? { ...r, meta: { ...r.meta, owner: actor } } : null),
			lock: 'manage',
		}),
		kind: field((r) => (r?.type ? `shape_type:${r.type}` : null)),
		restricted: direct(),
		editor: direct(),
		contributor: direct(),
		viewer: direct(),
		manage: from('parent', 'manage'),
		share: from('parent', 'share'),
		comment: from('parent', 'comment'),
		edit: anyOf('editor', 'manage', butNot(from('parent', 'edit'), 'restricted')),
		contribute: anyOf('contributor', 'edit', butNot(from('parent', 'contribute'), 'restricted')),
		read: anyOf('viewer', 'owner', 'contribute', butNot(from('parent', 'read'), 'restricted')),
		create: allOf(from('parent', 'contribute'), from('kind', 'use')),
		update: anyOf('edit', allOf('owner', from('parent', 'contribute'))),
		delete: anyOf('edit', allOf('owner', from('parent', 'contribute'))),
	},

	binding: {
		source: field((r) => r?.fromId),
		target: field((r) => r?.toId),
		read: allOf(from('source', 'read'), from('target', 'read')),
		create: allOf(from('source', 'update'), from('target', 'read')),
		update: allOf(from('source', 'update'), from('target', 'read')),
		// either end may remove it, so deleting your shape can unbind someone else's arrow
		delete: anyOf(from('source', 'update'), from('target', 'update')),
	},

	asset: {
		parent: rootParent,
		read: from('parent', 'read'),
		create: from('parent', 'contribute'),
		update: from('parent', 'edit'),
		delete: from('parent', 'edit'),
	},

	shape_type: {
		parent: rootParent,
		restricted: direct(),
		// creating a shape already needs `contribute` where it goes, so types are open by default
		use: anyOf(direct(), butNot(anyone(), 'restricted')),
		share: from('parent', 'share'),
		read: from('parent', 'read'),
	},

	action: {
		parent: rootParent,
		restricted: direct(),
		use: anyOf(direct(), butNot(from('parent', 'edit'), 'restricted')),
		share: from('parent', 'share'),
		read: from('parent', 'read'),
	},

	relation: {
		object: field((r) => r?.object),
		read: from('object', 'read'),
		create: from('object', 'share'),
		update: nobody(),
		delete: from('object', 'share'),
	},

	'comment-thread': {
		parent: field((r) => r?.pageId),
		creator: userField('createdBy'),
		read: from('parent', 'read'),
		comment: from('parent', 'comment'),
		moderate: from('parent', 'moderate'),
		create: from('parent', 'comment'),
		update: from('parent', 'comment'),
		delete: nobody(),
	},

	comment: {
		parent: field((r) => r?.threadId),
		author: userField('authorId'),
		read: from('parent', 'read'),
		comment: from('parent', 'comment'),
		moderate: from('parent', 'moderate'),
		create: from('parent', 'comment'),
		// authors edit their own; moderators may only hide (soft delete) anyone's
		update: anyOf('author', allOf('moderate', onlyChanges(['isDeleted']))),
		delete: nobody(),
	},

	'comment-reaction': {
		parent: field((r) => r?.commentId),
		reactor: userField('userId'),
		read: from('parent', 'read'),
		create: from('parent', 'comment'),
		update: nobody(),
		delete: 'reactor',
	},

	instance_presence: {
		page: field((r) => r?.currentPageId),
		read: from('page', 'read'),
	},
})
