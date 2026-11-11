import type { Computed } from '@tldraw/state'
import { Store, StoreSchema } from '@tldraw/store'
import {
	LibraryRecordType,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItemId,
} from '@tldraw/tlschema'
import { structuredClone } from '@tldraw/utils'
import {
	LibraryNotFoundError,
	LibraryPermissionError,
	type LibrarySource,
	type TLLibraryAction,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from './LibrarySource'
import {
	LibraryItemRecordType,
	libraryItemValidator,
	mapThumbnail,
	parseLibraryItemContent,
	type TLLibraryItem,
	type TLLibraryItemContent,
} from './schema'

export interface InMemoryLibrarySourceOptions {
	id?: string
	/** Starting data, e.g. sample libraries while a real backend doesn't exist yet. */
	initial?: {
		libraries: TLLibrary[]
		items: TLLibraryItem[]
		contents: Record<TLLibraryItemId, TLLibraryItemContent>
	}
	/**
	 * Who libraries can belong to. Leave out for a source without owners, whose libraries can't
	 * be moved, or for a subclass that lists its own by overriding `getLibraryOwners`. When
	 * given, the starting data and default owner are checked against them.
	 */
	owners?: TLLibraryOwner[]
	/** Who new libraries belong to unless they name an owner. Defaults to the first owner. */
	defaultOwnerId?: string
	/**
	 * Decides what the user may do, answering `can` for the source. Leave it out to allow
	 * everything. A library or owner that doesn't exist is refused before this is asked. New
	 * libraries are asked about with the owner they will belong to, when there is one. Listing
	 * items and loading their content aren't actions, so they work even when this refuses
	 * everything.
	 *
	 * @example
	 * ```ts
	 * // A read-only source, like a prefab pack
	 * new InMemoryLibrarySource({ can: () => false })
	 * // One read-only library in an otherwise writable source
	 * new InMemoryLibrarySource({ can: (_, target) => target !== packId })
	 * // No new libraries for one owner
	 * new InMemoryLibrarySource({
	 * 	owners,
	 * 	can: (_, target) => typeof target !== 'object' || target.ownerId !== 'acme',
	 * })
	 * ```
	 */
	can?(action: TLLibraryAction, target?: TLLibraryTarget): boolean
}

type ListedRecord = TLLibrary | TLLibraryItem

const schema = StoreSchema.create<ListedRecord>({
	library: LibraryRecordType,
	'library-item': LibraryItemRecordType,
})

/**
 * A source that keeps everything in memory. Used for tests, for building UI before a backend
 * exists, and as the reference for how a source should behave.
 *
 * Libraries and items live in a tldraw `Store`, which validates them and freezes them in
 * development. Item content and thumbnails stay outside it: content can be large, and thumbnails
 * are object URLs that have to be released.
 */
export class InMemoryLibrarySource implements LibrarySource {
	readonly id: string
	private readonly owners: TLLibraryOwner[]
	private readonly defaultOwnerId: string | undefined
	private readonly allows: (action: TLLibraryAction, target?: TLLibraryTarget) => boolean
	private readonly store = new Store<ListedRecord>({ schema, props: {} })
	private readonly libraries = this.store.query.records('library')
	private readonly itemsByLibrary = new Map<TLLibraryId, Computed<TLLibraryItem[]>>()
	private readonly contents = new Map<TLLibraryItemId, TLLibraryItemContent>()
	private readonly thumbnailUrls = new Map<TLLibraryItemId, string[]>()

	constructor(options: InMemoryLibrarySourceOptions = {}) {
		this.id = options.id ?? 'in-memory'
		this.owners = options.owners ?? []
		this.defaultOwnerId = options.defaultOwnerId
		// Checked against the option, not getLibraryOwners: a subclass's owners may not be ready yet.
		const isOwner = (ownerId: string) =>
			!options.owners || options.owners.some((owner) => owner.id === ownerId)
		if (this.defaultOwnerId !== undefined && !isOwner(this.defaultOwnerId)) {
			throw new Error(`Default owner ${this.defaultOwnerId} is not one of the owners`)
		}
		this.allows = options.can ?? (() => true)
		if (options.initial) {
			const { libraries, items, contents } = options.initial
			// Bad starting data would only fail later, in the UI, so it is checked as a whole up front.
			// Content without a listed item is refused too: it could be loaded by id without being
			// listed, which breaks "a library someone may not use is simply not listed".
			const ids = [...libraries, ...items].map((r) => r.id)
			if (new Set(ids).size !== ids.length) throw new Error('Duplicate ids in starting data')
			for (const library of libraries) {
				if (library.ownerId !== undefined && !isOwner(library.ownerId)) {
					throw new Error(`Library ${library.id} belongs to missing owner ${library.ownerId}`)
				}
			}
			for (const item of items) {
				if (!libraries.some((c) => c.id === item.libraryId)) {
					throw new Error(`Item ${item.id} belongs to missing library ${item.libraryId}`)
				}
				if (!(item.id in contents)) throw new Error(`Item ${item.id} has no content`)
			}
			for (const itemId of Object.keys(contents)) {
				if (!items.some((i) => i.id === itemId)) throw new Error(`Content ${itemId} has no item`)
			}
			this.store.put([...libraries, ...items])
			for (const [itemId, content] of Object.entries(contents)) {
				this.contents.set(itemId as TLLibraryItemId, parseLibraryItemContent(content))
			}
		}
	}

	getLibraries() {
		return this.libraries.get()
	}

	// One query per library, kept so its result stays the same array until that library's
	// items change: a change in one library doesn't re-render every open listing.
	getItems(libraryId: TLLibraryId) {
		let items = this.itemsByLibrary.get(libraryId)
		if (!items) {
			items = this.store.query.records('library-item', () => ({
				libraryId: { eq: libraryId },
			}))
			this.itemsByLibrary.set(libraryId, items)
		}
		return items.get()
	}

	// Copied in and out, as a server would: mutating what a caller passed or got back can't
	// change what is stored.
	async getItemContent(itemId: TLLibraryItemId) {
		const content = this.contents.get(itemId)
		if (!content) throw new LibraryNotFoundError(itemId)
		return structuredClone(content)
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		if (typeof target === 'string' && !this.store.has(target)) return false
		if (typeof target === 'object' && this.getLibraryOwners().length > 0) {
			if (!this.hasOwner(target.ownerId)) return false
		}
		return this.allows(action, target)
	}

	getLibraryOwners() {
		return this.owners
	}

	getDefaultOwnerId() {
		return this.defaultOwnerId
	}

	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId() ?? this.getLibraryOwners()[0]?.id
		if (ownerId !== undefined && !this.hasOwner(ownerId)) throw new LibraryNotFoundError(ownerId)
		this.assertCan('createLibrary', ownerId === undefined ? undefined : { ownerId })
		const library = LibraryRecordType.create({
			name,
			...(ownerId === undefined ? {} : { ownerId }),
			...(options.meta === undefined ? {} : { meta: options.meta }),
		})
		this.store.put([library])
		return library
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		const library = this.getLibrary(libraryId)
		this.assertCan('renameLibrary', libraryId)
		this.store.put([{ ...library, name }])
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		this.getLibrary(libraryId)
		this.assertCan('deleteLibrary', libraryId)
		const items = this.getItems(libraryId)
		for (const item of items) this.forgetItem(item.id)
		this.store.remove([libraryId, ...items.map((item) => item.id)])
		this.itemsByLibrary.delete(libraryId)
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const [item] = await this.addItems(libraryId, [newItem])
		return item
	}

	/**
	 * Every item is checked before any is added, so if one is refused, none are. Each is a
	 * millisecond newer than the one before, so ordering by `createdAt` keeps their order.
	 */
	async addItems(libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) {
		this.getLibrary(libraryId)
		this.assertCan('addItem', libraryId)
		const now = Date.now()
		const checked = newItems.map((newItem, index) => ({
			newItem,
			content: parseLibraryItemContent(newItem.content),
			item: libraryItemValidator.validate(
				LibraryItemRecordType.create({
					libraryId,
					...(newItem.name === undefined ? {} : { name: newItem.name }),
					createdAt: now + index,
				})
			),
		}))
		// Created only after validation, so a rejected item can't leak its blobs.
		const items = checked.map(({ newItem, content, item }) => {
			this.contents.set(item.id, structuredClone(content))
			if (!newItem.thumbnail) return item
			const urls: string[] = []
			const thumbnail = mapThumbnail(newItem.thumbnail, (blob) => {
				const url = URL.createObjectURL(blob)
				urls.push(url)
				return url
			})
			this.thumbnailUrls.set(item.id, urls)
			return { ...item, thumbnail }
		})
		this.store.put(items)
		return items
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		const item = this.getItem(itemId)
		this.assertCan('renameItem', item.libraryId)
		this.store.put([{ ...item, name }])
	}

	async deleteItem(itemId: TLLibraryItemId) {
		const item = this.getItem(itemId)
		this.assertCan('deleteItem', item.libraryId)
		this.forgetItem(itemId)
		this.store.remove([itemId])
	}

	async moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		const item = this.getItem(itemId)
		this.getLibrary(toLibraryId)
		this.assertCan('deleteItem', item.libraryId)
		this.assertCan('addItem', toLibraryId)
		if (item.libraryId === toLibraryId) return
		this.store.put([{ ...item, libraryId: toLibraryId }])
	}

	// Items point at their library, not its owner, so they move with it.
	async moveLibrary(libraryId: TLLibraryId, ownerId: string) {
		const library = this.getLibrary(libraryId)
		if (!this.hasOwner(ownerId)) throw new LibraryNotFoundError(ownerId)
		if (library.ownerId === ownerId) return
		this.store.put([{ ...library, ownerId }])
	}

	/** Releases every thumbnail URL this source created. Call it when throwing the source away. */
	dispose() {
		for (const urls of this.thumbnailUrls.values()) urls.forEach((url) => URL.revokeObjectURL(url))
		this.thumbnailUrls.clear()
	}

	private getLibrary(libraryId: TLLibraryId) {
		const library = this.store.get(libraryId)
		if (!library) throw new LibraryNotFoundError(libraryId)
		return library
	}

	private hasOwner(ownerId: string) {
		return this.getLibraryOwners().some((owner) => owner.id === ownerId)
	}

	private getItem(itemId: TLLibraryItemId) {
		const item = this.store.get(itemId)
		if (!item) throw new LibraryNotFoundError(itemId)
		return item
	}

	private assertCan(action: TLLibraryAction, target?: TLLibraryTarget) {
		if (this.can(action, target)) return
		throw new LibraryPermissionError(action, typeof target === 'string' ? target : undefined)
	}

	// Object URLs keep their blob alive until revoked, so a deleted item would otherwise leak it.
	private forgetItem(itemId: TLLibraryItemId) {
		this.contents.delete(itemId)
		this.thumbnailUrls.get(itemId)?.forEach((url) => URL.revokeObjectURL(url))
		this.thumbnailUrls.delete(itemId)
	}
}
