import { describe, expect, it } from 'vitest'
import { MediaHelpers } from './media'

describe('MediaHelpers', () => {
	// Note: Most MediaHelpers methods are DOM-dependent and already tested through
	// integration tests in packages that use them. The complex mocking required
	// for these tests doesn't add value and makes tests brittle.

	describe('type checking methods', () => {
		it('should correctly identify animated image types', () => {
			expect(MediaHelpers.isAnimatedImageType('image/gif')).toBe(true)
			expect(MediaHelpers.isAnimatedImageType('image/apng')).toBe(true)
			expect(MediaHelpers.isAnimatedImageType('image/avif')).toBe(true)
			expect(MediaHelpers.isAnimatedImageType('image/webp')).toBe(false) // webp can be static
		})

		it('should correctly identify static image types', () => {
			expect(MediaHelpers.isStaticImageType('image/jpeg')).toBe(true)
			expect(MediaHelpers.isStaticImageType('image/png')).toBe(true)
			expect(MediaHelpers.isStaticImageType('image/webp')).toBe(true)
			expect(MediaHelpers.isStaticImageType('image/gif')).toBe(false)
		})

		it('should correctly identify vector image types', () => {
			expect(MediaHelpers.isVectorImageType('image/svg+xml')).toBe(true)
			expect(MediaHelpers.isVectorImageType('image/jpeg')).toBe(false)
			expect(MediaHelpers.isVectorImageType('image/gif')).toBe(false)
		})

		it('should correctly identify all image types', () => {
			expect(MediaHelpers.isImageType('image/jpeg')).toBe(true)
			expect(MediaHelpers.isImageType('image/png')).toBe(true)
			expect(MediaHelpers.isImageType('image/gif')).toBe(true)
			expect(MediaHelpers.isImageType('image/svg+xml')).toBe(true)
			expect(MediaHelpers.isImageType('video/mp4')).toBe(false)
			expect(MediaHelpers.isImageType('text/plain')).toBe(false)
		})

		it('should handle null and undefined gracefully', () => {
			expect(MediaHelpers.isAnimatedImageType(null)).toBe(false)
			expect(MediaHelpers.isStaticImageType(null)).toBe(false)
			expect(MediaHelpers.isVectorImageType(null)).toBe(false)
		})
	})

	// Note: The following methods are not tested here as they require extensive DOM mocking
	// that would test the mocking framework more than the actual business logic:
	// - loadVideo: Complex DOM video element mocking
	// - getVideoFrameAsDataUrl: Canvas and video interaction mocking
	// - getImageAndDimensions: Image element and DOM manipulation mocking
	// - getVideoSize: Depends on loadVideo
	// - getImageSize: Complex PNG parsing logic with extensive mocking
	// - isAnimated: Delegates to format-specific functions already tested elsewhere
	// - usingObjectURL: Simple wrapper around URL APIs with cleanup

	// These methods are better tested through integration tests in the consuming packages
	// (like @tldraw/tldraw) where they're used in realistic scenarios.
})
