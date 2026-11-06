import {
	CollectionItemRecordType,
	CollectionNotFoundError,
	CollectionPermissionError,
	CollectionRecordType,
	type CollectionSource,
	type TLCollection,
	type TLCollectionAction,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLCollectionOwner,
	type TLNewCollectionItem,
	type TLNewCollectionOptions,
} from '@tldraw/collections'
import { can, type TlaCollection } from '@tldraw/dotcom-shared'
import { atom, computed, defineMessages, fetch, react, uniqueId } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	privateToYou: { defaultMessage: 'Private to you' },
})

interface MutationResult {
	type: string
	error?: unknown
}

// A row's id is the record id without its type prefix.
const rowId = (id: TLCollectionId | TLCollectionItemId) => id.slice(id.indexOf(':') + 1)

const toCollection = (row: TlaCollection): TLCollection =>
	CollectionRecordType.create({
		id: CollectionRecordType.createId(row.id),
		name: row.name,
		ownerId: row.owningGroupId,
		meta: row.meta ?? {},
	})

/**
 * Workspace collections, kept in tldraw.com's database and synced through Zero: those of every
 * workspace the user is a member of, the home workspace's being private to them. A board's own
 * collections are kept in its document instead (see editorCollections).
 *
 * Collections and item rows come from the app's collections query and change through mutators.
 * An item's content and thumbnail are stored by the sync worker, which also adds items and copies
 * collections, and are fetched with the user's token; thumbnails are loaded into object URLs.
 */
export class TldrawAppCollectionsSource implements CollectionSource {
	readonly id = 'dotcom-workspaces'

	/** Object URLs of loaded thumbnails, by item row id. */
	private readonly thumbnailUrls = atom<Record<string, string>>('collection thumbnails', {})
	private readonly requestedThumbnails = new Set<string>()
	private readonly stopLoadingThumbnails: () => void

	private readonly owners$ = computed('collection owners', (): TLCollectionOwner[] => {
		const homeId = this.app.getHomeWorkspaceId()
		const memberships = this.app.getWorkspaceMemberships()
		// The collections UI names the home workspace for who sees it, not by its name.
		return [
			{ id: homeId, name: this.app.msg(messages.privateToYou), private: true },
			...memberships.flatMap((m) =>
				m.groupId !== homeId && m.group ? [{ id: m.groupId, name: m.group.name }] : []
			),
		]
	})

	private readonly collections$ = computed('workspace collections', () =>
		this.app.getCollectionRows().map(toCollection)
	)

	private readonly items$ = computed('workspace collection items', () => {
		const thumbnailUrls = this.thumbnailUrls.get()
		const byCollection = new Map<string, TLCollectionItem[]>()
		for (const row of this.app.getCollectionRows()) {
			byCollection.set(
				row.id,
				row.items.map((item) =>
					CollectionItemRecordType.create({
						id: CollectionItemRecordType.createId(item.id),
						collectionId: CollectionRecordType.createId(row.id),
						...(item.name ? { name: item.name } : {}),
						...(thumbnailUrls[item.id] ? { thumbnailUrl: thumbnailUrls[item.id] } : {}),
						createdAt: item.createdAt,
					})
				)
			)
		}
		return byCollection
	})

	constructor(
		private readonly app: TldrawApp,
		private readonly getToken: () => Promise<string | undefined>
	) {
		this.stopLoadingThumbnails = react('load collection thumbnails', () => {
			for (const row of this.app.getCollectionRows()) {
				for (const item of row.items) {
					if (!item.thumbnailType || this.requestedThumbnails.has(item.id)) continue
					this.requestedThumbnails.add(item.id)
					void this.loadThumbnail(item.id)
				}
			}
		})
	}

	getCollections() {
		return this.collections$.get()
	}

	getItems(collectionId: TLCollectionId) {
		return this.items$.get().get(rowId(collectionId)) ?? []
	}

	async getItemContent(itemId: TLCollectionItemId): Promise<TLCollectionItemContent> {
		const response = await this.request(`/api/app/collection-items/${rowId(itemId)}/content`)
		if (response.status === 404) throw new CollectionNotFoundError(itemId)
		if (!response.ok) throw new Error(`Couldn't load the item: ${response.status}`)
		return (await response.json()) as TLCollectionItemContent
	}

	can(_action: TLCollectionAction, collectionId?: TLCollectionId) {
		// Every member of a workspace can manage its collections, so the action doesn't matter.
		const ownerId =
			collectionId === undefined
				? this.getDefaultOwnerId()
				: this.findRow(collectionId)?.owningGroupId
		return ownerId !== undefined && this.canManageIn(ownerId)
	}

	getCollectionOwners() {
		return this.owners$.get()
	}

	getDefaultOwnerId() {
		return this.app.getHomeWorkspaceId()
	}

	async createCollection(name: string, options: TLNewCollectionOptions = {}) {
		const ownerId = options.ownerId ?? this.getDefaultOwnerId()
		if (!this.canManageIn(ownerId)) throw new CollectionPermissionError('createCollection')
		const id = uniqueId()
		const meta = options.meta ?? {}
		await this.check(
			this.app.z.mutate.collection.create({ id, name, owningGroupId: ownerId, meta }).server
		)
		return CollectionRecordType.create({
			id: CollectionRecordType.createId(id),
			name: name.trim(),
			ownerId,
			meta,
		})
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		await this.check(this.app.z.mutate.collection.rename({ id: rowId(collectionId), name }).server)
	}

	async deleteCollection(collectionId: TLCollectionId) {
		await this.check(this.app.z.mutate.collection.delete({ id: rowId(collectionId) }).server)
	}

	async moveCollection(collectionId: TLCollectionId, ownerId: string) {
		await this.check(
			this.app.z.mutate.collection.move({ id: rowId(collectionId), owningGroupId: ownerId }).server
		)
	}

	async copyCollection(collectionId: TLCollectionId, ownerId: string): Promise<TLCollection> {
		const collection = this.findRow(collectionId)
		if (!collection) throw new CollectionNotFoundError(collectionId)
		const response = await this.request(`/api/app/collections/${rowId(collectionId)}/copy`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ owningGroupId: ownerId }),
		})
		if (!response.ok) throw new Error(`Couldn't copy the collection: ${response.status}`)
		const { id } = (await response.json()) as { id: string }
		return toCollection({ ...collection, id, owningGroupId: ownerId })
	}

	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		if (!this.can('addItem', collectionId)) {
			throw new CollectionPermissionError('addItem', collectionId)
		}
		const form = new FormData()
		form.set('content', JSON.stringify(newItem.content))
		if (newItem.thumbnail) form.set('thumbnail', newItem.thumbnail)
		if (newItem.name) form.set('name', newItem.name)
		const response = await this.request(`/api/app/collections/${rowId(collectionId)}/items`, {
			method: 'POST',
			body: form,
		})
		if (!response.ok) throw new Error(`Couldn't add the item: ${response.status}`)
		const { id, createdAt } = (await response.json()) as { id: string; createdAt: number }
		// The row arrives through Zero; the thumbnail is already here.
		if (newItem.thumbnail) this.setThumbnail(id, newItem.thumbnail)
		const thumbnailUrl = this.thumbnailUrls.get()[id]
		return CollectionItemRecordType.create({
			id: CollectionItemRecordType.createId(id),
			collectionId,
			...(newItem.name ? { name: newItem.name } : {}),
			...(thumbnailUrl ? { thumbnailUrl } : {}),
			createdAt,
		})
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		await this.check(this.app.z.mutate.collection_item.rename({ id: rowId(itemId), name }).server)
	}

	async deleteItem(itemId: TLCollectionItemId) {
		await this.check(this.app.z.mutate.collection_item.delete({ id: rowId(itemId) }).server)
	}

	async moveItem(itemId: TLCollectionItemId, toCollectionId: TLCollectionId) {
		await this.check(
			this.app.z.mutate.collection_item.move({
				id: rowId(itemId),
				collectionId: rowId(toCollectionId),
			}).server
		)
	}

	dispose() {
		this.stopLoadingThumbnails()
		for (const url of Object.values(this.thumbnailUrls.get())) URL.revokeObjectURL(url)
	}

	private findRow(collectionId: TLCollectionId) {
		const id = rowId(collectionId)
		return this.app.getCollectionRows().find((row) => row.id === id)
	}

	private canManageIn(workspaceId: string) {
		return can(this.app.getWorkspaceMembership(workspaceId)?.role, 'manageCollections')
	}

	// The local store has the change at once; waiting for the server is what reports a rejection,
	// and lets items be added in the worker to a collection that was just created. Zero's mutation
	// promises resolve with an error result rather than rejecting.
	private async check(result: Promise<MutationResult>) {
		const { type, error } = await result
		if (type === 'error') throw new Error('The change was rejected', { cause: error })
	}

	private async request(path: string, init: RequestInit = {}) {
		const token = await this.getToken()
		const headers = new Headers(init.headers)
		if (token) headers.set('Authorization', `Bearer ${token}`)
		return fetch(path, { ...init, headers })
	}

	// The row can arrive through Zero, and its thumbnail be loaded, before the worker answers the
	// request that added it, so whichever lands second is dropped.
	private setThumbnail(itemId: string, blob: Blob) {
		this.requestedThumbnails.add(itemId)
		if (this.thumbnailUrls.get()[itemId]) return
		const url = URL.createObjectURL(blob)
		this.thumbnailUrls.update((urls) => ({ ...urls, [itemId]: url }))
	}

	private async loadThumbnail(itemId: string) {
		try {
			const response = await this.request(`/api/app/collection-items/${itemId}/thumbnail`)
			if (response.ok) this.setThumbnail(itemId, await response.blob())
		} catch (error) {
			console.error('[collections] failed to load a thumbnail', error)
		}
	}
}
