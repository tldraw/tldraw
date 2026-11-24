import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryRecordType,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
} from '@tldraw/libraries'
import { atom, computed } from 'tldraw'
import { ReadOnlyLibrarySource } from './readOnlyLibrarySource'
import {
	getStarterPackSummaries,
	loadStarterPackIndex,
	loadStarterPackItemContent,
	loadStarterPackSummaries,
	STARTER_PACK_IDS,
	type StarterPackIndex,
	type StarterPackSummary,
} from './starterPacks'

/** The id of the library {@link StarterPacksLibrarySource} lists a pack as. */
export function getStarterPackLibraryId(packId: string): TLLibraryId {
	return LibraryRecordType.createId(`starter-pack-${packId}`)
}

/**
 * The starter packs as read-only libraries, one per pack, for someone who can't copy them into a
 * workspace. The packs are listed from their summaries once {@link StarterPacksLibrarySource.load}
 * has loaded them, in the order the packs are given. A pack lists no items until
 * {@link StarterPacksLibrarySource.loadItems} has fetched them, e.g. when its section is unfolded.
 */
export class StarterPacksLibrarySource extends ReadOnlyLibrarySource {
	readonly id = 'starter-packs'
	private readonly items = atom<ReadonlyMap<TLLibraryId, TLLibraryItem[]>>(
		'starter pack items',
		new Map()
	)
	private readonly packItems = new Map<TLLibraryItemId, { packId: string; itemId: string }>()
	private readonly loading = new Map<TLLibraryId, Promise<void>>()
	private readonly packIdsByLibrary: ReadonlyMap<TLLibraryId, string>
	private readonly libraries = computed('starter pack libraries', () => {
		const summaries = this.getSummaries()
		if (!summaries) return []
		return this.packIds.flatMap((id) => {
			const summary = summaries.find((s) => s.id === id)
			return summary ? [toLibrary(summary)] : []
		})
	})

	constructor(
		private readonly packIds: string[] = STARTER_PACK_IDS,
		private readonly loadIndex: (id: string) => Promise<StarterPackIndex> = loadStarterPackIndex,
		private readonly loadContent: (
			packId: string,
			itemId: string
		) => Promise<TLLibraryItemContent> = loadStarterPackItemContent,
		private readonly getSummaries: () => StarterPackSummary[] | undefined = getStarterPackSummaries,
		private readonly loadSummaries: () => Promise<unknown> = loadStarterPackSummaries
	) {
		super()
		this.packIdsByLibrary = new Map(packIds.map((id) => [getStarterPackLibraryId(id), id]))
	}

	/** Fetches the packs' summaries, which list them. Their items are fetched separately. */
	async load() {
		try {
			await this.loadSummaries()
		} catch (error) {
			console.error("Couldn't load the starter packs", error)
		}
	}

	getLibraries() {
		return this.libraries.get()
	}

	getItems(libraryId: TLLibraryId) {
		return this.items.get().get(libraryId) ?? []
	}

	/** Whether a listed pack's items are still to arrive. */
	isLoadingItems(libraryId: TLLibraryId) {
		return this.packIdsByLibrary.has(libraryId) && !this.items.get().has(libraryId)
	}

	/** From the names in the pack's summary, so a pack is fetched for a search only if it matches. */
	mayHaveItemsMatching(libraryId: TLLibraryId, query: string) {
		const packId = this.packIdsByLibrary.get(libraryId)
		const summary =
			packId === undefined ? undefined : this.getSummaries()?.find((s) => s.id === packId)
		if (!summary) return false
		return summary.itemNames.some((name) => name.toLowerCase().includes(query))
	}

	/** Fetched for each item when it's placed: the listing doesn't carry it. */
	async getItemContent(itemId: TLLibraryItemId) {
		const packItem = this.packItems.get(itemId)
		if (!packItem) throw new LibraryNotFoundError(itemId)
		return this.loadContent(packItem.packId, packItem.itemId)
	}

	/** Fetches a pack's items, without their content, once. A pack that fails is logged, and fetched again next time. */
	loadItems(libraryId: TLLibraryId) {
		const packId = this.packIdsByLibrary.get(libraryId)
		if (packId === undefined) return Promise.resolve()
		const existing = this.loading.get(libraryId)
		if (existing) return existing
		const loading = this.loadIndex(packId).then(
			(pack) => this.listItems(libraryId, pack),
			(error) => {
				console.error(`Couldn't load the starter pack ${packId}`, error)
				this.loading.delete(libraryId)
			}
		)
		this.loading.set(libraryId, loading)
		return loading
	}

	private listItems(libraryId: TLLibraryId, pack: StarterPackIndex) {
		const items = pack.items.map((packItem) => {
			const item = LibraryItemRecordType.create({
				id: LibraryItemRecordType.createId(`starter-pack-${pack.id}-${packItem.id}`),
				libraryId,
				...(packItem.name === undefined ? {} : { name: packItem.name }),
				...(packItem.thumbnail === undefined ? {} : { thumbnail: packItem.thumbnail }),
				...(packItem.meta === undefined ? {} : { meta: packItem.meta }),
			})
			this.packItems.set(item.id, { packId: pack.id, itemId: packItem.id })
			return item
		})
		this.items.update((all) => new Map(all).set(libraryId, items))
	}
}

function toLibrary(summary: StarterPackSummary): TLLibrary {
	return LibraryRecordType.create({
		id: getStarterPackLibraryId(summary.id),
		name: summary.name,
		meta: { packId: summary.id, packVersion: summary.version },
	})
}
