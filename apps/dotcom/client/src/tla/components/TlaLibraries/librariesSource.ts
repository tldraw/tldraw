import type { MutatorResult } from '@rocicorp/zero'
import {
	can,
	MAX_LIBRARY_ITEMS_PER_REQUEST,
	MAX_LIBRARY_ITEMS_REQUEST_BYTES,
	type TlaLibrary,
	type TlaLibraryItemThumbnail,
} from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	getThumbnailForColorMode,
	mapThumbnail,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLLibraryThumbnail,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { structuredClone } from '@tldraw/utils'
import { atom, computed, defineMessages, fetch, react, uniqueId } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	privateToYou: { defaultMessage: 'Private to you' },
})

interface StoredItem {
	createdAt: number
	thumbnail: TlaLibraryItemThumbnail | null
}

/**
 * An item being added or copied, under the id its row will have: listed until the row arrives
 * through Zero.
 */
interface PendingItem {
	item: TLLibraryItem
	loadContent(): Promise<TLLibraryItemContent>
	/** Whether the row arrived: false when adding or copying failed. */
	arrived: Promise<boolean>
}

/** An item being added: its pending listing, and what the worker needs to store it. */
interface NewItem {
	id: string
	newItem: TLNewLibraryItem
	contentJson: string
	/** Its content and thumbnails, as counted against what one request may add. */
	bytes: number
	/** Object URLs of its thumbnails, listed while it's stored and after. */
	thumbnail: TLLibraryThumbnail | undefined
	pending: PendingItem
	settleArrival(arrived: boolean): void
}

/** A library being copied, under the id its row will have: listed until the row arrives. */
interface PendingLibrary {
	library: TLLibrary
	/** Whether the row arrived: false when copying failed. */
	arrived: Promise<boolean>
}

/** A promise and the function that settles it. */
function settleable<T>() {
	let settle: (value: T) => void = () => {}
	const promise = new Promise<T>((resolve) => {
		settle = resolve
	})
	return { promise, settle }
}

// A row's id is the record id without its type prefix.
const rowId = (id: TLLibraryId | TLLibraryItemId) => id.slice(id.indexOf(':') + 1)

const toLibrary = (row: TlaLibrary): TLLibrary =>
	LibraryRecordType.create({
		id: LibraryRecordType.createId(row.id),
		name: row.name,
		ownerId: row.owningGroupId,
		meta: row.meta ?? {},
	})

const revokeThumbnail = (thumbnail: TLLibraryThumbnail) =>
	mapThumbnail(thumbnail, (url) => URL.revokeObjectURL(url))

const getThumbnailBytes = (thumbnail: TLLibraryThumbnail<Blob> | undefined) => {
	if (!thumbnail) return 0
	return thumbnail instanceof Blob ? thumbnail.size : thumbnail.light.size + thumbnail.dark.size
}

/** The items to send in each request, in order, each request within what the worker accepts. */
function splitIntoRequests(items: NewItem[]): NewItem[][] {
	const requests: NewItem[][] = []
	let bytes = 0
	for (const item of items) {
		const last = requests.at(-1)
		if (
			last &&
			last.length < MAX_LIBRARY_ITEMS_PER_REQUEST &&
			bytes + item.bytes <= MAX_LIBRARY_ITEMS_REQUEST_BYTES
		) {
			last.push(item)
			bytes += item.bytes
		} else {
			requests.push([item])
			bytes = item.bytes
		}
	}
	return requests
}

/**
 * Workspace libraries, kept in tldraw.com's database and synced through Zero: those of every
 * workspace the user is a member of, the home workspace's being private to them. A board's own
 * libraries are kept in its document instead (see editorLibraries).
 *
 * Libraries and item rows come from the app's libraries query and change through mutators.
 * An item's content is stored by the sync worker, which also adds items and copies libraries,
 * and is fetched with the user's token. Its thumbnails are public uploads whose URLs are on its
 * row, so they load as ordinary images.
 *
 * Changes are listed as soon as Zero has applied them locally, and the promises resolve then; a
 * change the server rejects is rolled back and the app shows its mutation error. A new item is
 * listed as soon as it's asked for, with the thumbnails it was given, while the worker stores it,
 * and a copy of a library with its source's name and items' thumbnails while the worker copies
 * it; one the worker can't store disappears and `addItem` or `copyLibrary` rejects. Changes to
 * either wait until its row has arrived.
 *
 * Items added together are all listed at once and sent in as few requests as the worker allows,
 * one after another, usually one. If a request fails, its items and those after it disappear and
 * `addItems` rejects; items an earlier request stored stay.
 */
export class TldrawAppLibrariesSource implements LibrarySource {
	readonly id = 'dotcom-workspaces'

	private readonly pendingLibraries = atom<PendingLibrary[]>('pending libraries', [])
	private readonly pendingItems = atom<PendingItem[]>('pending library items', [])
	// Object URLs of thumbnails added here, by item row id, listed instead of the uploaded copies so
	// a tile doesn't blank while those load.
	private readonly localThumbnails = atom<ReadonlyMap<string, TLLibraryThumbnail>>(
		'local library item thumbnails',
		new Map()
	)
	// Libraries created or copied here that the server hasn't confirmed yet, by row id. The worker
	// can't add items to them or copy them until it has.
	private readonly unconfirmedLibraries = new Map<string, Promise<boolean>>()

	private readonly owners$ = computed('library owners', (): TLLibraryOwner[] => {
		const homeId = this.app.getHomeWorkspaceId()
		const memberships = this.app.getWorkspaceMemberships()
		// The libraries UI names the home workspace for who sees it, not by its name.
		return [
			{ id: homeId, name: this.app.msg(messages.privateToYou) },
			...memberships.flatMap((m) =>
				m.groupId !== homeId && m.group ? [{ id: m.groupId, name: m.group.name }] : []
			),
		]
	})

	private readonly libraries$ = computed('workspace libraries', () => {
		const rows = this.app.getLibraryRows()
		const rowIds = new Set(rows.map((row) => row.id))
		const pending = this.pendingLibraries
			.get()
			.flatMap(({ library }) => (rowIds.has(rowId(library.id)) ? [] : [library]))
		return [...rows.map(toLibrary), ...pending]
	})

	private readonly items$ = computed('workspace library items', () => {
		const localThumbnails = this.localThumbnails.get()
		const byLibrary = new Map<string, TLLibraryItem[]>()
		const itemRowIds = new Set<string>()
		for (const row of this.app.getLibraryRows()) {
			byLibrary.set(
				row.id,
				row.items.map((item) => {
					itemRowIds.add(item.id)
					const thumbnail = localThumbnails.get(item.id) ?? item.thumbnail
					return LibraryItemRecordType.create({
						id: LibraryItemRecordType.createId(item.id),
						libraryId: LibraryRecordType.createId(row.id),
						...(item.name ? { name: item.name } : {}),
						...(thumbnail ? { thumbnail } : {}),
						createdAt: item.createdAt,
					})
				})
			)
		}
		for (const { item } of this.pendingItems.get()) {
			if (itemRowIds.has(rowId(item.id))) continue
			const libraryRowId = rowId(item.libraryId)
			byLibrary.set(libraryRowId, [...(byLibrary.get(libraryRowId) ?? []), item])
		}
		return byLibrary
	})

	constructor(
		private readonly app: TldrawApp,
		private readonly getToken: () => Promise<string | undefined>
	) {}

	getLibraries() {
		return this.libraries$.get()
	}

	getItems(libraryId: TLLibraryId) {
		return this.items$.get().get(rowId(libraryId)) ?? []
	}

	async getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		const pending = this.findPendingItem(itemId)
		if (pending) return pending.loadContent()
		const response = await this.request(`/api/app/library-items/${rowId(itemId)}/content`)
		if (response.status === 404) throw new LibraryNotFoundError(itemId)
		if (!response.ok) throw new Error(`Couldn't load the item: ${response.status}`)
		return (await response.json()) as TLLibraryItemContent
	}

	can(_action: TLLibraryAction, target?: TLLibraryTarget) {
		// Every member of a workspace can manage its libraries, so the action doesn't matter.
		const ownerId = this.getTargetOwnerId(target)
		return ownerId !== undefined && this.canManageIn(ownerId)
	}

	getLibraryOwners() {
		return this.owners$.get()
	}

	getDefaultOwnerId() {
		return this.app.getHomeWorkspaceId()
	}

	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (!this.canManageIn(ownerId)) throw new LibraryPermissionError('createLibrary')
		const id = uniqueId()
		const meta = options.meta ?? {}
		const { confirmed } = await this.apply(
			this.app.z.mutate.library.create({ id, name, owningGroupId: ownerId, meta })
		)
		this.unconfirmedLibraries.set(
			id,
			confirmed.then((accepted) => {
				this.unconfirmedLibraries.delete(id)
				return accepted
			})
		)
		return LibraryRecordType.create({
			id: LibraryRecordType.createId(id),
			name: name.trim(),
			ownerId,
			meta,
		})
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		const id = await this.getLibraryRowId(libraryId)
		await this.apply(this.app.z.mutate.library.rename({ id, name }))
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		const id = await this.getLibraryRowId(libraryId)
		await this.apply(this.app.z.mutate.library.delete({ id }))
	}

	async moveLibrary(libraryId: TLLibraryId, ownerId: string) {
		const id = await this.getLibraryRowId(libraryId)
		await this.apply(this.app.z.mutate.library.move({ id, owningGroupId: ownerId }))
	}

	async copyLibrary(libraryId: TLLibraryId, ownerId: string): Promise<TLLibrary> {
		const source = this.getLibraries().find((c) => c.id === libraryId)
		if (!source) throw new LibraryNotFoundError(libraryId)
		if (!this.canManageIn(ownerId)) throw new LibraryPermissionError('createLibrary')
		const sourceItems = this.getItems(libraryId)

		const id = uniqueId()
		const library = LibraryRecordType.create({
			id: LibraryRecordType.createId(id),
			name: source.name,
			ownerId,
			meta: source.meta,
		})
		const arrival = settleable<boolean>()
		const copies = sourceItems.map((sourceItem) =>
			this.listCopiedItem(sourceItem, library.id, arrival.promise)
		)
		this.pendingLibraries.update((all) => [...all, { library, arrived: arrival.promise }])
		this.pendingItems.update((all) => [...all, ...copies])
		this.unconfirmedLibraries.set(
			id,
			arrival.promise.then((arrived) => {
				this.unconfirmedLibraries.delete(id)
				return arrived
			})
		)
		const unlist = () => {
			this.pendingLibraries.update((all) => all.filter((p) => p.library.id !== library.id))
			this.pendingItems.update((all) => all.filter((p) => p.item.libraryId !== library.id))
		}

		try {
			await this.whenConfirmed(libraryId)
			await this.whenItemsArrive(libraryId)
			const itemIds = Object.fromEntries(
				sourceItems.map((sourceItem, index) => [rowId(sourceItem.id), rowId(copies[index].item.id)])
			)
			const response = await this.request(`/api/app/libraries/${rowId(libraryId)}/copy`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ owningGroupId: ownerId, id, itemIds }),
			})
			if (!response.ok) throw new Error(`Couldn't copy the library: ${response.status}`)
		} catch (error) {
			unlist()
			arrival.settle(false)
			throw error
		}

		this.whenLibraryRowArrives(id).then(() => {
			unlist()
			arrival.settle(true)
		})
		return library
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const [item] = await this.addItems(libraryId, [newItem])
		return item
	}

	async addItems(libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) {
		if (!this.can('addItem', libraryId)) {
			throw new LibraryPermissionError('addItem', libraryId)
		}
		const now = Date.now()
		const adding = newItems.map((newItem, index) =>
			this.listNewItem(libraryId, newItem, now + index)
		)
		this.pendingItems.update((all) => [...all, ...adding.map((a) => a.pending)])

		const added: TLLibraryItem[] = []
		try {
			await this.whenConfirmed(libraryId)
			for (const request of splitIntoRequests(adding)) {
				const stored = await this.storeItems(libraryId, request)
				added.push(...request.map((a, index) => this.listStoredItem(a, stored[index])))
			}
		} catch (error) {
			this.unlistNewItems(adding.slice(added.length))
			throw error
		}
		return added
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		const id = await this.getItemRowId(itemId)
		await this.apply(this.app.z.mutate.library_item.rename({ id, name }))
	}

	async deleteItem(itemId: TLLibraryItemId) {
		const id = await this.getItemRowId(itemId)
		await this.apply(this.app.z.mutate.library_item.delete({ id }))
		const thumbnail = this.localThumbnails.get().get(id)
		if (!thumbnail) return
		revokeThumbnail(thumbnail)
		this.localThumbnails.update((all) => {
			const rest = new Map(all)
			rest.delete(id)
			return rest
		})
	}

	async moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		const id = await this.getItemRowId(itemId)
		await this.apply(this.app.z.mutate.library_item.move({ id, libraryId: rowId(toLibraryId) }))
	}

	/** Releases the thumbnail URLs this source made for items added here. */
	dispose() {
		for (const thumbnail of this.localThumbnails.get().values()) revokeThumbnail(thumbnail)
		for (const { item } of this.pendingItems.get()) {
			if (item.thumbnail) revokeThumbnail(item.thumbnail)
		}
		this.localThumbnails.set(new Map())
		this.pendingItems.set([])
		this.pendingLibraries.set([])
	}

	/** Lists an item being added, under the id its row will have, until the row arrives. */
	private listNewItem(
		libraryId: TLLibraryId,
		newItem: TLNewLibraryItem,
		createdAt: number
	): NewItem {
		const id = uniqueId()
		const contentJson = JSON.stringify(newItem.content)
		const thumbnail =
			newItem.thumbnail && mapThumbnail(newItem.thumbnail, (blob) => URL.createObjectURL(blob))
		const arrival = settleable<boolean>()
		return {
			id,
			newItem,
			contentJson,
			bytes: new Blob([contentJson]).size + getThumbnailBytes(newItem.thumbnail),
			thumbnail,
			pending: {
				item: LibraryItemRecordType.create({
					id: LibraryItemRecordType.createId(id),
					libraryId,
					...(newItem.name ? { name: newItem.name } : {}),
					...(thumbnail ? { thumbnail } : {}),
					createdAt,
				}),
				loadContent: async () => structuredClone(newItem.content),
				arrived: arrival.promise,
			},
			settleArrival: arrival.settle,
		}
	}

	/**
	 * Lists a stored item as its row will be, its thumbnails still the local ones, until the row
	 * arrives.
	 */
	private listStoredItem(adding: NewItem, stored: StoredItem): TLLibraryItem {
		const { id, newItem, pending, thumbnail } = adding
		const listedThumbnail = thumbnail ?? stored.thumbnail
		const item = LibraryItemRecordType.create({
			id: pending.item.id,
			libraryId: pending.item.libraryId,
			...(newItem.name ? { name: newItem.name } : {}),
			...(listedThumbnail ? { thumbnail: listedThumbnail } : {}),
			createdAt: stored.createdAt,
		})
		if (thumbnail) {
			this.localThumbnails.update((all) => new Map(all).set(id, thumbnail))
		}
		this.pendingItems.update((all) => all.map((p) => (p.item.id === item.id ? { ...p, item } : p)))
		this.whenItemRowArrives(id).then(() => {
			this.pendingItems.update((all) => all.filter((p) => p.item.id !== item.id))
			adding.settleArrival(true)
		})
		return item
	}

	private unlistNewItems(adding: NewItem[]) {
		const itemIds = new Set(adding.map((a) => a.pending.item.id))
		this.pendingItems.update((all) => all.filter((p) => !itemIds.has(p.item.id)))
		for (const { thumbnail, settleArrival } of adding) {
			if (thumbnail) revokeThumbnail(thumbnail)
			settleArrival(false)
		}
	}

	private async storeItems(libraryId: TLLibraryId, adding: NewItem[]): Promise<StoredItem[]> {
		const form = new FormData()
		form.set(
			'items',
			JSON.stringify(
				adding.map(({ id, newItem }) => ({ id, ...(newItem.name ? { name: newItem.name } : {}) }))
			)
		)
		for (const { id, newItem, contentJson } of adding) {
			form.set(`content:${id}`, contentJson)
			if (!newItem.thumbnail) continue
			form.set(`thumbnail:${id}`, getThumbnailForColorMode(newItem.thumbnail, 'light'))
			if (!(newItem.thumbnail instanceof Blob)) {
				form.set(`darkThumbnail:${id}`, newItem.thumbnail.dark)
			}
		}
		const response = await this.request(`/api/app/libraries/${rowId(libraryId)}/items`, {
			method: 'POST',
			body: form,
		})
		if (!response.ok) throw new Error(`Couldn't add the items: ${response.status}`)
		const { items } = (await response.json()) as { items: StoredItem[] }
		return items
	}

	/**
	 * A copy of an item to list, under the id its row will have, with the item's thumbnail. Until the
	 * copy is stored, its content is loaded from the item: the copy's is the same, but for owning its
	 * own copies of the uploads it refers to, which a board it's placed on copies again anyway.
	 */
	private listCopiedItem(
		sourceItem: TLLibraryItem,
		libraryId: TLLibraryId,
		libraryArrived: Promise<boolean>
	): PendingItem {
		const id = uniqueId()
		const itemId = LibraryItemRecordType.createId(id)
		const arrived = libraryArrived.then((copied) => copied && this.hasItemRow(id))
		return {
			item: LibraryItemRecordType.create({
				id: itemId,
				libraryId,
				...(sourceItem.name === undefined ? {} : { name: sourceItem.name }),
				...(sourceItem.thumbnail === undefined ? {} : { thumbnail: sourceItem.thumbnail }),
				createdAt: Date.now(),
			}),
			loadContent: async () => {
				try {
					return await this.getItemContent(sourceItem.id)
				} catch (error) {
					// e.g. the item was deleted after it was copied
					if (!(await arrived)) throw error
					return this.getItemContent(itemId)
				}
			},
			arrived,
		}
	}

	private findPendingItem(itemId: TLLibraryItemId) {
		return this.pendingItems.get().find((p) => p.item.id === itemId)
	}

	// The mutators need the item's row in the local store, which a pending item doesn't have yet.
	private async getItemRowId(itemId: TLLibraryItemId) {
		const pending = this.findPendingItem(itemId)
		if (pending && !(await pending.arrived)) throw new LibraryNotFoundError(itemId)
		return rowId(itemId)
	}

	// The mutators need the library's row in the local store, which a copy doesn't have yet.
	private async getLibraryRowId(libraryId: TLLibraryId) {
		const pending = this.pendingLibraries.get().find((p) => p.library.id === libraryId)
		if (pending && !(await pending.arrived)) throw new LibraryNotFoundError(libraryId)
		return rowId(libraryId)
	}

	// Settles once the worker has stored, or failed to store, the items being added to a library.
	private async whenItemsArrive(libraryId: TLLibraryId) {
		const pending = this.pendingItems.get().filter((p) => p.item.libraryId === libraryId)
		await Promise.all(pending.map((p) => p.arrived))
	}

	private whenLibraryRowArrives(id: string) {
		return this.whenTrue('library row arrives', () =>
			this.app.getLibraryRows().some((row) => row.id === id)
		)
	}

	private hasItemRow(id: string) {
		return this.app.getLibraryRows().some((row) => row.items.some((item) => item.id === id))
	}

	private whenItemRowArrives(id: string) {
		return this.whenTrue('library item row arrives', () => this.hasItemRow(id))
	}

	private whenTrue(name: string, isTrue: () => boolean) {
		if (isTrue()) return Promise.resolve()
		return new Promise<void>((resolve) => {
			const stop = react(name, () => {
				if (!isTrue()) return
				stop()
				resolve()
			})
		})
	}

	private async whenConfirmed(libraryId: TLLibraryId) {
		const confirmed = await this.unconfirmedLibraries.get(rowId(libraryId))
		if (confirmed === false) throw new LibraryNotFoundError(libraryId)
	}

	private getTargetOwnerId(target?: TLLibraryTarget) {
		if (target === undefined) return this.getDefaultOwnerId()
		if (typeof target === 'object') return target.ownerId
		return this.getLibraries().find((c) => c.id === target)?.ownerId
	}

	private canManageIn(workspaceId: string) {
		return can(this.app.getWorkspaceMembership(workspaceId)?.role, 'manageLibraries')
	}

	/**
	 * Resolves once Zero has applied a mutation locally, with whether the server goes on to accept
	 * it; if it doesn't, Zero rolls the change back and the app shows why. A mutation that fails
	 * locally rejects, and fails on the server with the same error.
	 */
	private async apply(mutation: MutatorResult): Promise<{ confirmed: Promise<boolean> }> {
		const applied = await mutation.client
		if (applied.type === 'error') {
			throw new Error('The change was rejected', { cause: applied.error })
		}
		const confirmed = mutation.server.then((result) => {
			if (result.type === 'success') return true
			this.app.showMutationRejectionToast(result.error)
			return false
		})
		return { confirmed }
	}

	private async request(path: string, init: RequestInit = {}) {
		const token = await this.getToken()
		const headers = new Headers(init.headers)
		if (token) headers.set('Authorization', `Bearer ${token}`)
		return fetch(path, { ...init, headers })
	}
}
