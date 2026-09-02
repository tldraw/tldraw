import { AssetRecordType, MediaHelpers } from '@tldraw/editor'
import { describe, expect, it, vi } from 'vitest'
import { TestEditor } from '../../test/TestEditor'
import { defaultAssetUtils } from '../defaultAssetUtils'
import { ImageAssetUtil } from './ImageAssetUtil'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor({ assetUtils: defaultAssetUtils })
})

afterEach(() => {
	editor?.dispose()
})

describe('ImageAssetUtil', () => {
	describe('getAssetFromFile', () => {
		it('should include pixelRatio when image has non-1 pixelRatio', async () => {
			vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({
				w: 100,
				h: 200,
				pixelRatio: 2,
			})
			vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)

			const file = new File(['test'], 'test.png', { type: 'image/png' })
			const assetId = AssetRecordType.createId('test')
			const util = editor.getAssetUtil('image') as ImageAssetUtil
			const asset = await util.getAssetFromFile(file, assetId)

			expect(asset).not.toBeNull()
			expect(asset!.props.pixelRatio).toBe(2)
			expect(asset!.props.w).toBe(100)
			expect(asset!.props.h).toBe(200)
		})

		it('should not include pixelRatio when image has pixelRatio of 1', async () => {
			vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({
				w: 100,
				h: 200,
				pixelRatio: 1,
			})
			vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)

			const file = new File(['test'], 'test.png', { type: 'image/png' })
			const assetId = AssetRecordType.createId('test')
			const util = editor.getAssetUtil('image') as ImageAssetUtil
			const asset = await util.getAssetFromFile(file, assetId)

			expect(asset).not.toBeNull()
			expect(asset!.props.pixelRatio).toBeUndefined()
		})

		it('should pass doc to MediaHelpers.getImageSize for iframe compatibility', async () => {
			const getImageSizeSpy = vi
				.spyOn(MediaHelpers, 'getImageSize')
				.mockResolvedValue({ w: 100, h: 200, pixelRatio: 1 })
			vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)

			const file = new File(['test'], 'test.png', { type: 'image/png' })
			const assetId = AssetRecordType.createId('test')
			const util = editor.getAssetUtil('image') as ImageAssetUtil
			await util.getAssetFromFile(file, assetId)

			expect(getImageSizeSpy).toHaveBeenCalledWith(file, expect.any(Document))
		})

		it('should set correct asset properties from file', async () => {
			vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({
				w: 800,
				h: 600,
				pixelRatio: 1,
			})
			vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(true)

			const file = new File(['test-content'], 'animated.gif', { type: 'image/gif' })
			const assetId = AssetRecordType.createId('test2')
			const util = editor.getAssetUtil('image') as ImageAssetUtil
			const asset = await util.getAssetFromFile(file, assetId)

			expect(asset).toMatchObject({
				id: assetId,
				type: 'image',
				typeName: 'asset',
				props: {
					name: 'animated.gif',
					src: '',
					w: 800,
					h: 600,
					mimeType: 'image/gif',
					isAnimated: true,
				},
			})
		})

		it('should constrain dimensions to maxDimension for static images', async () => {
			vi.spyOn(MediaHelpers, 'getImageSize').mockResolvedValue({
				w: 8000,
				h: 4000,
				pixelRatio: 1,
			})
			vi.spyOn(MediaHelpers, 'isAnimated').mockResolvedValue(false)

			const file = new File(['test'], 'large.png', { type: 'image/png' })
			const assetId = AssetRecordType.createId('test3')
			const util = editor.getAssetUtil('image') as ImageAssetUtil
			const asset = await util.getAssetFromFile(file, assetId)

			expect(asset).not.toBeNull()
			// Input 8000x4000 should be constrained to 5000x2500
			expect(asset!.props.w).toBe(5000)
			expect(asset!.props.h).toBe(2500)
		})
	})
})
