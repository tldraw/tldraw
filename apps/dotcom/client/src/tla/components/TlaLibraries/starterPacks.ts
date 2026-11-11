import {
	InMemoryLibrarySource,
	LibraryItemRecordType,
	type LibraryPack,
	LibraryPermissionError,
	LibraryRecordType,
	type LibrarySource,
	type TLLibrary,
	type TLLibraryAction,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryTarget,
} from '@tldraw/libraries'
import { atom, getFromLocalStorage, setInLocalStorage, type Atom } from 'tldraw'
import diagramming from './starterPackDiagramming.json'
import doodles from './starterPackDoodles.json'
import floorPlan from './starterPackFloorPlan.json'
import tldrawCharacters from './starterPackTldrawCharacters.json'
import wireframing from './starterPackWireframing.json'

export const STARTER_PACKS = [
	wireframing,
	diagramming,
	floorPlan,
	tldrawCharacters,
	doodles,
] as unknown as LibraryPack[]

/** The library a starter pack shows as. Stable, so the UI can point at it before it's added. */
export function getStarterPackLibraryId(packId: string): TLLibraryId {
	return LibraryRecordType.createId(`starter-pack-${packId}`)
}

/**
 * Every pack, as read-only libraries. The items come from the packs shipped with this release, so
 * a pack's new version reaches everyone who added it when they next load tldraw.com.
 */
function createPacksSource(packs: LibraryPack[]) {
	const libraries = packs.map((pack) =>
		LibraryRecordType.create({
			id: getStarterPackLibraryId(pack.id),
			name: pack.name,
			meta: { packId: pack.id, packVersion: pack.version },
		})
	)
	const entries = packs.flatMap((pack, i) =>
		pack.items.map((item) => ({
			record: LibraryItemRecordType.create({
				libraryId: libraries[i].id,
				name: item.name,
				thumbnail: item.thumbnail,
			}),
			content: item.content,
		}))
	)
	const contents: Record<TLLibraryItemId, TLLibraryItemContent> = Object.fromEntries(
		entries.map(({ record, content }) => [record.id, content])
	)
	return new InMemoryLibrarySource({
		id: 'starter-packs-all',
		can: () => false,
		initial: { libraries, items: entries.map(({ record }) => record), contents },
	})
}

function readIds(storageKey: string): string[] {
	try {
		const ids = JSON.parse(getFromLocalStorage(storageKey) ?? '[]')
		return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
	} catch {
		return []
	}
}

/**
 * The starter packs a user added, shown read-only. All a user stores is the list of pack ids;
 * adding or removing a pack copies and deletes nothing. To change a pack, copy it to one of your
 * own workspaces with the library's "Copy to".
 *
 * SPIKE: the list lives in this browser's localStorage, per user. For real it would be a row of
 * the user's, synced through Zero, so it follows them between browsers.
 */
export class StarterPacksSource implements LibrarySource {
	readonly id = 'starter-packs'
	private readonly added: Atom<string[]>
	private readonly packs: InMemoryLibrarySource

	constructor(
		private readonly storageKey: string,
		packs: LibraryPack[] = STARTER_PACKS
	) {
		this.added = atom('added starter packs', readIds(storageKey))
		this.packs = createPacksSource(packs)
	}

	isAdded(packId: string) {
		return this.added.get().includes(packId)
	}

	setAdded(packId: string, added: boolean) {
		const ids = this.added.get().filter((id) => id !== packId)
		if (added) ids.push(packId)
		this.added.set(ids)
		// Storage can be unavailable (private mode): the list then lasts until reload.
		setInLocalStorage(this.storageKey, JSON.stringify(ids))
	}

	getLibraries(): TLLibrary[] {
		const added = this.added.get()
		const byId = new Map(
			this.packs.getLibraries().map((library) => [library.meta.packId as string, library])
		)
		return added.flatMap((packId) => byId.get(packId) ?? [])
	}

	getItems(libraryId: TLLibraryId): TLLibraryItem[] {
		return this.packs.getItems(libraryId)
	}

	getItemContent(itemId: TLLibraryItemId) {
		return this.packs.getItemContent(itemId)
	}

	can(_action: TLLibraryAction, _target?: TLLibraryTarget) {
		return false
	}

	async createLibrary(): Promise<TLLibrary> {
		throw new LibraryPermissionError('createLibrary')
	}
	async renameLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('renameLibrary', libraryId)
	}
	async deleteLibrary(libraryId: TLLibraryId): Promise<void> {
		throw new LibraryPermissionError('deleteLibrary', libraryId)
	}
	async addItem(libraryId: TLLibraryId): Promise<TLLibraryItem> {
		throw new LibraryPermissionError('addItem', libraryId)
	}
	async renameItem(): Promise<void> {
		throw new LibraryPermissionError('renameItem')
	}
	async deleteItem(): Promise<void> {
		throw new LibraryPermissionError('deleteItem')
	}
}

const sourcesByUser = new Map<string, StarterPacksSource>()

/** One per user, so the panel, the dialog and every open file see the same list. */
export function getStarterPacksSource(userId: string) {
	let source = sourcesByUser.get(userId)
	if (!source) {
		source = new StarterPacksSource(`tldraw-starter-packs-added:${userId}`)
		sourcesByUser.set(userId, source)
	}
	return source
}
