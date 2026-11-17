import type { UnknownRecord } from '@tldraw/store'
import type {
	TLPermission,
	TLPermissionGrant,
	TLPermissionRequirement,
	TLPermissionRequirements,
	TLRecordTypePermissions,
	TLWritePolicy,
	TLWriteRule,
} from '@tldraw/tlschema'

/**
 * The permissions the tldraw editor and UI understand. Shape actions also come typed, ending in the
 * shape's type (`tl:shape:create:geo`); the untyped name is their parent.
 *
 * @public
 */
export const TL_PERMISSIONS: readonly TLPermission[] = [
	'tl:shape:create',
	'tl:shape:update',
	'tl:shape:delete',
	'tl:page:create',
	'tl:page:update',
	'tl:page:delete',
]

/**
 * One write to a record: the record before and after. The editor's `TLRecordChange` and the sync
 * server's change both fit.
 *
 * @public
 */
export interface TLPermissionChange {
	type: 'create' | 'update' | 'delete'
	prev: UnknownRecord | null
	next: UnknownRecord | null
}

/**
 * Where an action is asked about: the ids a placed grant (`name@id`) may name, usually from
 * {@link getPermissionPlaces}, or a test for one. Omitted, only grants without a place count.
 *
 * @public
 */
export type TLPermissionPlace = readonly string[] | ((place: string) => boolean)

/**
 * How {@link isPermitted} reads an action.
 *
 * @public
 */
export interface TLIsPermittedOptions {
	/** What each action needs. See {@link @tldraw/tlschema#TLPermissionRequirements}. */
	requires?: TLPermissionRequirements
	/** Where the action is asked about. */
	at?: TLPermissionPlace
}

/**
 * Whether a list of grants permits an action at a place.
 *
 * A grant is a name with an optional place: `tl:shape:*`, `tl:shape:update@page:A`. Its name covers
 * an action when they're equal, when it's a parent of the action (`tl:shape:create` covers
 * `tl:shape:create:geo`), or when it ends in `:*` and the action is under it. A grant without a
 * place counts anywhere; a placed one only where `at` includes its place. With `requires`, the
 * action's requirement is checked instead of the action itself, every name at the same place.
 *
 * `null` (permissions not in use) permits nothing, so a rule that asks fails closed when a session
 * was never given a list.
 *
 * @example
 * ```ts
 * isPermitted(['tl:shape:*'], 'tl:shape:delete') // true
 * isPermitted(['tl:shape:create'], 'tl:shape:create:geo') // true
 * isPermitted(['tl:shape:create:note'], 'tl:shape:create') // false: not every type
 * isPermitted(['tl:shape:*@page:A'], 'tl:shape:update', { at: ['shape:1', 'page:A'] }) // true
 * ```
 *
 * @public
 */
export function isPermitted(
	granted: readonly TLPermissionGrant[] | null,
	action: string,
	opts: TLIsPermittedOptions = {}
): boolean {
	if (!granted) return false
	const at = opts.at
	return isRequirementMet(getRequirement(action, opts.requires), (name) =>
		granted.some((grant) => grantCovers(grant, name, at))
	)
}

/**
 * Whether some type of the action is permitted somewhere: a grant for the action, a parent or a
 * typed child of it, at any place. For a write that only some shape makes sense of, like a new
 * asset.
 */
function isPermittedForSomeType(
	granted: readonly TLPermissionGrant[] | null,
	action: string,
	requires: TLPermissionRequirements | undefined
): boolean {
	if (!granted) return false
	return isRequirementMet(getRequirement(action, requires), (name) =>
		granted.some((grant) => {
			const { name: grantName } = splitGrant(grant)
			return nameCovers(grantName, name) || grantName.startsWith(name + ':')
		})
	)
}

/**
 * The requirement for an action: its own entry, or its nearest parent's, with the entry's own key
 * standing for the full action. An action no entry covers needs itself.
 */
function getRequirement(
	action: string,
	requires: TLPermissionRequirements | undefined
): TLPermissionRequirement {
	if (!requires) return [action]
	for (let key = action; ; ) {
		if (Object.hasOwn(requires, key)) {
			const entry = requires[key]
			const own = (name: string) => (name === key ? action : name)
			return isAnyOf(entry) ? { anyOf: entry.anyOf.map(own) } : entry.map(own)
		}
		const i = key.lastIndexOf(':')
		if (i <= 0) return [action]
		key = key.slice(0, i)
	}
}

function isAnyOf(
	requirement: TLPermissionRequirement
): requirement is { readonly anyOf: readonly string[] } {
	return 'anyOf' in requirement
}

function isRequirementMet(
	requirement: TLPermissionRequirement,
	isGranted: (name: string) => boolean
): boolean {
	return isAnyOf(requirement) ? requirement.anyOf.some(isGranted) : requirement.every(isGranted)
}

function splitGrant(grant: string): { name: string; place: string | null } {
	const i = grant.indexOf('@')
	return i === -1
		? { name: grant, place: null }
		: { name: grant.slice(0, i), place: grant.slice(i + 1) }
}

function nameCovers(grantName: string, action: string): boolean {
	if (grantName === action) return true
	if (grantName.endsWith(':*')) return action.startsWith(grantName.slice(0, -1))
	return action.startsWith(grantName + ':')
}

function grantCovers(grant: string, action: string, at: TLPermissionPlace | undefined): boolean {
	const { name, place } = splitGrant(grant)
	if (!nameCovers(name, action)) return false
	if (place === null) return true
	if (!at) return false
	return typeof at === 'function' ? at(place) : at.includes(place)
}

/**
 * The places a check about a record walks: the record, then its parents up to its page. A binding
 * belongs to the shape it starts from. A missing parent ends the walk at its id, so a grant on it
 * still counts and nothing past it does.
 *
 * @example
 * ```ts
 * getPermissionPlaces(after, shapeInFrame) // ['shape:a', 'shape:frame', 'page:A']
 * ```
 *
 * @public
 */
export function getPermissionPlaces(
	get: (id: string) => UnknownRecord | undefined,
	record: UnknownRecord
): string[] {
	const places = [record.id as string]
	let current: UnknownRecord | undefined = record
	if (record.typeName === 'binding') {
		const fromId = (record as UnknownRecord & { fromId: string }).fromId
		current = get(fromId)
		if (!current) return [...places, fromId]
		places.push(current.id)
	}
	// Bounded so a tampered parent cycle can't loop forever.
	for (let depth = 0; depth < MAX_PARENT_DEPTH && current.typeName === 'shape'; depth++) {
		const parentId: string = (current as UnknownRecord & { parentId: string }).parentId
		places.push(parentId)
		current = get(parentId)
		if (!current) break
	}
	return places
}

// Deeper than any real nesting of frames and groups; only a cycle gets near it.
const MAX_PARENT_DEPTH = 1000

/**
 * How {@link getRequiredPermission} reads a change.
 *
 * @public
 */
export interface TLRequiredPermissionOptions {
	/** The permission each of your own record types needs. Wins over the built-in mapping. */
	types?: TLRecordTypePermissions
	/** Reads other records, to type a binding by the shape it starts from. */
	get?(id: string): UnknownRecord | undefined
}

/**
 * The action a change to a record is, or null when the record isn't covered by any (the change is
 * then allowed).
 *
 * Shapes and pages map onto their own create, update and delete; a shape's action ends in its type
 * (`tl:shape:create:geo`). A binding belongs to the shape it starts from, so any change to one is an
 * update of that shape, typed when `get` finds it. A new asset only arrives with a new shape, so
 * creating one is `tl:shape:create`. `types` covers your own record types and wins over these.
 *
 * Left unjudged:
 *
 * - Record types tldraw doesn't know and that have no entry in `types`. They're allowed.
 * - Asset updates and deletes. An asset is shared across pages, so changing one affects every page
 *   that shows it.
 *
 * @public
 */
export function getRequiredPermission(
	change: TLPermissionChange,
	opts: TLRequiredPermissionOptions = {}
): TLPermissionGrant | null {
	const record = (change.next ?? change.prev)!
	return getAction(change.type, record, opts.types, opts.get)
}

function getAction(
	type: TLPermissionChange['type'],
	record: UnknownRecord,
	types: TLRecordTypePermissions | undefined,
	get: ((id: string) => UnknownRecord | undefined) | undefined
): TLPermissionGrant | null {
	const typeName = record.typeName
	if (types && Object.hasOwn(types, typeName)) return types[typeName]
	switch (typeName) {
		case 'shape':
			return `tl:shape:${type}:${(record as UnknownRecord & { type: string }).type}`
		case 'page':
			return `tl:page:${type}`
		case 'binding': {
			const from = get?.((record as UnknownRecord & { fromId: string }).fromId)
			return from?.typeName === 'shape'
				? `tl:shape:update:${(from as UnknownRecord & { type: string }).type}`
				: 'tl:shape:update'
		}
		case 'asset':
			return type === 'create' ? 'tl:shape:create' : null
		default:
			return null
	}
}

/**
 * How {@link isChangePermitted} reads a change.
 *
 * @public
 */
export interface TLIsChangePermittedOptions {
	/** What each action needs. See {@link @tldraw/tlschema#TLPermissionRequirements}. */
	requires?: TLPermissionRequirements
	/** The permission each of your own record types needs. */
	types?: TLRecordTypePermissions
	/** Any record as it was before the change, to find where `prev` lives. */
	before?(id: string): UnknownRecord | undefined
	/** Any record with the change applied, to find where `next` lives. */
	after?(id: string): UnknownRecord | undefined
}

/**
 * Whether these grants permit a change: the action it is (see {@link getRequiredPermission}) is
 * permitted where the record is, or it's no action. A create is checked where the record ends up, a
 * delete where it was, an update at both, so a grant on one page can't move a shape off another.
 * Only the changed record is judged: a frame moved to another page needs permission for the frame
 * on both pages, and nothing for what rides along inside it.
 *
 * A new asset passes when some type of shape may be created somewhere. Pure, so a client and a
 * server can share it.
 *
 * @example
 * ```ts
 * if (!isChangePermitted(session.permissions, change, { before, after })) {
 * 	return { reason: `Needs ${getRequiredPermission(change)}`, ids: [(change.next ?? change.prev).id] }
 * }
 * ```
 *
 * @public
 */
export function isChangePermitted(
	granted: readonly TLPermissionGrant[] | null,
	change: TLPermissionChange,
	opts: TLIsChangePermittedOptions = {}
): boolean {
	return getRefusedSide(granted, change, opts) === null
}

/** The action a change was refused for, or null when it's permitted. */
function getRefusedSide(
	granted: readonly TLPermissionGrant[] | null,
	change: TLPermissionChange,
	opts: TLIsChangePermittedOptions
): string | null {
	const { requires, types, before = noRecord, after = noRecord } = opts
	const sides: [UnknownRecord | null, (id: string) => UnknownRecord | undefined][] =
		change.type === 'create'
			? [[change.next, after]]
			: change.type === 'delete'
				? [[change.prev, before]]
				: [
						[change.prev, before],
						[change.next, after],
					]
	for (const [record, get] of sides) {
		if (!record) continue
		const action = getAction(change.type, record, types, get)
		if (action === null) continue
		const permitted =
			record.typeName === 'asset' && !(types && Object.hasOwn(types, 'asset'))
				? isPermittedForSomeType(granted, action, requires)
				: isPermitted(granted, action, { requires, at: getPermissionPlaces(get, record) })
		if (!permitted) return action
	}
	return null
}

const noRecord = () => undefined

/**
 * What {@link createGrantsPolicy} builds a policy from.
 *
 * @public
 */
export interface TLGrantsPolicyOptions<R extends UnknownRecord, Meta> {
	/** What each action needs. See {@link @tldraw/tlschema#TLPermissionRequirements}. */
	requires?: TLPermissionRequirements
	/** The permission each of your own record types needs. */
	types?: TLRecordTypePermissions
	/** More write rules, run in order after the grant checks. */
	rules?: ReadonlyArray<TLWriteRule<R, Meta>>
}

/**
 * One object for both sides: a write rule that checks every change against the session's grants
 * (then runs `rules`), plus the `requires` and `types` the editor needs to answer its UI the same
 * way. Pass it as `authorize` to `TLSocketRoom`, `useSync` and a store.
 *
 * @public
 */
export interface TLGrantsPolicy<
	R extends UnknownRecord = UnknownRecord,
	Meta = unknown,
> extends TLWritePolicy<R, Meta> {
	/** What each action needs, as passed to {@link createGrantsPolicy}. */
	requires: TLPermissionRequirements
	/** The permission each of your own record types needs, as passed to {@link createGrantsPolicy}. */
	types: TLRecordTypePermissions
}

/**
 * Build a {@link TLGrantsPolicy}: grant checks first, every change at its place (see
 * {@link isChangePermitted}), then your own `rules` in order. A session without a list
 * (`permissions: null`) is refused every change it would need a grant for.
 *
 * @example
 * ```ts
 * export const policy = createGrantsPolicy({
 * 	requires: { 'tl:shape:create': ['tl:shape:create', 'page:edit'] },
 * 	rules: [ownershipRule],
 * })
 * new TLSocketRoom({ authorize: policy })
 * const store = useSync({ uri, assets, authorize: policy })
 * ```
 *
 * @public
 */
export function createGrantsPolicy<R extends UnknownRecord = UnknownRecord, Meta = unknown>(
	opts: TLGrantsPolicyOptions<R, Meta> = {}
): TLGrantsPolicy<R, Meta> {
	const requires = opts.requires ?? {}
	const types = opts.types ?? {}
	const rules = opts.rules ?? []
	return {
		requires,
		types,
		rule: (args) => {
			const { session, changes, before, after } = args
			for (const change of changes) {
				const refused = getRefusedSide(session.permissions, change, {
					requires,
					types,
					before,
					after,
				})
				if (refused !== null) {
					return { reason: `Needs ${refused}`, ids: [(change.next ?? change.prev)!.id] }
				}
			}
			for (const rule of rules) {
				const refusal = rule(args)
				if (refusal) return refusal
			}
			return null
		},
	}
}

/**
 * The policy for apps whose only rules are grants: every change needs its action granted where it
 * happens, with no `requires`.
 *
 * @public
 */
export const defaultGrantsPolicy: TLGrantsPolicy = createGrantsPolicy()
