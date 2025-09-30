import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules before imports
vi.mock('./useSync')
vi.mock('react', async () => {
	const actual = await vi.importActual('react')
	return {
		...actual,
		useMemo: vi.fn((fn, _deps) => fn()),
		useCallback: vi.fn((fn, _deps) => fn),
	}
})
vi.mock('tldraw', async () => {
	const actual = await vi.importActual('tldraw')
	return {
		...actual,
		useShallowObjectIdentity: vi.fn((obj) => obj),
		uniqueId: vi.fn(() => 'mock-unique-id'),
		getHashForString: vi.fn((str) => `hash-${str}`),
	}
})

import {
	TLAsset,
	defaultBindingUtils,
	defaultShapeUtils,
	getHashForString,
	uniqueId,
	useShallowObjectIdentity,
} from 'tldraw'
import { useSync } from './useSync'
import { useSyncDemo } from './useSyncDemo'

// Mock fetch globally
const mockFetch = vi.fn() as any
global.fetch = mockFetch

// Mock console.error and alert to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

describe('useSyncDemo', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		consoleSpy.mockClear()
		alertSpy.mockClear()
		vi.mocked(useSync).mockReturnValue({ status: 'loading' } as any)
		vi.mocked(useShallowObjectIdentity).mockImplementation((obj) => obj)
		vi.mocked(uniqueId).mockReturnValue('mock-unique-id')
		vi.mocked(getHashForString).mockImplementation((str) => `hash-${str}`)
	})

	describe('core functionality', () => {
		it('should construct correct URI with room ID encoding', () => {
			const roomIdWithSpecialChars = 'room with spaces & symbols!'
			useSyncDemo({ roomId: roomIdWithSpecialChars })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(useSyncCall.uri).toContain(encodeURIComponent(roomIdWithSpecialChars))
			expect(useSyncCall.roomId).toBe(roomIdWithSpecialChars)
		})

		it('should use custom host when provided', () => {
			const customHost = 'https://custom.server.com'
			useSyncDemo({ roomId: 'test-room', host: customHost })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(useSyncCall.uri).toBe(`${customHost}/connect/test-room`)
		})

		it('should merge custom shape utils with defaults', () => {
			const customShapeUtils = [{ type: 'custom-shape' } as any]
			useSyncDemo({ roomId: 'test-room', shapeUtils: customShapeUtils } as any)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect((useSyncCall as any).shapeUtils).toEqual([...defaultShapeUtils, ...customShapeUtils])
		})

		it('should merge custom binding utils with defaults', () => {
			const customBindingUtils = [{ type: 'custom-binding' } as any]
			useSyncDemo({ roomId: 'test-room', bindingUtils: customBindingUtils } as any)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect((useSyncCall as any).bindingUtils).toEqual([
				...defaultBindingUtils,
				...customBindingUtils,
			])
		})
	})

	describe('asset upload restrictions', () => {
		it('should block uploads for tldraw domains', async () => {
			useSyncDemo({ roomId: 'test-room', host: 'https://demo.tldraw.xyz' })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets
			const file = new File(['test content'], 'test-file.jpg')

			await expect(assetStore.upload({} as TLAsset, file)).rejects.toThrow(
				'Uploading images is disabled in this demo.'
			)
			expect(alertSpy).toHaveBeenCalledWith('Uploading images is disabled in this demo.')
		})

		it('should allow uploads for non-tldraw domains', async () => {
			useSyncDemo({ roomId: 'test-room', host: 'https://demo.server.com' })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets
			const file = new File(['test content'], 'test-file.jpg')

			vi.mocked(mockFetch).mockResolvedValueOnce(new Response())
			vi.mocked(uniqueId).mockReturnValueOnce('unique-123')

			const result = await assetStore.upload({} as TLAsset, file)

			expect(mockFetch).toHaveBeenCalledWith(
				'https://demo.server.com/uploads/unique-123-test-file-jpg',
				expect.objectContaining({ method: 'POST', body: file })
			)
			expect(result).toEqual({ src: 'https://demo.server.com/uploads/unique-123-test-file-jpg' })
		})
	})

	describe('bookmark asset creation', () => {
		it('should create bookmark assets with metadata when successful', async () => {
			const mockEditor = { registerExternalAssetHandler: vi.fn() } as any
			useSyncDemo({ roomId: 'test-room', host: 'https://demo.server.com' })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			useSyncCall.onMount!(mockEditor)

			const handlerFunction = mockEditor.registerExternalAssetHandler.mock.calls[0][1]
			const testUrl = 'https://example.com'
			const mockMeta = { title: 'Example', description: 'Test' }

			vi.mocked(mockFetch).mockResolvedValueOnce({
				json: () => Promise.resolve(mockMeta),
			} as Response)
			vi.mocked(getHashForString).mockReturnValueOnce('url-hash-123')

			const result = await handlerFunction({ url: testUrl })

			expect(result.type).toBe('bookmark')
			expect(result.props.src).toBe(testUrl)
			expect(result.props.title).toBe('Example')
		})

		it('should handle bookmark creation errors gracefully', async () => {
			const mockEditor = { registerExternalAssetHandler: vi.fn() } as any
			useSyncDemo({ roomId: 'test-room' })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			useSyncCall.onMount!(mockEditor)

			const handlerFunction = mockEditor.registerExternalAssetHandler.mock.calls[0][1]
			const testUrl = 'https://example.com'

			vi.mocked(mockFetch).mockRejectedValueOnce(new Error('Network error'))
			vi.mocked(getHashForString).mockReturnValueOnce('url-hash-123')

			const result = await handlerFunction({ url: testUrl })

			expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error))
			expect(result.props.title).toBe('')
			expect(result.props.description).toBe('')
		})
	})

	describe('file name sanitization', () => {
		it('should sanitize file names in upload URLs', async () => {
			useSyncDemo({ roomId: 'test-room', host: 'https://demo.server.com' })

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets
			const file = new File(['test'], 'file with spaces & symbols!.jpg')

			vi.mocked(mockFetch).mockResolvedValueOnce(new Response())
			vi.mocked(uniqueId).mockReturnValueOnce('unique-123')

			await assetStore.upload({} as TLAsset, file)

			expect(mockFetch).toHaveBeenCalledWith(
				'https://demo.server.com/uploads/unique-123-file-with-spaces---symbols--jpg',
				expect.any(Object)
			)
		})
	})
})
