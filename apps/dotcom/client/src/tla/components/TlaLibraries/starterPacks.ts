import {
	librariesPanelOpen,
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
import { fetch, structuredClone } from '@tldraw/utils'
import {
	atom,
	computed,
	type Editor,
	getFromLocalStorage,
	react,
	setInLocalStorage,
	type Atom,
} from 'tldraw'
/** One entry of `packs.json`: a pack on offer, before its file is fetched. */
export interface StarterPackEntry {
	id: string
	name: string
	/** Goes up whenever the pack's file changes, so tabs already open fetch it again. */
	version: number
}

/** Where the packs come from: the list of what's on offer, and each pack's file. */
export interface StarterPacksCatalog {
	getEntries(): Promise<StarterPackEntry[]>
	getPack(entry: StarterPackEntry): Promise<LibraryPack>
}

async function fetchJson(url: string, init?: RequestInit) {
	const response = await fetch(url, init)
	if (!response.ok) throw new Error(`${url} answered ${response.status}`)
	return response.json()
}

/**
 * The packs deployed with tldraw.com, from `public/libraries/`. The URLs don't change between
 * deploys, so a tab opened before a deploy still finds the new versions. `packs.json` is checked
 * with the server every time (it's tiny, and unchanged it answers 304); a pack's URL names its
 * version, so a cached copy is only reused for the same version.
 */
export const servedStarterPacks: StarterPacksCatalog = {
	getEntries: () => fetchJson('/libraries/packs.json', { cache: 'no-cache' }),
	getPack: (entry) =>
		fetchJson(`/libraries/${encodeURIComponent(entry.id)}.json?v=${entry.version}`),
}

/** The library a starter pack shows as. Stable, so the UI can point at it before it's added. */
export function getStarterPackLibraryId(packId: string): TLLibraryId {
	return LibraryRecordType.createId(`starter-pack-${packId}`)
}

interface LoadedPack {
	version: number
	pack: LibraryPack
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
	/** What `packs.json` listed when last read. Empty until it first arrives. */
	private readonly entries = atom<StarterPackEntry[]>('starter pack entries', [])
	/**
	 * Each pack once its file has arrived, with the version asked for, or 'failed' when it never
	 * arrived. Packs still downloading for the first time are missing.
	 */
	private readonly loaded = atom<Record<string, LoadedPack | 'failed'>>('loaded starter packs', {})
	private refreshing: Promise<void> | null = null

	constructor(
		private readonly storageKey: string,
		private readonly catalog: StarterPacksCatalog = servedStarterPacks
	) {
		this.added = atom('added starter packs', readIds(storageKey))
	}

	/**
	 * Reads the list of packs, then fetches each pack that's new, changed or failed last time, and
	 * swaps it in. A pack being updated keeps showing its old version until the new one arrives.
	 * Calls made while one is running share it.
	 */
	refresh() {
		this.refreshing ??= this.fetchChanges().finally(() => {
			this.refreshing = null
		})
		return this.refreshing
	}

	private async fetchChanges() {
		let entries: StarterPackEntry[]
		try {
			entries = await this.catalog.getEntries()
		} catch (error) {
			console.error("Couldn't load the list of starter packs", error)
			return
		}
		this.entries.set(entries)
		const loaded = this.loaded.get()
		const changed = entries.filter((entry) => {
			const current = loaded[entry.id]
			return current === 'failed' || current?.version !== entry.version
		})
		await Promise.all(
			changed.map((entry) =>
				this.catalog.getPack(entry).then(
					(pack) => this.setLoaded(entry.id, { version: entry.version, pack }),
					(error) => {
						console.error(`Couldn't load starter pack ${entry.id}`, error)
						// An older version already showing stays; the next refresh tries again.
						if (!this.getPack(entry.id)) this.setLoaded(entry.id, 'failed')
					}
				)
			)
		)
	}

	private setLoaded(packId: string, pack: LoadedPack | 'failed') {
		this.loaded.update((loaded) => ({ ...loaded, [packId]: pack }))
	}

	/** The packs on offer, from `packs.json`. */
	getEntries() {
		return this.entries.get()
	}

	/** The pack's contents, once its file has arrived. */
	getPack(packId: string): LibraryPack | undefined {
		const loaded = this.loaded.get()[packId]
		return loaded === 'failed' ? undefined : loaded?.pack
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
		const entries = new Map(this.entries.get().map((entry) => [entry.id, entry]))
		return this.added.get().flatMap((packId) => {
			const entry = entries.get(packId)
			if (!entry || this.hasFailed(packId)) return []
			const pack = this.getPack(packId)
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
		for (const [packId, loaded] of Object.entries(this.loaded.get())) {
			if (loaded === 'failed') continue
			const { pack } = loaded
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
		return !!library && !((library.meta.packId as string) in this.loaded.get())
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
 * downloading when the app starts, so they're usually there by the time someone opens the panel.
 */
export function getStarterPacksSource(userId: string) {
	let source = sourcesByUser.get(userId)
	if (!source) {
		source = new StarterPacksSource(`tldraw-starter-packs-added:${userId}`)
		sourcesByUser.set(userId, source)
		void source.refresh()
	}
	return source
}

/**
 * Picks up packs deployed since this tab opened: whenever the libraries panel opens, and when the
 * window comes back into focus. Returns a function that stops watching.
 */
export function refreshStarterPacksWhenSeen(editor: Editor, packs: StarterPacksSource) {
	const stop = react('refresh starter packs', () => {
		if (librariesPanelOpen.get(editor)) void packs.refresh()
	})
	const onFocus = () => void packs.refresh()
	window.addEventListener('focus', onFocus)
	return () => {
		stop()
		window.removeEventListener('focus', onFocus)
	}
}
