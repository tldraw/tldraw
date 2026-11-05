import type { TLRecord } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { pruneUnusedAssetsForTldr } from './pruneUnusedAssets'

const asset = (id: string) => ({ id, typeName: 'asset', type: 'image', props: {}, meta: {} })

describe('pruneUnusedAssetsForTldr', () => {
	it('keeps assets a shape or a board collection item names, and drops the rest', () => {
		const records = [
			asset('asset:on-canvas'),
			asset('asset:in-collection'),
			asset('asset:unused'),
			{
				id: 'shape:image',
				typeName: 'shape',
				type: 'image',
				props: { assetId: 'asset:on-canvas' },
			},
			{
				id: 'collection-item-content:photo',
				typeName: 'collection-item-content',
				itemId: 'collection-item:photo',
				content: { shapes: [], rootShapeIds: [], schema: {} },
				assetIds: ['asset:in-collection'],
				meta: {},
			},
		] as unknown as TLRecord[]

		expect(
			pruneUnusedAssetsForTldr(records)
				.filter((r) => r.typeName === 'asset')
				.map((r) => r.id)
		).toEqual(['asset:on-canvas', 'asset:in-collection'])
	})
})
