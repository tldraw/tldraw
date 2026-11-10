import type { MutatorResultErrorDetails } from '@rocicorp/zero'
import { can, type TlaLibrary, type TlaLibraryItemThumbnail } from '@tldraw/dotcom-shared'
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

type MutationResult = { type: 'success' } | MutatorResultErrorDetails

interface StoredItem {
	createdAt: number
	thumbnail: TlaLibraryItemThumbnail | null
}

/** An item being added, under the id its row will have: listed until the row arrives through Zero. */
interface PendingItem {
	item: TLLibraryItem
	content: TLLibraryItemContent
	/** Whether the row arrived: false when adding failed. */
	arrived: Promise<boolean>
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
 * A new library is listed as soon as Zero has applied it locally, and a new item as soon as it's
 * asked for, with the thumbnails it was given, while the worker stores it. A library the server
 * rejects disappears and the app shows its mutation error; an item the worker can't store
 * disappears and `addItem` rejects.
 */
export class TldrawAppLibrariesSource implements LibrarySource {
	readonly id = 'dotcom-workspaces'

	private readonly pendingItems = atom<PendingItem[]>('pending library items', [])
	// Object URLs of thumbnails added here, by item row id, listed instead of the uploaded copies so
	// a tile doesn't blank while those load.
	private readonly localThumbnails = atom<ReadonlyMap<string, TLLibraryThumbnail>>(
		'local library item thumbnails',
		new Map()
	)
	// Libraries created here that the server hasn't confirmed yet, by row id. The worker can't add
	// items to them or copy them until it has.
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

	private readonly libraries$ = computed('workspace libraries', () =>
		this.app.getLibraryRows().map(toLibrary)
	)

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
		if (pending) return structuredClone(pending.content)
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
		const mutation = this.app.z.mutate.library.create({ id, name, owningGroupId: ownerId, meta })
		await this.check(mutation.client)
		this.unconfirmedLibraries.set(
			id,
			(mutation.server as Promise<MutationResult>).then((result) => {
				this.unconfirmedLibraries.delete(id)
				if (result.type === 'success') return true
				this.app.showMutationRejectionToast(result.error)
				return false
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
		await this.check(this.app.z.mutate.library.rename({ id: rowId(libraryId), name }).server)
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		await this.check(this.app.z.mutate.library.delete({ id: rowId(libraryId) }).server)
	}

	async moveLibrary(libraryId: TLLibraryId, ownerId: string) {
		await this.check(
			this.app.z.mutate.library.move({ id: rowId(libraryId), owningGroupId: ownerId }).server
		)
	}

	async copyLibrary(libraryId: TLLibraryId, ownerId: string): Promise<TLLibrary> {
		const library = this.findRow(libraryId)
		if (!library) throw new LibraryNotFoundError(libraryId)
		await this.whenConfirmed(libraryId)
		const response = await this.request(`/api/app/libraries/${rowId(libraryId)}/copy`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ owningGroupId: ownerId }),
		})
		if (!response.ok) throw new Error(`Couldn't copy the library: ${response.status}`)
		const { id } = (await response.json()) as { id: string }
		return toLibrary({ ...library, id, owningGroupId: ownerId })
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		if (!this.can('addItem', libraryId)) {
			throw new LibraryPermissionError('addItem', libraryId)
		}
		const thumbnail =
			newItem.thumbnail && mapThumbnail(newItem.thumbnail, (blob) => URL.createObjectURL(blob))
		const name = newItem.name ? { name: newItem.name } : {}
		const id = uniqueId()
		const itemId = LibraryItemRecordType.createId(id)
		let arrive: (arrived: boolean) => void = () => {}
		const pending: PendingItem = {
			item: LibraryItemRecordType.create({
				id: itemId,
				libraryId,
				...name,
				...(thumbnail ? { thumbnail } : {}),
				createdAt: Date.now(),
			}),
			content: newItem.content,
			arrived: new Promise((resolve) => {
				arrive = resolve
			}),
		}
		this.pendingItems.update((all) => [...all, pending])

		let stored: StoredItem
		try {
			await this.whenConfirmed(libraryId)
			stored = await this.storeItem(id, libraryId, newItem)
		} catch (error) {
			this.pendingItems.update((all) => all.filter((p) => p.item.id !== itemId))
			if (thumbnail) revokeThumbnail(thumbnail)
			arrive(false)
			throw error
		}

		const listedThumbnail = thumbnail ?? stored.thumbnail
		const item = LibraryItemRecordType.create({
			id: itemId,
			libraryId,
			...name,
			...(listedThumbnail ? { thumbnail: listedThumbnail } : {}),
			createdAt: stored.createdAt,
		})
		if (thumbnail) {
			this.localThumbnails.update((all) => new Map(all).set(id, thumbnail))
		}
		this.pendingItems.update((all) => all.map((p) => (p.item.id === itemId ? { ...p, item } : p)))
		this.whenItemRowArrives(id).then(() => {
			this.pendingItems.update((all) => all.filter((p) => p.item.id !== itemId))
			arrive(true)
		})
		return item
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		const id = await this.getItemRowId(itemId)
		await this.check(this.app.z.mutate.library_item.rename({ id, name }).server)
	}

	async deleteItem(itemId: TLLibraryItemId) {
		const id = await this.getItemRowId(itemId)
		await this.check(this.app.z.mutate.library_item.delete({ id }).server)
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
		await this.check(
			this.app.z.mutate.library_item.move({ id, libraryId: rowId(toLibraryId) }).server
		)
	}

	/** Releases the thumbnail URLs this source made for items added here. */
	dispose() {
		for (const thumbnail of this.localThumbnails.get().values()) revokeThumbnail(thumbnail)
		for (const { item } of this.pendingItems.get()) {
			if (item.thumbnail) revokeThumbnail(item.thumbnail)
		}
		this.localThumbnails.set(new Map())
		this.pendingItems.set([])
	}

	private async storeItem(
		id: string,
		libraryId: TLLibraryId,
		newItem: TLNewLibraryItem
	): Promise<StoredItem> {
		const form = new FormData()
		form.set('id', id)
		form.set('content', JSON.stringify(newItem.content))
		if (newItem.thumbnail) {
			form.set('thumbnail', getThumbnailForColorMode(newItem.thumbnail, 'light'))
			if (!(newItem.thumbnail instanceof Blob)) form.set('darkThumbnail', newItem.thumbnail.dark)
		}
		if (newItem.name) form.set('name', newItem.name)
		const response = await this.request(`/api/app/libraries/${rowId(libraryId)}/items`, {
			method: 'POST',
			body: form,
		})
		if (!response.ok) throw new Error(`Couldn't add the item: ${response.status}`)
		return (await response.json()) as StoredItem
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

	private hasItemRow(id: string) {
		return this.app.getLibraryRows().some((row) => row.items.some((item) => item.id === id))
	}

	private whenItemRowArrives(id: string) {
		if (this.hasItemRow(id)) return Promise.resolve()
		return new Promise<void>((resolve) => {
			const stop = react('library item row arrives', () => {
				if (!this.hasItemRow(id)) return
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
		return this.findRow(target)?.owningGroupId
	}

	private findRow(libraryId: TLLibraryId) {
		const id = rowId(libraryId)
		return this.app.getLibraryRows().find((row) => row.id === id)
	}

	private canManageIn(workspaceId: string) {
		return can(this.app.getWorkspaceMembership(workspaceId)?.role, 'manageLibraries')
	}

	// Zero's mutation promises resolve with an error result rather than rejecting.
	private async check(result: Promise<MutationResult>) {
		const outcome = await result
		if (outcome.type === 'error') {
			throw new Error('The change was rejected', { cause: outcome.error })
		}
	}

	private async request(path: string, init: RequestInit = {}) {
		const token = await this.getToken()
		const headers = new Headers(init.headers)
		if (token) headers.set('Authorization', `Bearer ${token}`)
		return fetch(path, { ...init, headers })
	}
}
