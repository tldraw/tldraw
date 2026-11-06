import { can, type TlaLibrary, type TlaLibraryItemThumbnail } from '@tldraw/dotcom-shared'
import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	getThumbnailForColorMode,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryOwner,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { computed, defineMessages, fetch, uniqueId } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'

const messages = defineMessages({
	privateToYou: { defaultMessage: 'Private to you' },
})

interface MutationResult {
	type: string
	error?: unknown
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

/**
 * Workspace libraries, kept in tldraw.com's database and synced through Zero: those of every
 * workspace the user is a member of, the home workspace's being private to them. A board's own
 * libraries are kept in its document instead (see editorLibraries).
 *
 * Libraries and item rows come from the app's libraries query and change through mutators.
 * An item's content is stored by the sync worker, which also adds items and copies libraries,
 * and is fetched with the user's token. Its thumbnails are public uploads whose URLs are on its
 * row, so they load as ordinary images.
 */
export class TldrawAppLibrariesSource implements LibrarySource {
	readonly id = 'dotcom-workspaces'

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
		const byLibrary = new Map<string, TLLibraryItem[]>()
		for (const row of this.app.getLibraryRows()) {
			byLibrary.set(
				row.id,
				row.items.map((item) =>
					LibraryItemRecordType.create({
						id: LibraryItemRecordType.createId(item.id),
						libraryId: LibraryRecordType.createId(row.id),
						...(item.name ? { name: item.name } : {}),
						...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
						createdAt: item.createdAt,
					})
				)
			)
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
		await this.check(
			this.app.z.mutate.library.create({ id, name, owningGroupId: ownerId, meta }).server
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
		const form = new FormData()
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
		const { id, createdAt, thumbnail } = (await response.json()) as {
			id: string
			createdAt: number
			thumbnail: TlaLibraryItemThumbnail | null
		}
		return LibraryItemRecordType.create({
			id: LibraryItemRecordType.createId(id),
			libraryId,
			...(newItem.name ? { name: newItem.name } : {}),
			...(thumbnail ? { thumbnail } : {}),
			createdAt,
		})
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		await this.check(this.app.z.mutate.library_item.rename({ id: rowId(itemId), name }).server)
	}

	async deleteItem(itemId: TLLibraryItemId) {
		await this.check(this.app.z.mutate.library_item.delete({ id: rowId(itemId) }).server)
	}

	async moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		await this.check(
			this.app.z.mutate.library_item.move({
				id: rowId(itemId),
				libraryId: rowId(toLibraryId),
			}).server
		)
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

	// The local store has the change at once; waiting for the server is what reports a rejection,
	// and lets items be added in the worker to a library that was just created. Zero's mutation
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
}
