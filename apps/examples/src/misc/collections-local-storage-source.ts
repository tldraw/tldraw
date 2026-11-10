import {
	CollectionItemRecordType,
	CollectionNotFoundError,
	CollectionRecordType,
	type CollectionSource,
	parseCollectionItemContent,
	type TLCollection,
	type TLCollectionId,
	type TLCollectionItem,
	type TLCollectionItemContent,
	type TLCollectionItemId,
	type TLCollectionThumbnail,
	type TLNewCollectionItem,
	type TLNewCollectionOptions,
} from '@tldraw/collections'
import { type Atom, atom, FileHelpers } from 'tldraw'

interface Saved {
	collections: TLCollection[]
	items: TLCollectionItem[]
	contents: Record<TLCollectionItemId, TLCollectionItemContent>
}

const EMPTY: Saved = { collections: [], items: [], contents: {} }

const LATENCY_MS = 250

function load(key: string): Saved {
	try {
		const saved = localStorage.getItem(key)
		return saved ? JSON.parse(saved) : EMPTY
	} catch {
		return EMPTY
	}
}

/**
 * A source written outside the SDK: collections saved to localStorage, each write taking a moment
 * as if it went to a server. Reads come from an atom, so the panel updates once a write lands.
 */
export class LocalStorageCollectionSource implements CollectionSource {
	private readonly saved: Atom<Saved>

	constructor(
		readonly id: string,
		private readonly key: string
	) {
		this.saved = atom('saved collections', load(key))
	}

	getCollections() {
		return this.saved.get().collections
	}

	getItems(collectionId: TLCollectionId) {
		return this.saved.get().items.filter((item) => item.collectionId === collectionId)
	}

	async getItemContent(itemId: TLCollectionItemId) {
		const content = this.saved.get().contents[itemId]
		if (!content) throw new CollectionNotFoundError(itemId)
		return content
	}

	can() {
		return true
	}

	async createCollection(name: string, options: TLNewCollectionOptions = {}) {
		const collection = CollectionRecordType.create({ name, meta: options.meta ?? {} })
		await this.write((s) => ({ ...s, collections: [...s.collections, collection] }))
		return collection
	}

	async renameCollection(collectionId: TLCollectionId, name: string) {
		await this.write((s) => ({
			...s,
			collections: s.collections.map((c) => (c.id === collectionId ? { ...c, name } : c)),
		}))
	}

	async deleteCollection(collectionId: TLCollectionId) {
		await this.write((s) => {
			const contents = { ...s.contents }
			for (const item of s.items) {
				if (item.collectionId === collectionId) delete contents[item.id]
			}
			return {
				collections: s.collections.filter((c) => c.id !== collectionId),
				items: s.items.filter((item) => item.collectionId !== collectionId),
				contents,
			}
		})
	}

	async addItem(collectionId: TLCollectionId, newItem: TLNewCollectionItem) {
		const content = parseCollectionItemContent(newItem.content)
		const thumbnail = newItem.thumbnail && (await toDataUrls(newItem.thumbnail))
		const item = CollectionItemRecordType.create({
			collectionId,
			createdAt: Date.now(),
			...(newItem.name === undefined ? {} : { name: newItem.name }),
			...(thumbnail ? { thumbnail } : {}),
		})
		await this.write((s) => ({
			...s,
			items: [...s.items, item],
			contents: { ...s.contents, [item.id]: content },
		}))
		return item
	}

	async renameItem(itemId: TLCollectionItemId, name: string) {
		await this.write((s) => ({
			...s,
			items: s.items.map((item) => (item.id === itemId ? { ...item, name } : item)),
		}))
	}

	async deleteItem(itemId: TLCollectionItemId) {
		await this.write((s) => {
			const { [itemId]: _deleted, ...contents } = s.contents
			return { ...s, items: s.items.filter((item) => item.id !== itemId), contents }
		})
	}

	private async write(change: (saved: Saved) => Saved) {
		await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
		const next = change(this.saved.get())
		localStorage.setItem(this.key, JSON.stringify(next))
		this.saved.set(next)
	}
}

async function toDataUrls(thumbnail: TLCollectionThumbnail<Blob>): Promise<TLCollectionThumbnail> {
	if (thumbnail instanceof Blob) return FileHelpers.blobToDataUrl(thumbnail)
	const [light, dark] = await Promise.all([
		FileHelpers.blobToDataUrl(thumbnail.light),
		FileHelpers.blobToDataUrl(thumbnail.dark),
	])
	return { light, dark }
}
