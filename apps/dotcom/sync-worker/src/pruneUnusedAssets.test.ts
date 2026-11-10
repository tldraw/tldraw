import type { TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { pruneUnusedAssetsForTldr } from './pruneUnusedAssets'

const asset = (id: string) => ({ id, typeName: 'asset', type: 'image', props: {}, meta: {} })

describe('pruneUnusedAssetsForTldr', () => {
	it('keeps assets that a shape or any other record names, and drops the rest', () => {
		const records = [
			asset('asset:by-shape'),
			asset('asset:in-array'),
			asset('asset:in-object'),
			asset('asset:unused'),
			{ id: 'shape:image', typeName: 'shape', type: 'image', props: { assetId: 'asset:by-shape' } },
			{
				id: 'stash:1',
				typeName: 'stash',
				assetIds: ['asset:in-array'],
				thumbnail: { light: 'asset:in-object' },
			},
		] as unknown as TLRecord[]

		expect(
			pruneUnusedAssetsForTldr(records)
				.filter((r) => r.typeName === 'asset')
				.map((r) => r.id)
		).toEqual(['asset:by-shape', 'asset:in-array', 'asset:in-object'])
	})

	it('keeps an asset that only a board library item uses', () => {
		const records = [
			asset('asset:in-library'),
			{
				id: 'library-item:photo',
				typeName: 'library-item',
				libraryId: 'library:photos',
				thumbnail: 'asset:in-library',
				version: 1,
				meta: {},
			},
			{
				id: 'library-item-content:photo',
				typeName: 'library-item-content',
				itemId: 'library-item:photo',
				content: { shapes: [], rootShapeIds: [], schema: {} },
				assetIds: ['asset:in-library'],
				meta: {},
			},
		] as unknown as TLRecord[]

		expect(pruneUnusedAssetsForTldr(records)).toEqual(records)
	})
})
