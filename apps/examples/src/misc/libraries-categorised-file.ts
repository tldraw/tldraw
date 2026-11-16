import type { LibraryPack, LibraryPackItem, LibraryPackLibrary } from '@tldraw/libraries'
import { Box, Editor, FileHelpers, type TLContent, type TLShapeId } from 'tldraw'

// A file of item lists, each item naming the category it belongs in:
// { [listName]: [{ id, name, category, content: TLContent }] }
interface CategorisedItem {
	id: string
	name: string
	category: string
	content: TLContent
}
type CategorisedFile = Record<string, CategorisedItem[]>

const THUMBNAIL_SIZE = 256
const OFF_SCREEN = -100_000

// Draws the content off-screen, exports it in each colour mode, then deletes it.
async function renderThumbnail(editor: Editor, content: TLContent) {
	const before = new Set(editor.getCurrentPageShapeIds())
	editor.run(
		() =>
			editor.putContentOntoCurrentPage(content, {
				point: { x: OFF_SCREEN, y: OFF_SCREEN },
				select: false,
			}),
		{ history: 'ignore' }
	)
	const ids = [...editor.getCurrentPageShapeIds()].filter((id) => !before.has(id)) as TLShapeId[]
	try {
		const bounds = Box.Common(ids.map((id) => editor.getShapePageBounds(id)!).filter(Boolean))
		const scale = Math.min(4, THUMBNAIL_SIZE / Math.max(bounds.w, bounds.h, 1))
		const [light, dark] = await Promise.all(
			[false, true].map((darkMode) =>
				editor.toImage(ids, { format: 'png', background: false, scale, darkMode })
			)
		)
		return {
			light: await FileHelpers.blobToDataUrl(light.blob),
			dark: await FileHelpers.blobToDataUrl(dark.blob),
		}
	} catch {
		return undefined
	} finally {
		editor.run(() => editor.deleteShapes(ids), { history: 'ignore' })
	}
}

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1)

/**
 * One pack per list in the file, with a library inside it per category, in the order the
 * categories first appear, and thumbnails rendered on `editor`.
 */
export async function packsFromCategorisedFile(
	editor: Editor,
	file: CategorisedFile
): Promise<LibraryPack[]> {
	const packs: LibraryPack[] = []
	for (const [listName, items] of Object.entries(file)) {
		const categories = new Map<string, LibraryPackLibrary>()
		for (const item of items) {
			const packItem: LibraryPackItem = {
				id: item.id,
				name: item.name,
				content: {
					formatVersion: 1,
					content: { ...item.content, assets: item.content.assets ?? [] },
				},
				thumbnail: await renderThumbnail(editor, item.content),
			}
			let category = categories.get(item.category)
			if (!category) {
				category = { id: item.category, name: item.category, items: [] }
				categories.set(item.category, category)
			}
			category.items.push(packItem)
		}
		packs.push({
			id: `file-${listName}`,
			name: titleCase(listName),
			version: 1,
			items: [],
			libraries: [...categories.values()],
		})
	}
	return packs
}

/** Asks for a JSON file and resolves with its contents, or undefined if none is picked. */
export function pickJsonFile(): Promise<CategorisedFile | undefined> {
	return new Promise((resolve) => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'application/json,.json'
		input.addEventListener('change', async () => {
			const file = input.files?.[0]
			resolve(file ? JSON.parse(await file.text()) : undefined)
		})
		input.addEventListener('cancel', () => resolve(undefined))
		input.click()
	})
}
