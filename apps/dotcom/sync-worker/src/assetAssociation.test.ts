import { describe, expect, it } from 'vitest'
import { collectAssetAssociationChanges } from './assetAssociation'

const SLUG = 'file-slug-123'
const USER_CONTENT = 'https://tldrawusercontent.com'

function imageAsset(overrides: {
	id?: string
	src?: string | null
	fileId?: string | null
	type?: string
}) {
	return {
		typeName: 'asset',
		type: overrides.type ?? 'image',
		id: overrides.id ?? 'asset:1',
		props: { src: overrides.src },
		meta: overrides.fileId === undefined ? {} : { fileId: overrides.fileId },
	}
}

function collect(records: unknown[], skipObjectNames?: ReadonlySet<string>) {
	return collectAssetAssociationChanges(records, {
		slug: SLUG,
		userContentUrl: USER_CONTENT,
		skipObjectNames,
	})
}

describe('collectAssetAssociationChanges', () => {
	it('queues a copy for an asset from another file, preserving the file type suffix', () => {
		const { assetsToReplace, assetsToMigrate } = collect([
			imageAsset({ src: `${USER_CONTENT}/abc123-png`, fileId: 'other-file' }),
		])
		expect(assetsToMigrate).toEqual([])
		expect(assetsToReplace).toEqual([
			{
				assetId: 'asset:1',
				objectName: 'abc123-png',
				newObjectName: expect.stringMatching(/-png$/),
				newSrc: expect.stringMatching(new RegExp(`^${USER_CONTENT}/.*-png$`)),
			},
		])
		expect(assetsToReplace[0].newObjectName).not.toBe('abc123-png')
	})

	it('queues a copy for an unassociated asset without a file type suffix', () => {
		const { assetsToReplace } = collect([imageAsset({ src: `${USER_CONTENT}/abc123` })])
		expect(assetsToReplace).toHaveLength(1)
		expect(assetsToReplace[0].objectName).toBe('abc123')
	})

	it('migrates old-format urls for assets already associated with this file', () => {
		const { assetsToReplace, assetsToMigrate } = collect([
			imageAsset({ src: 'https://old-host.tldraw.com/uploads/abc123-png', fileId: SLUG }),
		])
		expect(assetsToReplace).toEqual([])
		expect(assetsToMigrate).toEqual([{ assetId: 'asset:1', newSrc: `${USER_CONTENT}/abc123-png` }])
	})

	it('leaves associated assets with current-format urls alone', () => {
		const result = collect([imageAsset({ src: `${USER_CONTENT}/abc123-png`, fileId: SLUG })])
		expect(result).toEqual({ assetsToReplace: [], assetsToMigrate: [] })
	})

	it('skips bookmark assets — their src is the bookmarked page url, not an upload', () => {
		const result = collect([
			imageAsset({ type: 'bookmark', src: 'https://example.com/products/melvin' }),
			imageAsset({ type: 'bookmark', src: 'https://example.com/page', fileId: SLUG }),
		])
		expect(result).toEqual({ assetsToReplace: [], assetsToMigrate: [] })
	})

	it('skips data: and missing srcs', () => {
		const result = collect([
			imageAsset({ src: 'data:image/png;base64,AAAA' }),
			imageAsset({ src: null }),
			imageAsset({ src: '' }),
		])
		expect(result).toEqual({ assetsToReplace: [], assetsToMigrate: [] })
	})

	it('skips object names R2 would reject', () => {
		const longName = 'a'.repeat(2000)
		const result = collect([
			imageAsset({ src: `https://example.com/${longName}` }),
			imageAsset({ src: 'https://example.com/trailing/' }),
		])
		expect(result).toEqual({ assetsToReplace: [], assetsToMigrate: [] })
	})

	it('skips object names a previous pass found missing from the bucket', () => {
		const { assetsToReplace } = collect(
			[
				imageAsset({ id: 'asset:1', src: `${USER_CONTENT}/gone-png` }),
				imageAsset({ id: 'asset:2', src: `${USER_CONTENT}/present-png` }),
			],
			new Set(['gone-png'])
		)
		expect(assetsToReplace.map((a) => a.assetId)).toEqual(['asset:2'])
	})

	it('ignores non-asset records', () => {
		const result = collect([{ typeName: 'shape', type: 'image', props: {} }])
		expect(result).toEqual({ assetsToReplace: [], assetsToMigrate: [] })
	})
})
