import {
	LibraryNotFoundError,
	LibraryPermissionError,
	LibraryRecordType,
	type LibrarySource,
	type TLCopyLibraryOptions,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemId,
	type TLLibraryItemPartial,
	type TLLibraryPlacement,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { atom, computed } from 'tldraw'
import type { TldrawApp } from '../../app/TldrawApp'
import { rowId, toLibrary, toLibraryItem, type TldrawAppLibrariesSource } from './librariesSource'

/**
 * The workspace libraries one file shows: those added to it, and the user's default library,
 * shown on every file. The rest of the libraries of the file's workspace and the user's home
 * workspace are available to add, and new libraries are offered in those two.
 *
 * A view over the app's {@link TldrawAppLibrariesSource}, which keeps what every file shares:
 * items being added, libraries being copied, loaded content and thumbnail URLs. This adds the
 * file's own query, and adding libraries to the file and removing them.
 *
 * Everyone who can open the file sees the libraries added to it, but only those who can edit the
 * file add or remove them, and only members of a library's workspace change it. A library created
 * or copied here is added to the file.
 */
export class TldrawAppFileLibrariesSource implements LibrarySource {
	readonly id: string
	private readonly watch: ReturnType<TldrawApp['watchFileLibraries']>
	// Listed as added from when adding starts until the server answers, so a library being copied
	// shows before its row has arrived.
	private readonly adding = atom<ReadonlySet<TLLibraryId>>('libraries being added', new Set())

	private readonly workspaceLibraries$ = computed(
		'workspace libraries by id',
		() => new Map(this.libraries.getLibraries().map((library) => [library.id, library]))
	)

	private readonly shown$ = computed('file libraries', () => {
		const workspaceLibraries = this.workspaceLibraries$.get()
		const homeId = this.app.getHomeWorkspaceId()
		const shown = new Map<TLLibraryId, { library: TLLibrary; placement: TLLibraryPlacement }>()
		for (const row of this.watch.rows.get()) {
			const id = LibraryRecordType.createId(row.id)
			shown.set(id, {
				library:
					workspaceLibraries.get(id) ?? toLibrary(row, this.libraries.getDefaultLibraryName()),
				placement: row.isDefault && row.owningGroupId === homeId ? 'default' : 'added',
			})
		}
		for (const id of this.adding.get()) {
			const library = workspaceLibraries.get(id)
			if (library && !shown.has(id)) shown.set(id, { library, placement: 'added' })
		}
		return shown
	})

	// The file's workspace: where its new libraries go, and the only one whose libraries it offers.
	private readonly offeredOwnerIds$ = computed('file library owners', () => [
		this.app.getFile(this.fileId)?.owningGroupId ?? this.app.getHomeWorkspaceId(),
	])

	private readonly libraries$ = computed('file libraries list', () =>
		[...this.shown$.get().values()].map(({ library }) => library)
	)

	// Libraries added to the file from workspaces the user isn't a member of, whose items only the
	// file's query has.
	private readonly otherItems$ = computed('items of libraries from other workspaces', () => {
		const workspaceLibraries = this.workspaceLibraries$.get()
		const items = new Map<TLLibraryId, TLLibraryItem[]>()
		for (const row of this.watch.rows.get()) {
			const id = LibraryRecordType.createId(row.id)
			if (!workspaceLibraries.has(id)) {
				items.set(
					id,
					row.items.map((item) => toLibraryItem(item))
				)
			}
		}
		return items
	})

	constructor(
		private readonly app: Pick<
			TldrawApp,
			| 'z'
			| 'getHomeWorkspaceId'
			| 'getFile'
			| 'canUpdateFile'
			| 'watchFileLibraries'
			| 'areLibrariesLoaded'
		>,
		private readonly libraries: TldrawAppLibrariesSource,
		private readonly fileId: string
	) {
		this.id = `${libraries.id}:${fileId}`
		this.watch = app.watchFileLibraries(fileId)
	}

	getLibraries() {
		return this.libraries$.get()
	}

	getLibraryPlacement(libraryId: TLLibraryId) {
		return this.shown$.get().get(libraryId)?.placement
	}

	getAvailableLibraries() {
		const shown = this.shown$.get()
		const ownerIds = this.offeredOwnerIds$.get()
		return this.libraries
			.getLibraries()
			.filter(
				(library) =>
					!shown.has(library.id) &&
					library.ownerId !== undefined &&
					ownerIds.includes(library.ownerId)
			)
	}

	getNewLibraryOwnerIds() {
		return this.offeredOwnerIds$.get()
	}

	getItems(libraryId: TLLibraryId) {
		return this.otherItems$.get().get(libraryId) ?? this.libraries.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.libraries.getItemContent(itemId)
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		switch (action) {
			case 'addLibraryToDocument':
				return (
					typeof target === 'string' &&
					this.app.canUpdateFile(this.fileId) &&
					this.getAvailableLibraries().some((library) => library.id === target)
				)
			case 'removeLibraryFromDocument':
				return (
					typeof target === 'string' &&
					this.app.canUpdateFile(this.fileId) &&
					this.getLibraryPlacement(target) === 'added'
				)
			case 'createLibrary':
				return this.app.canUpdateFile(this.fileId) && this.libraries.can(action, target)
			default:
				return this.libraries.can(action, target)
		}
	}

	getLibraryOwners() {
		return this.libraries.getLibraryOwners()
	}

	getDefaultOwnerId() {
		return this.offeredOwnerIds$.get()[0]
	}

	async addLibraryToDocument(libraryId: TLLibraryId) {
		if (this.shown$.get().has(libraryId)) return
		if (!this.can('addLibraryToDocument', libraryId)) {
			throw new LibraryPermissionError('addLibraryToDocument', libraryId)
		}
		await this.add(libraryId)
	}

	/**
	 * Whether removing the library from the file asks to delete it too, as deleting it loses
	 * nothing: it looks empty, or it's a starter pack's copy nobody has changed that no other file
	 * shows. Only when the user may delete it, so never their default, and only once the libraries
	 * have synced, since until then a library's items may not have arrived. The server checks
	 * again, and keeps the library if it has changed since.
	 */
	deletesOnRemove(libraryId: TLLibraryId) {
		if (!this.app.areLibrariesLoaded() || !this.can('deleteLibrary', libraryId)) return false
		if (this.getItems(libraryId).length === 0) return true
		const row = this.watch.rows.get().find((r) => r.id === rowId(libraryId))
		return !!row && row.meta.packId !== undefined && row.fileCount <= 1
	}

	async removeLibraryFromDocument(libraryId: TLLibraryId) {
		if (!this.can('removeLibraryFromDocument', libraryId)) {
			throw new LibraryPermissionError('removeLibraryFromDocument', libraryId)
		}
		const deleteIfDisposable = this.deletesOnRemove(libraryId)
		await this.libraries.apply(
			this.app.z.mutate.file_library.remove({
				fileId: this.fileId,
				libraryId: rowId(libraryId),
				deleteIfDisposable,
			}),
			deleteIfDisposable ? 'delete-library' : 'remove-library-from-file'
		)
	}

	async createLibrary(name: string, options?: TLNewLibraryOptions) {
		if (!this.app.canUpdateFile(this.fileId)) throw new LibraryPermissionError('createLibrary')
		const library = await this.libraries.createLibrary(name, options)
		await this.add(library.id)
		return library
	}

	async copyLibrary(libraryId: TLLibraryId, ownerId: string, options?: TLCopyLibraryOptions) {
		if (!this.app.canUpdateFile(this.fileId)) throw new LibraryPermissionError('createLibrary')
		const copy = await this.libraries.copyLibrary(libraryId, ownerId, options)
		await this.add(copy.id)
		return copy
	}

	renameLibrary(libraryId: TLLibraryId, name: string) {
		return this.libraries.renameLibrary(libraryId, name)
	}

	deleteLibrary(libraryId: TLLibraryId) {
		return this.libraries.deleteLibrary(libraryId)
	}

	addItem(libraryId: TLLibraryId, item: TLNewLibraryItem) {
		return this.libraries.addItem(libraryId, item)
	}

	addItems(libraryId: TLLibraryId, items: TLNewLibraryItem[]) {
		return this.libraries.addItems(libraryId, items)
	}

	updateItem(itemId: TLLibraryItemId, partial: TLLibraryItemPartial) {
		return this.libraries.updateItem(itemId, partial)
	}

	deleteItem(itemId: TLLibraryItemId) {
		return this.libraries.deleteItem(itemId)
	}

	moveItem(itemId: TLLibraryItemId, toLibraryId: TLLibraryId) {
		return this.libraries.moveItem(itemId, toLibraryId)
	}

	/** Stops the file's query. */
	dispose() {
		this.watch.stop()
	}

	// The mutator needs the library's row in the local store, which a copy's gets only once the
	// worker has stored it.
	private async add(libraryId: TLLibraryId) {
		const settle = () =>
			this.adding.update((all) => {
				const rest = new Set(all)
				rest.delete(libraryId)
				return rest
			})
		this.adding.update((all) => new Set(all).add(libraryId))
		try {
			if (!(await this.libraries.waitForLibraryRow(libraryId))) {
				throw new LibraryNotFoundError(libraryId)
			}
			const { confirmed } = await this.libraries.apply(
				this.app.z.mutate.file_library.add({ fileId: this.fileId, libraryId: rowId(libraryId) }),
				'add-library-to-file'
			)
			confirmed.finally(settle)
		} catch (error) {
			settle()
			throw error
		}
	}
}
