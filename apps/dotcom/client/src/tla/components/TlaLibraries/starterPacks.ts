import {
	LibraryItemRecordType,
	LibraryNotFoundError,
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
import { structuredClone } from '@tldraw/utils'
import { atom, computed, getFromLocalStorage, setInLocalStorage, type Atom } from 'tldraw'
/** A pack shipped with this release. Its file downloads apart from the app, after it starts. */
export interface StarterPackEntry {
	id: string
	/** Shown until the file arrives, then the pack's own name takes over. */
	name: string
	load(): Promise<LibraryPack>
}

const asPack = (module: { default: unknown }) => module.default as LibraryPack

export const STARTER_PACKS: StarterPackEntry[] = [
	{
		id: 'wireframing',
		name: 'Wireframing',
		load: () => import('./starterPackWireframing.json').then(asPack),
	},
	{
		id: 'diagramming',
		name: 'Diagramming',
		load: () => import('./starterPackDiagramming.json').then(asPack),
	},
	{
		id: 'floor-plan',
		name: 'Floor plan',
		load: () => import('./starterPackFloorPlan.json').then(asPack),
	},
	{
		id: 'tldraw-characters',
		name: 'tldraw characters',
		load: () => import('./starterPackTldrawCharacters.json').then(asPack),
	},
	{ id: 'doodles', name: 'Doodles', load: () => import('./starterPackDoodles.json').then(asPack) },
]

/** The library a starter pack shows as. Stable, so the UI can point at it before it's added. */
export function getStarterPackLibraryId(packId: string): TLLibraryId {
	return LibraryRecordType.createId(`starter-pack-${packId}`)
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
	/** Each pack once its file has arrived, or 'failed'. Packs still downloading are missing. */
	private readonly loaded = atom<Record<string, LibraryPack | 'failed'>>('loaded starter packs', {})
	private loading: Promise<void> | null = null

	constructor(
		private readonly storageKey: string,
		readonly packs: StarterPackEntry[] = STARTER_PACKS
	) {
		this.added = atom('added starter packs', readIds(storageKey))
	}

	/** Downloads every pack, once. Each one shows as soon as its own file arrives. */
	load() {
		this.loading ??= Promise.all(
			this.packs.map((entry) =>
				entry.load().then(
					(pack) => this.setLoaded(entry.id, pack),
					(error) => {
						console.error(`Couldn't load starter pack ${entry.id}`, error)
						this.setLoaded(entry.id, 'failed')
					}
				)
			)
		).then(() => {})
		return this.loading
	}

	private setLoaded(packId: string, pack: LibraryPack | 'failed') {
		this.loaded.update((loaded) => ({ ...loaded, [packId]: pack }))
	}

	/** The pack's contents, once its file has arrived. */
	getPack(packId: string): LibraryPack | undefined {
		const pack = this.loaded.get()[packId]
		return pack === 'failed' ? undefined : pack
	}

	hasFailed(packId: string) {
		return this.loaded.get()[packId] === 'failed'
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

	// A pack still downloading is listed under its shipped name, with no items, so the panel can
	// show where it goes. One that failed to download isn't listed.
	private readonly libraries$ = computed('starter pack libraries', () => {
		const loaded = this.loaded.get()
		return this.added.get().flatMap((packId) => {
			const entry = this.packs.find((p) => p.id === packId)
			const pack = loaded[packId]
			if (!entry || pack === 'failed') return []
			return [
				LibraryRecordType.create({
					id: getStarterPackLibraryId(packId),
					name: pack?.name ?? entry.name,
					meta: pack ? { packId, packVersion: pack.version } : { packId },
				}),
			]
		})
	})

	// Item ids come from the pack, so they stay the same as other packs arrive.
	private readonly items$ = computed('starter pack items', () => {
		const items = new Map<TLLibraryId, TLLibraryItem[]>()
		const contents = new Map<TLLibraryItemId, TLLibraryItemContent>()
		for (const [packId, pack] of Object.entries(this.loaded.get())) {
			if (pack === 'failed') continue
			const libraryId = getStarterPackLibraryId(packId)
			const records = pack.items.map((item) => {
				const record = LibraryItemRecordType.create({
					id: LibraryItemRecordType.createId(`starter-pack-${packId}-${item.id}`),
					libraryId,
					name: item.name,
					thumbnail: item.thumbnail,
				})
				contents.set(record.id, item.content)
				return record
			})
			items.set(libraryId, records)
		}
		return { items, contents }
	})

	getLibraries(): TLLibrary[] {
		return this.libraries$.get()
	}

	getItems(libraryId: TLLibraryId): TLLibraryItem[] {
		return this.items$.get().items.get(libraryId) ?? []
	}

	async getItemContent(itemId: TLLibraryItemId) {
		const content = this.items$.get().contents.get(itemId)
		if (!content) throw new LibraryNotFoundError(itemId)
		return structuredClone(content)
	}

	isLoading(libraryId: TLLibraryId) {
		const library = this.libraries$.get().find((l) => l.id === libraryId)
		return !!library && !this.loaded.get()[library.meta.packId as string]
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

/**
 * One per user, so the panel, the dialog and every open file see the same list. Starts the packs
 * downloading, so they're usually there by the time someone opens the panel.
 */
export function getStarterPacksSource(userId: string) {
	let source = sourcesByUser.get(userId)
	if (!source) {
		source = new StarterPacksSource(`tldraw-starter-packs-added:${userId}`)
		sourcesByUser.set(userId, source)
		void source.load()
	}
	return source
}
