import {
	LibraryPermissionError,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryTarget,
} from '@tldraw/libraries'

function refuse(action: TLLibraryAction, target?: TLLibraryTarget): Promise<never> {
	return Promise.reject(
		new LibraryPermissionError(action, typeof target === 'string' ? target : undefined)
	)
}

/**
 * A source whose libraries can be browsed and their items placed, but not changed: `can` refuses
 * every action and every write rejects with a {@link LibraryPermissionError}. It has no placement
 * or libraries to add, so the panel lists its libraries as they come, without "This board" or
 * "Browse libraries".
 */
export abstract class ReadOnlyLibrarySource implements LibrarySource {
	abstract readonly id: string
	abstract getLibraries(): TLLibrary[]
	abstract getItems(libraryId: TLLibraryId): TLLibraryItem[]
	abstract getItemContent(itemId: TLLibraryItemId): Promise<TLLibraryItemContent>

	can(_action: TLLibraryAction, _target?: TLLibraryTarget) {
		return false
	}

	createLibrary(): Promise<never> {
		return refuse('createLibrary')
	}

	renameLibrary(libraryId: TLLibraryId): Promise<never> {
		return refuse('renameLibrary', libraryId)
	}

	deleteLibrary(libraryId: TLLibraryId): Promise<never> {
		return refuse('deleteLibrary', libraryId)
	}

	addItem(libraryId: TLLibraryId): Promise<never> {
		return refuse('addItem', libraryId)
	}

	updateItem(): Promise<never> {
		return refuse('updateItem')
	}

	deleteItem(): Promise<never> {
		return refuse('deleteItem')
	}
}

/** Another source's libraries and items, read-only. */
export class ReadOnlyLibraryView extends ReadOnlyLibrarySource {
	readonly id: string
	readonly resolveThumbnail?: LibrarySource['resolveThumbnail']
	readonly loadItems?: LibrarySource['loadItems']
	readonly isLoadingItems?: LibrarySource['isLoadingItems']
	readonly mayHaveItemsMatching?: LibrarySource['mayHaveItemsMatching']
	readonly getItemCount?: LibrarySource['getItemCount']
	readonly getPreviewItems?: LibrarySource['getPreviewItems']

	constructor(private readonly source: LibrarySource) {
		super()
		this.id = source.id
		if (source.resolveThumbnail) this.resolveThumbnail = source.resolveThumbnail.bind(source)
		if (source.loadItems) this.loadItems = source.loadItems.bind(source)
		if (source.isLoadingItems) this.isLoadingItems = source.isLoadingItems.bind(source)
		if (source.getItemCount) this.getItemCount = source.getItemCount.bind(source)
		if (source.getPreviewItems) this.getPreviewItems = source.getPreviewItems.bind(source)
		if (source.mayHaveItemsMatching) {
			this.mayHaveItemsMatching = source.mayHaveItemsMatching.bind(source)
		}
	}

	getLibraries() {
		return this.source.getLibraries()
	}

	getItems(libraryId: TLLibraryId) {
		return this.source.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.source.getItemContent(itemId)
	}
}
