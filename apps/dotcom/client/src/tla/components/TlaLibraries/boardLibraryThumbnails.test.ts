import { BoardLibrarySource } from '@tldraw/libraries'
import {
	AssetRecordType,
	createTLSchema,
	createTLStore,
	defaultAssetUtils,
	defaultBindingUtils,
	defaultShapeUtils,
	Editor,
	MediaHelpers,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fileSchemaRecords } from '../../../utils/fileSchemaRecords'
import { isBoardLibraryThumbnail } from './boardLibraryThumbnails'

let editor: Editor

afterEach(() => {
	editor.dispose()
	vi.restoreAllMocks()
})

const png = (text: string) => new Blob([text], { type: 'image/png' })
const content = {
	formatVersion: 1 as const,
	content: { shapes: [], bindings: [], rootShapeIds: [], assets: [], schema: {} as any },
}

describe('isBoardLibraryThumbnail', () => {
	it("is true for a board library item's thumbnails, as they upload, and not for other assets", async () => {
		editor = new Editor({
			store: createTLStore({ schema: createTLSchema({ records: fileSchemaRecords }) }),
			shapeUtils: defaultShapeUtils,
			bindingUtils: defaultBindingUtils,
			assetUtils: defaultAssetUtils,
			tools: [],
			getContainer: () => document.body,
		})
		vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({ w: 10, h: 10, pixelRatio: 1 })
		vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)
		const checked: boolean[] = []
		// Holds each thumbnail's upload, recording what the board says about it then.
		vi.spyOn(editor, 'getAssetForExternalContent').mockImplementation(async (info) => {
			if (info.type !== 'file') return undefined
			checked.push(isBoardLibraryThumbnail(editor, info.assetId!))
			return undefined
		})
		const source = new BoardLibrarySource(editor)
		const library = await source.createLibrary('Kit')
		await source.addItem(library.id, {
			content,
			thumbnail: { light: png('light'), dark: png('dark') },
		})
		await vi.waitFor(() => expect(checked).toEqual([true, true]))

		expect(isBoardLibraryThumbnail(editor, AssetRecordType.createId('photo'))).toBe(false)
	})
})
