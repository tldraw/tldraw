import { act, fireEvent } from '@testing-library/react'
import { AssetRecordType, Editor, TLAssetId, TLBookmarkShape, createShapeId } from '@tldraw/editor'
import { Tldraw } from '../lib/Tldraw'
import { renderTldrawComponentWithEditor } from './testutils/renderTldrawComponent'

let editor: Editor

const shapeId = createShapeId('bookmark')

function createBookmarkAsset(id: TLAssetId, url: string, favicon: string) {
	editor.createAssets([
		{
			id,
			type: 'bookmark',
			typeName: 'asset',
			props: { src: url, title: 'Title', description: '', image: '', favicon },
			meta: {},
		},
	])
}

function getFavicon() {
	return document.querySelector<HTMLImageElement>('.tl-bookmark__favicon')
}

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
})

describe('bookmark favicon', () => {
	it('shows the new favicon after a previous favicon failed to load', async () => {
		const firstAssetId = AssetRecordType.createId('first')
		const secondAssetId = AssetRecordType.createId('second')

		await act(async () => {
			createBookmarkAsset(firstAssetId, 'https://broken.com', 'https://broken.com/favicon.ico')
			createBookmarkAsset(secondAssetId, 'https://working.com', 'https://working.com/favicon.ico')
			editor.createShapes<TLBookmarkShape>([
				{
					id: shapeId,
					type: 'bookmark',
					x: 0,
					y: 0,
					props: { assetId: firstAssetId, url: 'https://broken.com' },
				},
			])
		})

		const brokenFavicon = getFavicon()
		expect(brokenFavicon?.getAttribute('src')).toBe('https://broken.com/favicon.ico')

		await act(async () => {
			fireEvent.error(brokenFavicon!)
		})
		expect(getFavicon()).toBeNull()

		await act(async () => {
			editor.updateShapes<TLBookmarkShape>([
				{ id: shapeId, type: 'bookmark', props: { assetId: secondAssetId } },
			])
		})

		expect(getFavicon()?.getAttribute('src')).toBe('https://working.com/favicon.ico')
	})
})
