import { AssetRecordType } from 'tldraw'
import {
	BG_ORIGINAL_ASSET_ID,
	BG_REMOVED_ASSET_ID,
	pixelsHaveTransparency,
	readBackgroundRemovalPair,
	removeBackgroundRequestPath,
	shouldOfferBackgroundRemoval,
	staleBackgroundRemovalMeta,
	userContentObjectName,
} from './backgroundRemoval'

const USER_CONTENT = 'https://tldrawusercontent.com'
const originalId = AssetRecordType.createId('original')
const removedId = AssetRecordType.createId('removed')

describe('userContentObjectName', () => {
	it('reads the object name from a user-content url', () => {
		expect(userContentObjectName(`${USER_CONTENT}/abc-photo.png`, USER_CONTENT)).toBe(
			'abc-photo.png'
		)
	})

	it('ignores images hosted somewhere else', () => {
		expect(userContentObjectName('https://example.com/photo.png', USER_CONTENT)).toBeNull()
		expect(userContentObjectName('data:image/png;base64,aaaa', USER_CONTENT)).toBeNull()
	})

	it('rejects a name that decodes to a path', () => {
		expect(userContentObjectName(`${USER_CONTENT}/%2e%2e%2fsecret`, USER_CONTENT)).toBeNull()
	})
})

describe('removeBackgroundRequestPath', () => {
	it('points at the same-origin uploads route', () => {
		expect(removeBackgroundRequestPath('abc-photo.png')).toBe(
			'/api/app/uploads/abc-photo.png/remove-background'
		)
	})
})

describe('shouldOfferBackgroundRemoval', () => {
	const base = {
		objectName: 'abc-photo.png',
		isAnimated: false,
		isVector: false,
		hasTransparentPixels: false as boolean | null,
		hasPair: false,
	}

	it('offers the control for an opaque hosted image', () => {
		expect(shouldOfferBackgroundRemoval(base)).toBe(true)
	})

	it('waits until transparency is known', () => {
		expect(shouldOfferBackgroundRemoval({ ...base, hasTransparentPixels: null })).toBe(false)
	})

	it('hides the control when the image already has transparent pixels and was not cut out here', () => {
		expect(shouldOfferBackgroundRemoval({ ...base, hasTransparentPixels: true })).toBe(false)
	})

	it('keeps the control when a cutout pair exists, so it can toggle back', () => {
		expect(
			shouldOfferBackgroundRemoval({ ...base, hasTransparentPixels: true, hasPair: true })
		).toBe(true)
	})

	it('hides animated images, vectors, and images we do not host', () => {
		expect(shouldOfferBackgroundRemoval({ ...base, isAnimated: true })).toBe(false)
		expect(shouldOfferBackgroundRemoval({ ...base, isVector: true })).toBe(false)
		expect(shouldOfferBackgroundRemoval({ ...base, objectName: null })).toBe(false)
	})
})

describe('pixelsHaveTransparency', () => {
	it('treats a fully opaque bitmap as opaque', () => {
		expect(pixelsHaveTransparency(new Uint8ClampedArray([0, 0, 0, 255, 1, 2, 3, 255]))).toBe(false)
	})

	it('finds a transparent pixel on a sampled boundary', () => {
		expect(pixelsHaveTransparency(new Uint8ClampedArray([0, 0, 0, 0]))).toBe(true)
	})
})

describe('staleBackgroundRemovalMeta', () => {
	const pair = {
		[BG_ORIGINAL_ASSET_ID]: originalId,
		[BG_REMOVED_ASSET_ID]: removedId,
	}

	it('keeps the pair when toggling between the two assets', () => {
		expect(staleBackgroundRemovalMeta(originalId, removedId, pair)).toBeNull()
		expect(staleBackgroundRemovalMeta(removedId, originalId, pair)).toBeNull()
	})

	it('clears the pair when the image is replaced', () => {
		expect(staleBackgroundRemovalMeta(originalId, AssetRecordType.createId('new'), pair)).toEqual({
			[BG_ORIGINAL_ASSET_ID]: null,
			[BG_REMOVED_ASSET_ID]: null,
		})
	})

	it('reads both ids back off the shape', () => {
		expect(readBackgroundRemovalPair(pair)).toEqual({
			originalAssetId: originalId,
			removedAssetId: removedId,
		})
	})
})
