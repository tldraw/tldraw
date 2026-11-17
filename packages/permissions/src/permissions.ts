import { Computed, Signal, computed } from '@tldraw/state'
import { AtomMap } from '@tldraw/store'
import type {
	TLAuthorize,
	TLAuthorizeWrite,
	TLPermission,
	TLPermissionDataMap,
	TLRecord,
	TLRecordChange,
	TLShape,
	TLShapeId,
	TLWriteContext,
} from '@tldraw/tlschema'

/**
 * Where permissions come from. The SDK hooks read each user's permissions from here. An app can
 * bring its own source, for example a `computed` over its own query.
 *
 * @public
 */
export interface TLPermissionSource {
	/** `undefined` while the user's permissions are not loaded, an empty set for no permissions. */
	get(userId: string): Signal<ReadonlySet<string> | undefined>
}

/**
 * The default permission source. Only app code calls `set` and `delete`, never the SDK.
 *
 * @public
 */
export interface TLPermissionStore extends TLPermissionSource {
	/** Replace the user's permissions. The store keeps its own copy. */
	set(userId: string, permissions: Iterable<string>): void
	delete(userId: string): void
}

/**
 * Create the default permission store. It is reactive: a check that reads a user's permissions
 * runs again when they change.
 *
 * @public
 */
export function createPermissionStore(): TLPermissionStore {
	const map = new AtomMap<string, ReadonlySet<string>>('permissions')
	const signals = new Map<string, Computed<ReadonlySet<string> | undefined>>()
	return {
		get(userId) {
			let signal = signals.get(userId)
			if (!signal) {
				signal = computed(`permissions:${userId}`, () => map.get(userId))
				signals.set(userId, signal)
			}
			return signal
		},
		set(userId, permissions) {
			map.set(userId, new Set(permissions))
		},
		delete(userId) {
			map.delete(userId)
		},
	}
}

/**
 * The permission check over a source.
 *
 * @public
 */
export interface TLPermissionCheck {
	/**
	 * Whether the user has the permission. A user whose permissions are not loaded has none. The
	 * data is the resource the permission is checked on, for example `{ shape }`. The default
	 * check only asks whether the user has the permission name.
	 */
	can<P extends TLPermission>(userId: string, permission: P, data?: TLPermissionDataMap[P]): boolean
}

/** @public */
export interface CreatePermissionsOptions {
	/** Where permissions come from. Defaults to a new {@link createPermissionStore}. */
	source?: TLPermissionSource
}

/** @public */
export interface TLPermissionsResult<S extends TLPermissionSource> {
	/** The permission source with a `can` check. */
	permissions: S & TLPermissionCheck
	/** The hooks to pass to `TLSocketRoom` and to the client, as they are. */
	authorize: TLAuthorize<TLRecord>
}

/**
 * Create the default permissions: a permission store and the authorize hooks that check the
 * SDK's permissions against it. Pass `authorize` to the room and to the client.
 *
 * @example
 * ```ts
 * const { permissions, authorize } = createPermissions()
 * permissions.set('alice', ['tl:shape:create', 'tl:shape:edit', 'tl:shape:delete'])
 *
 * new TLSocketRoom({ authorize })
 * <Tldraw authorize={authorize} user={alice} />
 * ```
 *
 * @public
 */
export function createPermissions(
	opts?: Omit<CreatePermissionsOptions, 'source'>
): TLPermissionsResult<TLPermissionStore>
/** @public */
export function createPermissions<S extends TLPermissionSource>(
	opts: CreatePermissionsOptions & { source: S }
): TLPermissionsResult<S>
export function createPermissions(
	opts: CreatePermissionsOptions = {}
): TLPermissionsResult<TLPermissionSource> {
	const source = opts.source ?? createPermissionStore()

	const can: TLPermissionCheck['can'] = (userId, permission) => {
		return source.get(userId).get()?.has(permission) ?? false
	}

	const write: TLAuthorizeWrite<TLRecord> = (changes, ctx) => {
		const { userId } = ctx
		for (const change of changes) {
			const required = getRequiredPermission(change, changes, ctx)
			if (!required) continue
			if (!userId || !can(userId, required.permission, required.data as any)) {
				return { reason: required.permission }
			}
		}
		return null
	}

	// Spread would drop the methods of a class-based source, so keep it as the prototype.
	const permissions = Object.assign(Object.create(source), { can }) as TLPermissionSource &
		TLPermissionCheck

	return {
		permissions,
		authorize: {
			write,
			can: (permission, data, { userId }) => (userId ? can(userId, permission, data) : false),
		},
	}
}

type RequiredPermission = {
	[P in TLPermission]: { permission: P; data?: TLPermissionDataMap[P] }
}[TLPermission]

/**
 * The SDK permission one record change needs, or null for records the defaults don't govern
 * (users, comments, app records).
 */
function getRequiredPermission(
	change: TLRecordChange,
	changes: TLRecordChange[],
	ctx: TLWriteContext<TLRecord>
): RequiredPermission | null {
	const record = change.next ?? change.prev
	switch (record.typeName) {
		case 'shape': {
			if (change.type === 'create') return { permission: 'tl:shape:create' }
			const shape = change.prev as TLShape
			return change.type === 'update'
				? { permission: 'tl:shape:edit', data: { shape } }
				: { permission: 'tl:shape:delete', data: { shape } }
		}
		case 'binding': {
			// a binding belongs to the shape it starts from; when that shape is created or deleted
			// in the same changes, the shape's own change is the one judged
			const fromId = record.fromId as TLShapeId
			if (changes.some((c) => c.id === fromId && c.type !== 'update')) return null
			const shape = ctx.before.get(fromId) ?? ctx.after.get(fromId)
			return { permission: 'tl:shape:edit', data: shape ? { shape } : undefined }
		}
		case 'asset':
			return change.type === 'create'
				? { permission: 'tl:shape:create' }
				: change.type === 'update'
					? { permission: 'tl:shape:edit' }
					: { permission: 'tl:shape:delete' }
		case 'page': {
			if (change.type === 'create') return { permission: 'tl:page:create' }
			const page = change.prev as Extract<TLRecord, { typeName: 'page' }>
			return change.type === 'update'
				? { permission: 'tl:page:edit', data: { page } }
				: { permission: 'tl:page:delete', data: { page } }
		}
		case 'document':
			return { permission: 'tl:page:edit' }
		default:
			return null
	}
}
