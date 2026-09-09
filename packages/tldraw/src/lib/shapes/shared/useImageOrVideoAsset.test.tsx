import { act, renderHook } from '@testing-library/react'
import { AssetRecordType, Editor, EditorProvider, TLAssetId } from '@tldraw/editor'
import { ReactNode } from 'react'
import { renderTldrawComponentWithEditor } from '../../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../../Tldraw'
import { useImageOrVideoAsset } from './useImageOrVideoAsset'

let editor: Editor
const assetId = AssetRecordType.createId('image')

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
	editor.createAssets([
		{
			id: assetId,
			type: 'image',
			typeName: 'asset',
			props: {
				w: 100,
				h: 100,
				name: 'image.png',
				isAnimated: false,
				mimeType: 'image/png',
				src: 'http://localhost/image.png',
			},
			meta: {},
		},
	])
})

async function flush() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
}

it('clears the resolved asset when the assetId is removed, and resolves it again when re-attached', async () => {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<EditorProvider editor={editor}>{children}</EditorProvider>
	)
	const { result, rerender } = renderHook(
		({ assetId }: { assetId: TLAssetId | null }) => useImageOrVideoAsset({ assetId, width: 100 }),
		{ wrapper, initialProps: { assetId: assetId as TLAssetId | null } }
	)
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: assetId },
	})

	rerender({ assetId: null })
	await flush()
	expect(result.current).toMatchObject({ url: null, asset: null })

	rerender({ assetId })
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: assetId },
	})
})
