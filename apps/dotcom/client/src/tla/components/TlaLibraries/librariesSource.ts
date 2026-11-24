import type { MutatorResult } from '@rocicorp/zero'
import {
	can,
	isSvgLibraryThumbnail,
	libraryName,
	MAX_LIBRARY_ITEMS_PER_REQUEST,
	MAX_LIBRARY_ITEMS_REQUEST_BYTES,
	MAX_LIBRARY_NAME_LENGTH,
	type TlaLibrary,
	type TlaLibraryItem,
	type TlaLibraryItemThumbnail,
	ZErrorCode,
} from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	getThumbnailForColorMode,
	mapThumbnail,
	saveErrorMessages,
	trackItemsStoring,
	type LibrarySource,
	type TLCopyLibraryOptions,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemDetails,
	type TLLibraryItemId,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLLibraryThumbnail,
	type TLLibraryItemPartial,
	type TLLibraryThumbnailContext,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { structuredClone } from '@tldraw/utils'
import { atom, computed, defineMessages, fetch, react, transact, uniqueId } from 'tldraw'
import {
	getNetworkCompensation,
	getUserContentImageUrl,
} from '../../../utils/resolveUserContentImageUrl'
import type { TldrawApp } from '../../app/TldrawApp'
import type { TLAppLibraryAction } from '../../utils/app-ui-events'

const messages = defineMessages({
	myStash: { defaultMessage: 'My stash' },
})

// What the server refuses with when an add would take a workspace or library past its limit.
const limitCodes: ReadonlySet<string> = new Set([
	ZErrorCode.max_libraries_reached,
	ZErrorCode.max_library_items_reached,
])

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

/** One library's item rows, synced since its items were first asked for. */
type ItemsWatch = ReturnType<TldrawApp['watchLibraryItems']>

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

// How long a stored item's row may take to arrive before it's taken to have been deleted.
const ITEM_ROW_ARRIVAL_TIMEOUT_MS = 60_000

// A row's id is the record id without its type prefix.
export function rowId(id: TLLibraryId | TLLibraryItemId) {
	return id.slice(id.indexOf(':') + 1)
}

/**
 * A library row as listed. The user's default library is listed as `defaultLibraryName`, whatever
 * its row's name, as it can't be renamed.
 */
export function toLibrary(row: TlaLibrary, defaultLibraryName: string): TLLibrary {
	return LibraryRecordType.create({
		id: LibraryRecordType.createId(row.id),
		name: row.isDefault ? defaultLibraryName : row.name,
		ownerId: row.owningGroupId,
		meta: row.meta ?? {},
	})
}

/** An item row as listed, with `localThumbnail` in place of the row's own when given. */
export function toLibraryItem(item: TlaLibraryItem, localThumbnail?: TLLibraryThumbnail) {
	const thumbnail = localThumbnail ?? item.thumbnail
	return LibraryItemRecordType.create({
		id: LibraryItemRecordType.createId(item.id),
		libraryId: LibraryRecordType.createId(item.libraryId),
		...(item.name ? { name: item.name } : {}),
		...(thumbnail ? { thumbnail } : {}),
		createdAt: item.createdAt,
		meta: item.meta ?? {},
	})
}

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
 * workspace the user is a member of, each named as its workspace is, the home workspace's being
 * private to them. A board's own
 * libraries are kept in its document instead (see editorLibraries), and which libraries a file
 * shows is up to TldrawAppFileLibrariesSource, over this one.
 *
 * Library rows come from the app's libraries query, with each library's first few items and
 * its count of them, and change through mutators. A library's item rows sync only once they're
 * asked for, with {@link TldrawAppLibrariesSource.loadItems}, and stay synced until the source is
 * thrown away; adding to a library or copying it asks for them too.
 * An item's content is stored by the sync worker, which also adds items and copies libraries,
 * and is fetched with the user's token. Its thumbnails are public uploads whose URLs are on its
 * row, so they load as ordinary images.
 *
 * Changes are listed as soon as Zero has applied them locally, and the promises resolve then; a
 * change the server rejects is rolled back and the app shows its mutation error. A new item is
 * listed as soon as it's asked for, with the thumbnails it was given, while the worker stores it,
 * and a copy of a library with its source's name and items' thumbnails while the worker copies
 * it; `addItem` resolves once the item is listed. One the worker can't store disappears, with a
 * toast for an item and `copyLibrary` rejecting for a copy. Changes to either wait until its row
 * has arrived.
 *
 * Items added together are all listed at once and sent in as few requests as the worker allows,
 * one after another, usually one. If a request fails, its items and those after it disappear, with
 * one toast; items an earlier request stored stay.
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
	// Starter packs' copies made here whose items haven't been added yet. The first items added to
	// one are the pack's, sent so the worker keeps the copy's packId; any later ones change it.
	private readonly unfilledPackCopies = new Set<string>()
	// Libraries deleted here that the server hasn't confirmed deleting yet, by row id. If it rejects
	// the delete, the row returns, and so may the rows of items being stored in it.
	private readonly unconfirmedDeletes = atom<ReadonlySet<string>>(
		'unconfirmed library deletes',
		new Set()
	)

	private defaultLibrarySeed: Promise<unknown> | undefined

	// The libraries whose items have been asked for, by row id.
	private readonly itemWatches = atom<ReadonlyMap<string, ItemsWatch>>(
		'library item watches',
		new Map()
	)

	// What's stored under an item's id never changes, so one load serves every later use.
	private readonly itemContents = new Map<TLLibraryItemId, Promise<TLLibraryItemContent>>()

	private readonly owners$ = computed('library owners', (): TLLibraryOwner[] => {
		const homeId = this.app.getHomeWorkspaceId()
		const owners = this.app
			.getWorkspaceMemberships()
			.flatMap((m) => (m.group ? [{ id: m.groupId, name: m.group.name }] : []))
		return [
			...owners.filter((owner) => owner.id === homeId),
			...owners.filter((owner) => owner.id !== homeId),
		]
	})

	private readonly libraries$ = computed('workspace libraries', () => {
		const rows = this.app.getLibraryRows()
		const rowIds = new Set(rows.map((row) => row.id))
		const pending = this.pendingLibraries
			.get()
			.flatMap(({ library }) => (rowIds.has(rowId(library.id)) ? [] : [library]))
		const defaultLibraryName = this.getDefaultLibraryName()
		return [...rows.map((row) => toLibrary(row, defaultLibraryName)), ...pending]
	})

	private readonly libraryRowsById$ = computed(
		'library rows by id',
		() => new Map(this.app.getLibraryRows().map((row) => [row.id, row]))
	)

	// The items of the libraries whose items have been asked for, and items being added anywhere.
	private readonly items$ = computed('workspace library items', () => {
		const localThumbnails = this.localThumbnails.get()
		const byLibrary = new Map<string, TLLibraryItem[]>()
		const itemRowIds = new Set<string>()
		for (const [libraryRowId, watch] of this.itemWatches.get()) {
			byLibrary.set(
				libraryRowId,
				watch.items.get().map((item) => {
					itemRowIds.add(item.id)
					return toLibraryItem(item, localThumbnails.get(item.id))
				})
			)
		}
		for (const { item } of this.pendingItems.get()) {
			if (itemRowIds.has(rowId(item.id))) continue
			const libraryRowId = rowId(item.libraryId)
			const listed = byLibrary.get(libraryRowId)
			if (listed) listed.push(item)
			else byLibrary.set(libraryRowId, [item])
		}
		return byLibrary
	})

	// Who saved each stored item, by its row id, and the workspace whose members can name them.
	private readonly itemCreators$ = computed('library item creators', () => {
		const creators = new Map<string, { userId: string; workspaceId: string }>()
		const rows = this.libraryRowsById$.get()
		for (const row of rows.values()) {
			for (const item of row.items) {
				creators.set(item.id, { userId: item.createdBy, workspaceId: row.owningGroupId })
			}
		}
		for (const [libraryRowId, watch] of this.itemWatches.get()) {
			const workspaceId = rows.get(libraryRowId)?.owningGroupId
			if (workspaceId === undefined) continue
			for (const item of watch.items.get()) {
				creators.set(item.id, { userId: item.createdBy, workspaceId })
			}
		}
		return creators
	})

	constructor(
		private readonly app: TldrawApp,
		private readonly getToken: () => Promise<string | undefined>
	) {}

	getLibraries() {
		return this.libraries$.get()
	}

	/** Only the items being added, until the library's items are asked for with `loadItems`. */
	getItems(libraryId: TLLibraryId) {
		return this.items$.get().get(rowId(libraryId)) ?? []
	}

	/**
	 * Starts syncing a library's items, of a library of the user's workspaces or one added to a file
	 * they can open, and keeps them synced until the source is thrown away.
	 */
	loadItems(libraryId: TLLibraryId) {
		const id = rowId(libraryId)
		if (this.itemWatches.get().has(id)) return
		const watch = this.app.watchLibraryItems(id)
		this.itemWatches.update((all) => new Map(all).set(id, watch))
	}

	/** Whether a library's item rows have synced, so its listing is complete. */
	areItemsLoaded(libraryId: TLLibraryId) {
		const watch = this.itemWatches.get().get(rowId(libraryId))
		return !!watch && watch.loaded.get()
	}

	isLoadingItems(libraryId: TLLibraryId) {
		if (this.areItemsLoaded(libraryId)) return false
		return (this.libraryRowsById$.get().get(rowId(libraryId))?.itemCount ?? 0) > 0
	}

	/** From the library's row until its items are loaded, with the items being added to it. */
	getItemCount(libraryId: TLLibraryId) {
		if (this.areItemsLoaded(libraryId)) return this.getItems(libraryId).length
		const stored = this.libraryRowsById$.get().get(rowId(libraryId))?.itemCount ?? 0
		return stored + this.getPendingItems(libraryId).length
	}

	/** The first items the libraries query has of it until its items are loaded. */
	getPreviewItems(libraryId: TLLibraryId, count: number) {
		if (this.areItemsLoaded(libraryId)) return this.getItems(libraryId).slice(0, count)
		const localThumbnails = this.localThumbnails.get()
		const previews = (this.libraryRowsById$.get().get(rowId(libraryId))?.items ?? []).map((item) =>
			toLibraryItem(item, localThumbnails.get(item.id))
		)
		return [...previews, ...this.getPendingItems(libraryId)].slice(0, count)
	}

	// Items being added to the library, or copied into it, whose rows haven't arrived.
	private getPendingItems(libraryId: TLLibraryId) {
		const rowIds = new Set(this.getItemRows(rowId(libraryId)).map((item) => item.id))
		return this.pendingItems
			.get()
			.filter((p) => p.item.libraryId === libraryId && !rowIds.has(rowId(p.item.id)))
			.map((p) => p.item)
	}

	getItemDetails(item: TLLibraryItem): TLLibraryItemDetails {
		const creator = this.itemCreators$.get().get(rowId(item.id))
		if (!creator) return {}
		const member = this.app
			.getWorkspaceMembership(creator.workspaceId)
			?.groupMembers.find((m) => m.userId === creator.userId)
		return member ? { creatorName: member.userName } : {}
	}

	async getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		const pending = this.findPendingItem(itemId)
		if (pending) return pending.loadContent()
		let loading = this.itemContents.get(itemId)
		if (!loading) {
			loading = this.loadItemContent(itemId)
			this.itemContents.set(itemId, loading)
			loading.catch(() => this.itemContents.delete(itemId))
		}
		return loading
	}

	private async loadItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent> {
		const response = await this.request(`/api/app/library-items/${rowId(itemId)}/content`)
		if (response.status === 404) throw new LibraryNotFoundError(itemId)
		if (!response.ok) throw new Error(`Couldn't load the item: ${response.status}`)
		return (await response.json()) as TLLibraryItemContent
	}

	/** The colour mode's thumbnail, resized for the tile as a board's images are. */
	resolveThumbnail(item: TLLibraryItem, context: TLLibraryThumbnailContext) {
		if (!item.thumbnail) return null
		const src = getThumbnailForColorMode(item.thumbnail, context.colorMode)
		const networkCompensation = getNetworkCompensation(context.networkEffectiveType)
		return getUserContentImageUrl(src, {
			width: Math.ceil(context.width * context.dpr * networkCompensation),
			isVector: isSvgLibraryThumbnail(src),
		})
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		const changesDefault = action === 'deleteLibrary' || action === 'renameLibrary'
		if (changesDefault && typeof target === 'string' && this.isDefaultLibrary(target)) return false
		// Otherwise every member of a workspace can manage its libraries, so the action doesn't matter.
		const ownerId = this.getTargetOwnerId(target)
		return ownerId !== undefined && this.canManageIn(ownerId)
	}

	getLibraryOwners() {
		return this.owners$.get()
	}

	getDefaultOwnerId() {
		return this.app.getHomeWorkspaceId()
	}

	/** What a new default library is called. */
	getDefaultLibraryName() {
		return this.app.msg(messages.myStash)
	}

	/**
	 * Gives the user their default library, "My stash", in their home workspace, unless they have
	 * one. Call it once the libraries have synced, so an unsynced list isn't taken for one without
	 * it. Concurrent calls share one creation, and the mutator creates none once there is one, so tabs
	 * that race end up with one.
	 */
	ensureDefaultLibrary() {
		if (this.defaultLibrarySeed) return
		const homeId = this.app.getHomeWorkspaceId()
		const rows = this.app.getLibraryRows()
		if (rows.some((row) => row.isDefault && row.owningGroupId === homeId)) return
		this.defaultLibrarySeed = this.apply(
			this.app.z.mutate.library.ensureDefault({
				id: uniqueId(),
				name: this.getDefaultLibraryName(),
			}),
			undefined
		)
			.then(({ confirmed }) => confirmed)
			.catch((error) => console.error("Couldn't create the default library", error))
			.finally(() => {
				this.defaultLibrarySeed = undefined
			})
	}

	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (!this.canManageIn(ownerId)) throw new LibraryPermissionError('createLibrary')
		const id = uniqueId()
		const meta = options.meta ?? {}
		if (meta.packId !== undefined) this.unfilledPackCopies.add(id)
		const { confirmed } = await this.apply(
			this.app.z.mutate.library.create({ id, name, owningGroupId: ownerId, meta }),
			'create-library',
			'new',
			{ action: 'createLibrary' }
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
			name: libraryName(name),
			ownerId,
			meta,
		})
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		if (this.isDefaultLibrary(libraryId)) {
			throw new LibraryPermissionError('renameLibrary', libraryId)
		}
		const id = await this.getLibraryRowId(libraryId)
		await this.apply(this.app.z.mutate.library.rename({ id, name }), 'rename-library')
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		if (this.isDefaultLibrary(libraryId)) {
			throw new LibraryPermissionError('deleteLibrary', libraryId)
		}
		const id = await this.getLibraryRowId(libraryId)
		const itemIds = this.getItems(libraryId).map((item) => rowId(item.id))
		this.unconfirmedDeletes.update((all) => new Set(all).add(id))
		const forget = () =>
			this.unconfirmedDeletes.update((all) => {
				const rest = new Set(all)
				rest.delete(id)
				return rest
			})
		try {
			const { confirmed } = await this.apply(
				this.app.z.mutate.library.delete({ id }),
				'delete-library'
			)
			confirmed.then(forget)
		} catch (error) {
			forget()
			throw error
		}
		this.releaseLocalThumbnails(itemIds)
	}

	async copyLibrary(
		libraryId: TLLibraryId,
		ownerId: string,
		options: TLCopyLibraryOptions = {}
	): Promise<TLLibrary> {
		const source = this.getLibraries().find((c) => c.id === libraryId)
		if (!source) throw new LibraryNotFoundError(libraryId)
		if (!this.canManageIn(ownerId)) throw new LibraryPermissionError('createLibrary')
		// Listed at once when the source's items are loaded, as they are once it's been added to.
		this.loadItems(libraryId)
		if (!this.areItemsLoaded(libraryId)) await this.whenItemsLoaded(libraryId)
		const sourceItems = this.getItems(libraryId)

		const id = uniqueId()
		// Dropped so the copy isn't taken for the pack's untouched copy, as the worker does.
		const { packId: _packId, ...meta } = source.meta
		const name = getCopyName(source.name, options)
		const library = LibraryRecordType.create({
			id: LibraryRecordType.createId(id),
			name,
			ownerId,
			meta,
		})
		const arrival = settleable<boolean>()
		const copies = new Set<PendingItem>()
		const itemIds: Record<string, string> = {}
		for (const sourceItem of sourceItems) {
			const copy = this.listCopiedItem(sourceItem, library.id, arrival.promise)
			copies.add(copy)
			itemIds[rowId(sourceItem.id)] = rowId(copy.item.id)
		}
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
			this.pendingItems.update((all) => all.filter((p) => !copies.has(p)))
		}

		try {
			await this.whenConfirmed(libraryId)
			await this.whenItemsArrive(libraryId)
			const response = await this.request(`/api/app/libraries/${rowId(libraryId)}/copy`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ owningGroupId: ownerId, id, name, itemIds }),
			})
			if (!response.ok) {
				await this.throwIfResponseAtLimit(response, 'createLibrary')
				throw new Error(`Couldn't copy the library: ${response.status}`)
			}
		} catch (error) {
			unlist()
			arrival.settle(false)
			throw error
		}

		// The copies stay listed until the copy's own items have synced in their place.
		this.whenLibraryRowArrives(id)
			.then(() => this.whenItemsLoaded(library.id))
			.then(() => {
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
		this.loadItems(libraryId)
		const now = Date.now()
		const adding = newItems.map((newItem, index) =>
			this.listNewItem(libraryId, newItem, now + index)
		)
		this.pendingItems.update((all) => [...all, ...adding.map((a) => a.pending)])
		const items = adding.map((a) => a.pending.item)
		const fillsPackCopy = this.unfilledPackCopies.delete(rowId(libraryId))
		const stored = this.storeNewItems(libraryId, adding, fillsPackCopy)
		trackItemsStoring(
			items.map((item) => item.id),
			stored
		)
		stored.catch((error) => {
			// A limit was explained when the worker refused it.
			if (error instanceof LibraryPermissionError) return
			this.app.toasts?.addToast({
				title: this.app.msg(saveErrorMessages.saveErrorTitle),
				severity: 'error',
			})
			console.error("Couldn't add library items", error)
		})
		return items
	}

	async updateItem(itemId: TLLibraryItemId, { name, meta }: TLLibraryItemPartial) {
		const id = await this.getItemRowId(itemId)
		await this.apply(
			this.app.z.mutate.library_item.update({ id, name, meta }),
			name === undefined ? undefined : 'rename-library-item'
		)
	}

	async deleteItem(itemId: TLLibraryItemId) {
		const id = await this.getItemRowId(itemId)
		await this.apply(this.app.z.mutate.library_item.delete({ id }), 'delete-library-item')
		this.releaseLocalThumbnails([id])
	}

	async moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		const [id, libraryId] = await Promise.all([
			this.getItemRowId(itemId),
			this.getLibraryRowId(toLibraryId),
		])
		await this.apply(
			this.app.z.mutate.library_item.move({ id, libraryId }),
			'move-library-item',
			undefined,
			{ action: 'addItem', libraryId: toLibraryId }
		)
	}

	/** Stops syncing the libraries' items, and releases the thumbnail URLs made for items added here. */
	dispose() {
		for (const watch of this.itemWatches.get().values()) watch.stop()
		this.itemWatches.set(new Map())
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
					...(newItem.meta ? { meta: newItem.meta } : {}),
				}),
				loadContent: async () => structuredClone(newItem.content),
				arrived: arrival.promise,
			},
			settleArrival: arrival.settle,
		}
	}

	/**
	 * Lists stored items as their rows will be, their thumbnails still the local ones, until the rows
	 * arrive.
	 */
	private listStoredItems(libraryId: TLLibraryId, adding: NewItem[], stored: StoredItem[]) {
		const items = new Map<TLLibraryItemId, TLLibraryItem>()
		adding.forEach(({ newItem, pending, thumbnail }, index) => {
			const listedThumbnail = thumbnail ?? stored[index].thumbnail
			items.set(
				pending.item.id,
				LibraryItemRecordType.create({
					id: pending.item.id,
					libraryId: pending.item.libraryId,
					...(newItem.name ? { name: newItem.name } : {}),
					...(listedThumbnail ? { thumbnail: listedThumbnail } : {}),
					createdAt: stored[index].createdAt,
					...(newItem.meta ? { meta: newItem.meta } : {}),
				})
			)
		})
		transact(() => {
			this.localThumbnails.update((all) => {
				const next = new Map(all)
				for (const { id, thumbnail } of adding) {
					if (thumbnail) next.set(id, thumbnail)
				}
				return next
			})
			this.pendingItems.update((all) =>
				all.map((p) => {
					const item = items.get(p.item.id)
					return item ? { ...p, item } : p
				})
			)
		})
		this.unlistWhenRowsArrive(libraryId, adding)
	}

	/**
	 * Unlists stored items once their rows arrive, or once their library's row is gone, which is here
	 * when this starts as storeNewItems waited for it. A library deleted here is only gone once the
	 * server confirms the delete. An item whose row hasn't arrived after ITEM_ROW_ARRIVAL_TIMEOUT_MS,
	 * as when a collaborator deleted it, is unlisted as gone.
	 */
	private unlistWhenRowsArrive(libraryId: TLLibraryId, adding: NewItem[]) {
		const libraryRowId = rowId(libraryId)
		const awaiting = new Set(adding)
		const settle = (settled: NewItem[], itemRowIds: ReadonlySet<string>) => {
			for (const a of settled) awaiting.delete(a)
			if (awaiting.size === 0) {
				stop()
				clearTimeout(timeout)
			}
			const settledIds = new Set(settled.map((a) => a.pending.item.id))
			this.pendingItems.update((all) => all.filter((p) => !settledIds.has(p.item.id)))
			const gone = settled.filter((a) => !itemRowIds.has(a.id))
			this.releaseLocalThumbnails(gone.map((a) => a.id))
			for (const a of settled) a.settleArrival(itemRowIds.has(a.id))
		}
		const stop = react('library item rows arrive', () => {
			const libraryGone =
				!this.libraryRowsById$.get().has(libraryRowId) &&
				!this.unconfirmedDeletes.get().has(libraryRowId)
			const itemRowIds = new Set(this.getItemRows(libraryRowId).map((item) => item.id))
			const settled = [...awaiting].filter((a) => libraryGone || itemRowIds.has(a.id))
			if (settled.length === 0) return
			for (const a of settled) awaiting.delete(a)
			Promise.resolve().then(() => settle(settled, itemRowIds))
		})
		const timeout = setTimeout(() => settle([...awaiting], new Set()), ITEM_ROW_ARRIVAL_TIMEOUT_MS)
	}

	private releaseLocalThumbnails(itemRowIds: string[]) {
		const localThumbnails = this.localThumbnails.get()
		const released = itemRowIds.filter((id) => localThumbnails.has(id))
		if (released.length === 0) return
		for (const id of released) revokeThumbnail(localThumbnails.get(id)!)
		this.localThumbnails.update((all) => {
			const rest = new Map(all)
			for (const id of released) rest.delete(id)
			return rest
		})
	}

	private unlistNewItems(adding: NewItem[]) {
		const itemIds = new Set(adding.map((a) => a.pending.item.id))
		this.pendingItems.update((all) => all.filter((p) => !itemIds.has(p.item.id)))
		for (const { thumbnail, settleArrival } of adding) {
			if (thumbnail) revokeThumbnail(thumbnail)
			settleArrival(false)
		}
	}

	// Unlists the items of a request that fails, and those after it.
	private async storeNewItems(libraryId: TLLibraryId, adding: NewItem[], fillsPackCopy: boolean) {
		let storedCount = 0
		try {
			await this.whenConfirmed(libraryId)
			for (const request of splitIntoRequests(adding)) {
				const stored = await this.storeItems(libraryId, request, fillsPackCopy)
				this.listStoredItems(libraryId, request, stored)
				storedCount += request.length
			}
		} catch (error) {
			this.unlistNewItems(adding.slice(storedCount))
			throw error
		}
	}

	private async storeItems(
		libraryId: TLLibraryId,
		adding: NewItem[],
		fillsPackCopy: boolean
	): Promise<StoredItem[]> {
		const form = new FormData()
		if (fillsPackCopy) form.set('fillsPackCopy', 'true')
		form.set(
			'items',
			JSON.stringify(
				adding.map(({ id, newItem }) => ({ id, ...(newItem.name ? { name: newItem.name } : {}) }))
			)
		)
		for (const { id, newItem, contentJson } of adding) {
			form.set(`content:${id}`, contentJson)
			if (newItem.meta) form.set(`meta:${id}`, JSON.stringify(newItem.meta))
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
		if (!response.ok) {
			await this.throwIfResponseAtLimit(response, 'addItem', libraryId)
			throw new Error(`Couldn't add the items: ${response.status}`)
		}
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
		const arrived = libraryArrived.then(
			async (copied) =>
				copied && (await this.whenItemsLoaded(libraryId)) && this.hasItemRow(libraryId, id)
		)
		return {
			item: LibraryItemRecordType.create({
				id: itemId,
				libraryId,
				...(sourceItem.name === undefined ? {} : { name: sourceItem.name }),
				...(sourceItem.thumbnail === undefined ? {} : { thumbnail: sourceItem.thumbnail }),
				createdAt: Date.now(),
				meta: sourceItem.meta,
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

	/**
	 * Resolves once the library's row is in the local store, where mutators need it, with whether
	 * it arrived: a copy's arrives after the worker stores it, and not at all if copying fails.
	 */
	async waitForLibraryRow(libraryId: TLLibraryId) {
		const pending = this.pendingLibraries.get().find((p) => p.library.id === libraryId)
		return pending ? pending.arrived : true
	}

	private async getLibraryRowId(libraryId: TLLibraryId) {
		if (!(await this.waitForLibraryRow(libraryId))) throw new LibraryNotFoundError(libraryId)
		return rowId(libraryId)
	}

	// Settles once the worker has stored, or failed to store, the items being added to a library.
	private async whenItemsArrive(libraryId: TLLibraryId) {
		const pending = this.pendingItems.get().filter((p) => p.item.libraryId === libraryId)
		await Promise.all(pending.map((p) => p.arrived))
	}

	private hasLibraryRow(id: string) {
		return this.libraryRowsById$.get().has(id)
	}

	private whenLibraryRowArrives(id: string) {
		return this.whenTrue('library row arrives', () => this.hasLibraryRow(id))
	}

	// The library's synced item rows, empty until its items are asked for.
	private getItemRows(libraryRowId: string) {
		const watch = this.itemWatches.get().get(libraryRowId)
		return watch ? watch.items.get() : []
	}

	private hasItemRow(libraryId: TLLibraryId, id: string) {
		return this.getItemRows(rowId(libraryId)).some((item) => item.id === id)
	}

	/** Asks for a library's items, and resolves once they have synced, with true. */
	private async whenItemsLoaded(libraryId: TLLibraryId) {
		this.loadItems(libraryId)
		await this.whenTrue('library items load', () => this.areItemsLoaded(libraryId))
		return true
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

	private isDefaultLibrary(libraryId: TLLibraryId) {
		const id = rowId(libraryId)
		return this.app.getLibraryRows().some((row) => row.id === id && row.isDefault)
	}

	private canManageIn(workspaceId: string) {
		return can(this.app.getWorkspaceMembership(workspaceId)?.role, 'manageLibraries')
	}

	/**
	 * Resolves once Zero has applied a mutation locally, with whether the server goes on to accept
	 * it; if it doesn't, Zero rolls the change back and the app shows why. A mutation that fails
	 * locally rejects, and fails on the server with the same error. A rejection is reported as
	 * `library-error` for `action`, with `method` for a create. Refused locally for taking a
	 * workspace or library past its limit, it rejects with a LibraryPermissionError for `limit`.
	 */
	async apply(
		mutation: MutatorResult,
		action: TLAppLibraryAction | undefined,
		method?: 'new',
		limit?: { action: TLLibraryAction; libraryId?: TLLibraryId }
	): Promise<{ confirmed: Promise<boolean> }> {
		const applied = await mutation.client
		if (applied.type === 'error') {
			if (limit && applied.error.type === 'app') {
				this.throwIfAtLimit(applied.error.message, limit.action, limit.libraryId)
			}
			throw new Error('The change was rejected', { cause: applied.error })
		}
		const confirmed = mutation.server.then((result) => {
			if (result.type === 'success') return true
			if (action) {
				this.app.trackEvent('library-error', {
					source: 'libraries',
					action,
					...(method ? { method } : {}),
					reason: 'rejected',
				})
			}
			this.app.showMutationRejectionToast(result.error)
			return false
		})
		return { confirmed }
	}

	// A refusal for a limit gets the app's toast explaining it, and counts as the user not being
	// allowed to rather than as a failure.
	private throwIfAtLimit(code: unknown, action: TLLibraryAction, libraryId?: TLLibraryId) {
		if (typeof code !== 'string' || !limitCodes.has(code)) return
		this.app.showMutationRejectionToast({ type: 'app', message: code, details: undefined })
		throw new LibraryPermissionError(action, libraryId)
	}

	private async throwIfResponseAtLimit(
		response: Response,
		action: TLLibraryAction,
		libraryId?: TLLibraryId
	) {
		if (response.status !== 409) return
		const body = (await response.json().catch(() => null)) as { error?: unknown } | null
		this.throwIfAtLimit(body?.error, action, libraryId)
	}

	private async request(path: string, init: RequestInit = {}) {
		const token = await this.getToken()
		const headers = new Headers(init.headers)
		if (token) headers.set('Authorization', `Bearer ${token}`)
		return fetch(path, { ...init, headers })
	}
}

/** A copy's name, the library's shortened as needed so that the whole of it is stored. */
export function getCopyName(name: string, { getName }: TLCopyLibraryOptions) {
	if (!getName) return name
	const room = Math.max(MAX_LIBRARY_NAME_LENGTH - getName('').length, 1)
	return libraryName(getName(name.trim().slice(0, room)))
}
