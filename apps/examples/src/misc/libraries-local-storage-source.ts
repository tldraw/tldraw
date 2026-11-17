import {
	LibraryItemRecordType,
	LibraryNotFoundError,
	LibraryRecordType,
	type LibrarySource,
	parseLibraryItemContent,
	type TLLibrary,
	type TLLibraryId,
	type TLLibraryItem,
	type TLLibraryItemContent,
	type TLLibraryItemId,
	type TLLibraryThumbnail,
	type TLNewLibraryItem,
	type TLNewLibraryOptions,
} from '@tldraw/libraries'
import { type Atom, atom, FileHelpers } from 'tldraw'

interface Saved {
	libraries: TLLibrary[]
	items: TLLibraryItem[]
	contents: Record<TLLibraryItemId, TLLibraryItemContent>
}

const EMPTY: Saved = { libraries: [], items: [], contents: {} }

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
 * A source written outside the SDK: libraries saved to localStorage, each write taking a moment
 * as if it went to a server. Reads come from an atom, so the panel updates once a write lands.
 */
export class LocalStorageLibrarySource implements LibrarySource {
	private readonly saved: Atom<Saved>

	constructor(
		readonly id: string,
		private readonly key: string
	) {
		this.saved = atom('saved libraries', load(key))
	}

	getLibraries() {
		return this.saved.get().libraries
	}

	getItems(libraryId: TLLibraryId) {
		return this.saved.get().items.filter((item) => item.libraryId === libraryId)
	}

	async getItemContent(itemId: TLLibraryItemId) {
		const content = this.saved.get().contents[itemId]
		if (!content) throw new LibraryNotFoundError(itemId)
		return content
	}

	can() {
		return true
	}

	async createLibrary(name: string, options: TLNewLibraryOptions = {}) {
		const { parentId } = options
		if (parentId !== undefined && !this.getLibraries().some((c) => c.id === parentId)) {
			throw new LibraryNotFoundError(parentId)
		}
		const library = LibraryRecordType.create({
			name,
			meta: options.meta ?? {},
			...(parentId === undefined ? {} : { parentId }),
		})
		await this.write((s) => ({ ...s, libraries: [...s.libraries, library] }))
		return library
	}

	async renameLibrary(libraryId: TLLibraryId, name: string) {
		await this.write((s) => ({
			...s,
			libraries: s.libraries.map((c) => (c.id === libraryId ? { ...c, name } : c)),
		}))
	}

	// Deletes the libraries inside it too, at any depth.
	async deleteLibrary(libraryId: TLLibraryId) {
		await this.write((s) => {
			const deleted = new Set<TLLibraryId>([libraryId])
			for (let grew = true; grew; ) {
				grew = false
				for (const c of s.libraries) {
					if (c.parentId && deleted.has(c.parentId) && !deleted.has(c.id)) {
						deleted.add(c.id)
						grew = true
					}
				}
			}
			const contents = { ...s.contents }
			for (const item of s.items) {
				if (deleted.has(item.libraryId)) delete contents[item.id]
			}
			return {
				libraries: s.libraries.filter((c) => !deleted.has(c.id)),
				items: s.items.filter((item) => !deleted.has(item.libraryId)),
				contents,
			}
		})
	}

	async addItem(libraryId: TLLibraryId, newItem: TLNewLibraryItem) {
		const [item] = await this.addItems(libraryId, [newItem])
		return item
	}

	async addItems(libraryId: TLLibraryId, newItems: TLNewLibraryItem[]) {
		const now = Date.now()
		const added = await Promise.all(
			newItems.map(async (newItem, index) => {
				const thumbnail = newItem.thumbnail && (await toDataUrls(newItem.thumbnail))
				const item = LibraryItemRecordType.create({
					libraryId,
					createdAt: now + index,
					...(newItem.name === undefined ? {} : { name: newItem.name }),
					...(thumbnail ? { thumbnail } : {}),
					...(newItem.meta === undefined ? {} : { meta: newItem.meta }),
				})
				return { item, content: parseLibraryItemContent(newItem.content) }
			})
		)
		await this.write((s) => ({
			...s,
			items: [...s.items, ...added.map(({ item }) => item)],
			contents: {
				...s.contents,
				...Object.fromEntries(added.map(({ item, content }) => [item.id, content])),
			},
		}))
		return added.map(({ item }) => item)
	}

	async renameItem(itemId: TLLibraryItemId, name: string) {
		await this.write((s) => ({
			...s,
			items: s.items.map((item) => (item.id === itemId ? { ...item, name } : item)),
		}))
	}

	async deleteItem(itemId: TLLibraryItemId) {
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

async function toDataUrls(thumbnail: TLLibraryThumbnail<Blob>): Promise<TLLibraryThumbnail> {
	if (thumbnail instanceof Blob) return FileHelpers.blobToDataUrl(thumbnail)
	const [light, dark] = await Promise.all([
		FileHelpers.blobToDataUrl(thumbnail.light),
		FileHelpers.blobToDataUrl(thumbnail.dark),
	])
	return { light, dark }
}
