import {
	getLibraryErrorReason,
	whenItemsStored,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemId,
	type TLLibraryItemPartial,
	type TLLibraryTarget,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import type { TldrawApp } from '../../app/TldrawApp'
import type { TLAppLibraryAction, TLAppUiEventMap } from '../../utils/app-ui-events'

type OwnerKind = TLAppUiEventMap['create-library']['owner']

/**
 * A library source that reports the user's changes to it to PostHog, without names or content:
 * each change once it has been made, or `library-error` if it fails. Wraps the source the UI
 * writes through, so a change that a composite source makes from several, such as moving a
 * board's library to a workspace, counts once. A change the server rejects after it was made is
 * reported by TldrawAppLibrariesSource.
 */
export class TrackedLibrarySource implements LibrarySource {
	readonly id: string
	readonly addItems?: LibrarySource['addItems']
	readonly moveItem?: LibrarySource['moveItem']
	readonly copyLibrary?: LibrarySource['copyLibrary']
	readonly getLibraryOwners?: LibrarySource['getLibraryOwners']
	readonly getDefaultOwnerId?: LibrarySource['getDefaultOwnerId']
	readonly resolveThumbnail?: LibrarySource['resolveThumbnail']

	constructor(
		/** The wrapped source, for changes that are reported as something else, e.g. a starter pack. */
		readonly untracked: LibrarySource,
		private readonly app: Pick<TldrawApp, 'trackEvent' | 'getHomeWorkspaceId'>,
		private readonly fileId?: string
	) {
		const source = untracked
		this.id = source.id
		if (source.addItems) {
			const addItems = source.addItems.bind(source)
			this.addItems = async (libraryId, newItems) =>
				this.reportSaved(await this.watch('save-to-library', addItems(libraryId, newItems)))
		}
		if (source.moveItem) {
			const moveItem = source.moveItem.bind(source)
			this.moveItem = async (itemId, toLibraryId) => {
				await this.watch('move-library-item', moveItem(itemId, toLibraryId))
				this.track('move-library-item')
			}
		}
		if (source.copyLibrary) {
			const copyLibrary = source.copyLibrary.bind(source)
			this.copyLibrary = async (libraryId, ownerId, options) => {
				const itemCount = source.getItems(libraryId).length
				const library = await this.watch('copy-library', copyLibrary(libraryId, ownerId, options))
				this.app.trackEvent('copy-library', { source: 'libraries', item_count: itemCount })
				return library
			}
		}
		if (source.getLibraryOwners) this.getLibraryOwners = source.getLibraryOwners.bind(source)
		if (source.getDefaultOwnerId) this.getDefaultOwnerId = source.getDefaultOwnerId.bind(source)
		if (source.resolveThumbnail) this.resolveThumbnail = source.resolveThumbnail.bind(source)
	}

	getLibraries() {
		return this.untracked.getLibraries()
	}

	getItems(libraryId: TLLibraryId) {
		return this.untracked.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.untracked.getItemContent(itemId)
	}

	can(action: TLLibraryAction, target?: TLLibraryTarget) {
		return this.untracked.can(action, target)
	}

	async createLibrary(name: string, options?: TLNewLibraryOptions) {
		const library = await this.watch('create-library', this.untracked.createLibrary(name, options))
		this.app.trackEvent('create-library', {
			source: 'libraries',
			owner: this.getOwnerKind(library),
		})
		return library
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		await this.watch('rename-library', this.untracked.renameLibrary(libraryId, name))
		this.track('rename-library')
	}

	async deleteLibrary(libraryId: TLLibraryId) {
		await this.watch('delete-library', this.untracked.deleteLibrary(libraryId))
		this.track('delete-library')
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const item = await this.watch('save-to-library', this.untracked.addItem(libraryId, newItem))
		this.reportSaved([item])
		return item
	}

	async updateItem(itemId: TLLibraryItemId, partial: TLLibraryItemPartial) {
		if (partial.name === undefined) return this.untracked.updateItem(itemId, partial)
		await this.watch('rename-library-item', this.untracked.updateItem(itemId, partial))
		this.track('rename-library-item')
	}

	async deleteItem(itemId: TLLibraryItemId) {
		await this.watch('delete-library-item', this.untracked.deleteItem(itemId))
		this.track('delete-library-item')
	}

	private track(
		name:
			| 'rename-library'
			| 'delete-library'
			| 'rename-library-item'
			| 'delete-library-item'
			| 'move-library-item'
	) {
		this.app.trackEvent(name, { source: 'libraries' })
	}

	/** Reports `library-error` for `action` if `operation` rejects. */
	private async watch<T>(action: TLAppLibraryAction, operation: Promise<T>) {
		try {
			return await operation
		} catch (error) {
			this.app.trackEvent('library-error', {
				source: 'libraries',
				action,
				reason: getLibraryErrorReason(error),
			})
			throw error
		}
	}

	// Items are listed before they're stored, and storing them can still fail.
	private reportSaved<T extends TLLibraryItem[]>(items: T) {
		this.watch('save-to-library', whenItemsStored(items.map((item) => item.id))).then(
			() =>
				this.app.trackEvent('save-to-library', { source: 'libraries', item_count: items.length }),
			() => {}
		)
		return items
	}

	private getOwnerKind(library: TLLibrary): OwnerKind {
		if (this.fileId !== undefined && library.ownerId === this.fileId) return 'file'
		return library.ownerId === this.app.getHomeWorkspaceId() ? 'home' : 'workspace'
	}
}

/** The source behind a {@link TrackedLibrarySource}, for a change it shouldn't report. */
export function getUntrackedSource(source: LibrarySource) {
	return source instanceof TrackedLibrarySource ? source.untracked : source
}
