import { act, renderHook } from '@testing-library/react'
import { AssetRecordType, Editor, EditorProvider, TLAssetId } from '@tldraw/editor'
import { ReactNode } from 'react'
import { vi } from 'vitest'
import { renderTldrawComponentWithEditor } from '../../../test/testutils/renderTldrawComponent'
import { Tldraw } from '../../Tldraw'
import { useImageOrVideoAsset } from './useImageOrVideoAsset'

let editor: Editor
const assetId = AssetRecordType.createId('image')
const otherAssetId = AssetRecordType.createId('image2')

function imageAsset(id: TLAssetId, w: number, src = 'http://localhost/image.png') {
	return {
		id,
		type: 'image' as const,
		typeName: 'asset' as const,
		props: {
			w,
			h: 100,
			name: 'image.png',
			isAnimated: false,
			mimeType: 'image/png',
			src,
		},
		meta: {},
	}
}

beforeEach(async () => {
	const result = await renderTldrawComponentWithEditor((onMount) => <Tldraw onMount={onMount} />, {
		waitForPatterns: false,
	})
	editor = result.editor
	editor.createAssets([imageAsset(assetId, 100)])
})

async function flush() {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0))
	})
}

function renderAssetHook(initialAssetId: TLAssetId | null) {
	const wrapper = ({ children }: { children: ReactNode }) => (
		<EditorProvider editor={editor}>{children}</EditorProvider>
	)
	return renderHook(
		({ assetId }: { assetId: TLAssetId | null }) => useImageOrVideoAsset({ assetId, width: 100 }),
		{ wrapper, initialProps: { assetId: initialAssetId } }
	)
}

it('clears the resolved asset when the assetId is removed, and resolves it again when re-attached', async () => {
	const { result, rerender } = renderAssetHook(assetId)
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

it('resolves the asset again when its record is deleted and recreated', async () => {
	const { result } = renderAssetHook(assetId)
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: assetId },
	})

	await act(async () => editor.deleteAssets([assetId]))
	await flush()
	expect(result.current).toMatchObject({ url: null, asset: null })

	await act(async () => editor.createAssets([imageAsset(assetId, 100)]))
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: assetId },
	})
})

it('returns the new asset when switching to one that resolves to the same url', async () => {
	editor.createAssets([imageAsset(otherAssetId, 200)])
	const { result, rerender } = renderAssetHook(assetId)
	await flush()
	expect(result.current.asset).toMatchObject({ id: assetId, props: { w: 100 } })

	rerender({ assetId: otherAssetId })
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: otherAssetId, props: { w: 200 } },
	})
})

it('shows the new asset, not the old one, when switching to an asset that has no url yet', async () => {
	// Like the dotcom asset stores, resolve an asset without a src to null rather than ''
	const resolve = editor.resolveAssetUrl.bind(editor)
	vi.spyOn(editor, 'resolveAssetUrl').mockImplementation(
		async (id, ctx) => (await resolve(id, ctx)) || null
	)
	editor.createAssets([imageAsset(otherAssetId, 200, '')])
	const { result, rerender } = renderAssetHook(assetId)
	await flush()
	expect(result.current).toMatchObject({
		url: 'http://localhost/image.png',
		asset: { id: assetId },
	})

	rerender({ assetId: otherAssetId })
	await flush()
	expect(result.current).toMatchObject({ url: null, asset: { id: otherAssetId } })
})
