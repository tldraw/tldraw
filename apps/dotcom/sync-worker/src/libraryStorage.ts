import { DB, Role } from '@tldraw/dotcom-shared'
import { uniqueId } from '@tldraw/utils'
import { Kysely } from 'kysely'
import PQueue from 'p-queue'

// An item's content is kept in the ROOMS bucket, which only this worker reads: the uploads bucket
// is served publicly by object name, which would bypass the membership check the content route
// makes. Its thumbnails are public uploads (see libraryThumbnails). The key isn't derived from the
// item's id because a library's copy shares its items' content: the row names it.
export function newLibraryItemContentKey() {
	return `library-items/${uniqueId()}/content.json`
}

export const MAX_LIBRARY_ITEM_CONTENT_BYTES = 5_000_000

// Cloudflare allows a request six simultaneous open connections. A request's library storage holds
// at most four of them at once, leaving room for its Postgres connection.
// https://developers.cloudflare.com/workers/platform/limits/#simultaneous-open-connections
export const MAX_R2_CONNECTIONS = 4

/**
 * One request's budget of simultaneous R2 connections, shared by every R2 operation it makes. A
 * copy holds two, its get's body streaming into its put; any other operation holds one. Operations
 * start in the order they're submitted.
 */
export class R2ConnectionQueue {
	private free = MAX_R2_CONNECTIONS
	private readonly waiting: { connections: number; start(): void }[] = []

	async run<T>(connections: 1 | 2, operation: () => Promise<T>): Promise<T> {
		if (this.waiting.length > 0 || connections > this.free) {
			await new Promise<void>((start) => this.waiting.push({ connections, start }))
		} else {
			this.free -= connections
		}
		try {
			return await operation()
		} finally {
			this.free += connections
			this.startWaiting()
		}
	}

	private startWaiting() {
		while (this.waiting.length > 0 && this.waiting[0].connections <= this.free) {
			const next = this.waiting.shift()!
			this.free -= next.connections
			next.start()
		}
	}
}

/**
 * Runs the tasks, as many at a time as there are R2 connections for them to share, and resolves
 * with their results in order. If one fails, those under way finish and the rest aren't started.
 */
export async function runStorageTasks<T>(tasks: (() => Promise<T>)[]): Promise<T[]> {
	const queue = new PQueue({ concurrency: MAX_R2_CONNECTIONS })
	try {
		return await queue.addAll(tasks)
	} catch (error) {
		queue.clear()
		await queue.onIdle()
		throw error
	}
}

// What uniqueId() makes, which is how clients pick library and item ids.
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{21}$/

/** Whether a value is an id a client could have picked for a new library or item. */
export function isClientPickedId(value: unknown): value is string {
	return typeof value === 'string' && CLIENT_ID_PATTERN.test(value)
}

/** Whether any of the ids is an item's. */
export async function isAnyItemIdTaken(db: Kysely<DB>, ids: string[]) {
	if (ids.length === 0) return false
	const row = await db
		.selectFrom('library_item')
		.select('id')
		.where('id', 'in', ids)
		.executeTakeFirst()
	return row !== undefined
}

// The mutators' getRole counts the home workspace as its owner's whether or not a group_user row
// exists for it, so this does too.
function resolveRole(owningGroupId: string, userId: string, role: Role | null | undefined) {
	return owningGroupId === userId ? 'owner' : (role ?? null)
}

/** A library and the user's role in its owning workspace, or null if it doesn't exist. */
export async function getLibraryAccess(db: Kysely<DB>, userId: string, libraryId: string) {
	const row = await db
		.selectFrom('library')
		.select(['library.id', 'library.name', 'library.owningGroupId', 'library.meta'])
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'library.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('library.id', '=', libraryId)
		.executeTakeFirst()
	if (!row) return null
	const { role, ...library } = row
	return { library, role: resolveRole(library.owningGroupId, userId, role) }
}

/** An item and the user's role in its library's owning workspace, or null if it doesn't exist. */
export async function getLibraryItemAccess(db: Kysely<DB>, userId: string, itemId: string) {
	const row = await db
		.selectFrom('library_item')
		.innerJoin('library', 'library.id', 'library_item.libraryId')
		.selectAll('library_item')
		.select('library.owningGroupId')
		.select((eb) =>
			eb
				.selectFrom('group_user')
				.select('group_user.role')
				.whereRef('group_user.groupId', '=', 'library.owningGroupId')
				.where('group_user.userId', '=', userId)
				.as('role')
		)
		.where('library_item.id', '=', itemId)
		.executeTakeFirst()
	if (!row) return null
	const { role, owningGroupId, ...item } = row
	return { item, role: resolveRole(owningGroupId, userId, role) }
}

/** The user's role in a workspace, the home workspace counting as its owner's. */
export async function getWorkspaceRole(db: Kysely<DB>, userId: string, groupId: string) {
	const row = await db
		.selectFrom('group_user')
		.select('role')
		.where('groupId', '=', groupId)
		.where('userId', '=', userId)
		.executeTakeFirst()
	return resolveRole(groupId, userId, row?.role)
}
