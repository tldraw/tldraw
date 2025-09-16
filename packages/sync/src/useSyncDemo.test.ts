import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules before imports
vi.mock('./useSync')
vi.mock('react', async () => {
	const actual = await vi.importActual('react')
	return {
		...actual,
		useMemo: vi.fn((fn, deps) => fn()),
		useCallback: vi.fn((fn, deps) => fn),
	}
})
vi.mock('tldraw', async () => {
	const actual = await vi.importActual('tldraw')
	return {
		...actual,
		useShallowObjectIdentity: vi.fn((obj) => obj),
		uniqueId: vi.fn(() => 'mock-unique-id'),
		getHashForString: vi.fn((str) => `hash-${str}`),
		MediaHelpers: {
			isAnimatedImageType: vi.fn(() => false),
			isVectorImageType: vi.fn(() => false),
		},
	}
})

import { atom } from '@tldraw/state'
import {
	AssetRecordType,
	Editor,
	MediaHelpers,
	TLAsset,
	TLPresenceStateInfo,
	TLPresenceUserInfo,
	TLStore,
	defaultBindingUtils,
	defaultShapeUtils,
	getHashForString,
	uniqueId,
	useShallowObjectIdentity,
} from 'tldraw'
import { useSync, type RemoteTLStoreWithStatus } from './useSync'
import { useSyncDemo, type UseSyncDemoOptions } from './useSyncDemo'

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
		// Set up mock implementations
		vi.mocked(useSync).mockReturnValue({ status: 'loading' } as RemoteTLStoreWithStatus)
		vi.mocked(useShallowObjectIdentity).mockImplementation((obj) => obj)
		vi.mocked(uniqueId).mockReturnValue('mock-unique-id')
		vi.mocked(getHashForString).mockImplementation((str) => `hash-${str}`)
		vi.mocked(MediaHelpers.isAnimatedImageType).mockReturnValue(false)
		vi.mocked(MediaHelpers.isVectorImageType).mockReturnValue(false)
	})

	describe('useSyncDemo hook', () => {
		it('should call useSync with correct parameters for basic usage', () => {
			const options: UseSyncDemoOptions & { shapeUtils?: any } = {
				roomId: 'test-room',
				shapeUtils: [],
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith({
				uri: expect.stringContaining('/connect/test-room'),
				roomId: 'test-room',
				assets: expect.any(Object),
				onMount: expect.any(Function),
				shapeUtils: [...defaultShapeUtils],
				bindingUtils: [...defaultBindingUtils],
			})
		})

		it('should use custom host when provided', () => {
			const customHost = 'https://custom.server.com'
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: customHost,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: `${customHost}/connect/test-room`,
					assets: expect.any(Object),
				})
			)
		})

		it('should properly encode room ID in URI', () => {
			const roomIdWithSpecialChars = 'room with spaces & symbols!'
			const options: UseSyncDemoOptions = {
				roomId: roomIdWithSpecialChars,
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(useSyncCall.uri).toContain(encodeURIComponent(roomIdWithSpecialChars))
		})

		it('should handle userInfo option', () => {
			const userInfo: TLPresenceUserInfo = {
				id: 'user-1',
				name: 'Test User',
				color: '#ff0000',
			}
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				userInfo,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					userInfo,
				})
			)
		})

		it('should handle signal userInfo', () => {
			const userSignal = atom('user', {
				id: 'user-1',
				name: 'Test User',
				color: '#ff0000',
			})
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				userInfo: userSignal,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					userInfo: userSignal,
				})
			)
		})

		it('should handle getUserPresence function', () => {
			const getUserPresence = vi.fn(
				(): TLPresenceStateInfo => ({
					currentPageId: 'page:1' as any,
					userId: 'user-1',
					userName: 'Test User',
					cursor: { x: 0, y: 0, type: 'default', rotation: 0 },
				})
			)
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				getUserPresence,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					getUserPresence,
				})
			)
		})

		it('should merge custom shape utils with defaults', () => {
			const customShapeUtils = [{ type: 'custom-shape' } as any]
			const options: UseSyncDemoOptions & { shapeUtils?: any } = {
				roomId: 'test-room',
				shapeUtils: customShapeUtils,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					shapeUtils: [...defaultShapeUtils, ...customShapeUtils],
				})
			)
		})

		it('should merge custom binding utils with defaults', () => {
			const customBindingUtils = [{ type: 'custom-binding' } as any]
			const options: UseSyncDemoOptions & { bindingUtils?: any } = {
				roomId: 'test-room',
				bindingUtils: customBindingUtils,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					bindingUtils: [...defaultBindingUtils, ...customBindingUtils],
				})
			)
		})

		it('should preserve schema when provided', () => {
			const customSchema = { version: 2 } as any
			const options: UseSyncDemoOptions & { schema: any } = {
				roomId: 'test-room',
				schema: customSchema,
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					schema: customSchema,
				})
			)
		})

		it('should handle onMount callback with external asset handler', () => {
			const mockEditor = {
				registerExternalAssetHandler: vi.fn(),
			} as unknown as Editor

			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const onMount = useSyncCall.onMount!

			// Call the onMount function
			onMount(mockEditor)

			expect(mockEditor.registerExternalAssetHandler).toHaveBeenCalledWith(
				'url',
				expect.any(Function)
			)
		})
	})

	describe('asset store functionality', () => {
		it('should create asset store with upload capability', () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			expect(assetStore).toHaveProperty('upload')
			expect(assetStore).toHaveProperty('resolve')
			expect(typeof assetStore.upload).toBe('function')
			expect(typeof assetStore.resolve).toBe('function')
		})

		it('should handle file upload successfully for allowed domains', async () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: 'https://demo.server.com', // Not a restricted domain
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			const file = new File(['test content'], 'test-file.jpg')
			vi.mocked(mockFetch).mockResolvedValueOnce(new Response())
			vi.mocked(uniqueId).mockReturnValueOnce('unique-123')

			const result = await assetStore.upload({} as TLAsset, file)

			expect(mockFetch).toHaveBeenCalledWith(
				'https://demo.server.com/uploads/unique-123-test-file-jpg',
				{
					method: 'POST',
					body: file,
				}
			)

			expect(result).toEqual({
				src: 'https://demo.server.com/uploads/unique-123-test-file-jpg',
			})
		})

		it('should block uploads for tldraw domains', async () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: 'https://demo.tldraw.xyz', // This should be blocked for uploads
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			const file = new File(['test content'], 'test-file.jpg')

			await expect(assetStore.upload({} as TLAsset, file)).rejects.toThrow(
				'Uploading images is disabled in this demo.'
			)

			expect(alertSpy).toHaveBeenCalledWith('Uploading images is disabled in this demo.')
			expect(mockFetch).not.toHaveBeenCalled()
		})

		it('should resolve image assets with optimization', () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: 'https://demo.tldraw.xyz',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			const asset = {
				type: 'image',
				props: {
					src: 'https://demo.tldraw.xyz/image.jpg',
					w: 800,
					h: 600,
					fileSize: 1024 * 1024 * 2, // 2MB - worth resizing
				},
			} as TLAsset

			const context = {
				steppedScreenScale: 1,
				screenScale: 1,
				dpr: 2,
				networkEffectiveType: '4g' as const,
				shouldResolveToOriginal: false,
			}

			const result = assetStore.resolve?.(asset, context)

			expect(result).toContain('images.tldraw.xyz')
			expect(result).toContain('demo.tldraw.xyz/image.jpg')
		})

		it('should return null for assets without src', () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			const asset = {
				type: 'image',
				props: {},
			} as TLAsset

			const context = {
				steppedScreenScale: 1,
				screenScale: 1,
				dpr: 2,
				networkEffectiveType: '4g' as const,
				shouldResolveToOriginal: false,
			}

			const result = assetStore.resolve?.(asset, context)

			expect(result).toBeNull()
		})

		it('should handle video assets by returning original src', () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const assetStore = useSyncCall.assets

			const asset = {
				type: 'video',
				props: { src: 'https://example.com/video.mp4' },
			} as TLAsset

			const context = {
				steppedScreenScale: 1,
				screenScale: 1,
				dpr: 2,
				networkEffectiveType: '4g' as const,
				shouldResolveToOriginal: false,
			}

			const result = assetStore.resolve?.(asset, context)

			expect(result).toBe('https://example.com/video.mp4')
		})
	})

	describe('bookmark asset creation', () => {
		it('should create bookmark assets from URLs via onMount handler', async () => {
			const mockEditor = {
				registerExternalAssetHandler: vi.fn(),
			} as unknown as Editor

			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: 'https://demo.server.com',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const onMount = useSyncCall.onMount!

			// Call the onMount function
			onMount(mockEditor)

			// Get the asset handler that was registered
			const registerCall = vi.mocked(mockEditor.registerExternalAssetHandler).mock.calls[0]
			const [handlerType, handlerFunction] = registerCall as [string, any]

			expect(handlerType).toBe('url')
			expect(typeof handlerFunction).toBe('function')

			// Test the asset handler function
			const testUrl = 'https://example.com'
			const mockMeta = {
				title: 'Example Domain',
				description: 'Test description',
				image: 'https://example.com/image.jpg',
				favicon: 'https://example.com/favicon.ico',
			}

			vi.mocked(mockFetch).mockResolvedValueOnce({
				json: () => Promise.resolve(mockMeta),
			} as Response)

			vi.mocked(getHashForString).mockReturnValueOnce('url-hash-123')

			const result = await handlerFunction({ url: testUrl })

			expect(mockFetch).toHaveBeenCalledWith(expect.any(URL), { method: 'POST' })

			expect(result).toEqual({
				id: AssetRecordType.createId('url-hash-123'),
				typeName: 'asset',
				type: 'bookmark',
				props: {
					src: testUrl,
					description: mockMeta.description,
					image: mockMeta.image,
					favicon: mockMeta.favicon,
					title: mockMeta.title,
				},
				meta: {},
			})
		})

		it('should handle bookmark creation errors gracefully', async () => {
			const mockEditor = {
				registerExternalAssetHandler: vi.fn(),
			} as unknown as Editor

			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const onMount = useSyncCall.onMount!

			onMount(mockEditor)

			const registerCall = vi.mocked(mockEditor.registerExternalAssetHandler).mock.calls[0]
			const handlerFunction = (registerCall as [string, any])[1]

			const testUrl = 'https://example.com'

			vi.mocked(mockFetch).mockRejectedValueOnce(new Error('Network error'))
			vi.mocked(getHashForString).mockReturnValueOnce('url-hash-123')

			const result = await handlerFunction({ url: testUrl })

			expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error))

			expect(result).toEqual({
				id: AssetRecordType.createId('url-hash-123'),
				typeName: 'asset',
				type: 'bookmark',
				props: {
					src: testUrl,
					title: '',
					description: '',
					image: '',
					favicon: '',
				},
				meta: {},
			})
		})
	})

	describe('type safety and interface compliance', () => {
		it('should export UseSyncDemoOptions interface correctly', () => {
			const basicOptions: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			const fullOptions: UseSyncDemoOptions = {
				roomId: 'test-room',
				userInfo: { id: 'user-1', name: 'Test', color: '#ff0000' },
				host: 'https://custom.server.com',
				getUserPresence: () => null,
			}

			expect(basicOptions.roomId).toBe('test-room')
			expect(fullOptions.roomId).toBe('test-room')
			expect(fullOptions.userInfo).toBeDefined()
			expect(fullOptions.host).toBe('https://custom.server.com')
			expect(typeof fullOptions.getUserPresence).toBe('function')
		})

		it('should return RemoteTLStoreWithStatus type', () => {
			vi.mocked(useSync).mockReturnValueOnce({ status: 'loading' })

			const store = useSyncDemo({ roomId: 'test-room' })

			expect(store).toEqual({ status: 'loading' })
		})

		it('should handle all possible RemoteTLStoreWithStatus states', () => {
			// Test loading state
			vi.mocked(useSync).mockReturnValueOnce({ status: 'loading' })
			const loadingStore = useSyncDemo({ roomId: 'test-room' })
			expect(loadingStore.status).toBe('loading')

			// Test error state
			vi.mocked(useSync).mockReturnValueOnce({
				status: 'error',
				error: new Error('Connection failed'),
			})
			const errorStore = useSyncDemo({ roomId: 'test-room' })
			expect(errorStore.status).toBe('error')
			if (errorStore.status === 'error') {
				expect(errorStore.error.message).toBe('Connection failed')
			}

			// Test synced-remote state
			vi.mocked(useSync).mockReturnValueOnce({
				status: 'synced-remote',
				connectionStatus: 'online',
				store: {} as TLStore,
			})
			const syncedStore = useSyncDemo({ roomId: 'test-room' })
			expect(syncedStore.status).toBe('synced-remote')
			if (syncedStore.status === 'synced-remote') {
				expect(syncedStore.connectionStatus).toBe('online')
				expect(syncedStore.store).toBeDefined()
			}
		})
	})

	describe('edge cases and error conditions', () => {
		it('should handle empty room ID', () => {
			const options: UseSyncDemoOptions = {
				roomId: '',
			}

			useSyncDemo(options)

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					uri: expect.stringContaining('/connect/'),
					roomId: '',
				})
			)
		})

		it('should handle very long room ID', () => {
			const longRoomId = 'a'.repeat(1000)

			const options: UseSyncDemoOptions = {
				roomId: longRoomId,
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(useSyncCall.uri).toContain(encodeURIComponent(longRoomId))
			expect(useSyncCall.roomId).toBe(longRoomId)
		})

		it('should handle URL-unsafe characters in room ID', () => {
			const unsafeRoomId = 'room/with?unsafe&characters=true'

			const options: UseSyncDemoOptions = {
				roomId: unsafeRoomId,
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(useSyncCall.uri).toContain(encodeURIComponent(unsafeRoomId))
		})

		it('should handle undefined options gracefully', () => {
			const options: UseSyncDemoOptions & { undefinedField?: any } = {
				roomId: 'test-room',
				userInfo: undefined,
				host: undefined,
				getUserPresence: undefined,
				undefinedField: undefined,
			}

			expect(() => useSyncDemo(options)).not.toThrow()

			expect(useSync).toHaveBeenCalledWith(
				expect.objectContaining({
					roomId: 'test-room',
				})
			)
		})
	})

	describe('environment variable and constants', () => {
		it('should handle default server URLs correctly', () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			expect(typeof useSyncCall.uri).toBe('string')
			expect(useSyncCall.uri).toContain('/connect/test-room')
		})

		it('should sanitize file names in upload', async () => {
			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
				host: 'https://demo.server.com',
			}

			useSyncDemo(options)

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

		it('should use consistent asset ID based on URL hash', async () => {
			const mockEditor = {
				registerExternalAssetHandler: vi.fn(),
			} as unknown as Editor

			const options: UseSyncDemoOptions = {
				roomId: 'test-room',
			}

			useSyncDemo(options)

			const useSyncCall = vi.mocked(useSync).mock.calls[0][0]
			const onMount = useSyncCall.onMount!
			onMount(mockEditor)

			const registerCall = vi.mocked(mockEditor.registerExternalAssetHandler).mock.calls[0]
			const handlerFunction = (registerCall as [string, any])[1]

			const url = 'https://example.com'

			vi.mocked(mockFetch).mockResolvedValueOnce({
				json: () => Promise.resolve({ title: 'Test' }),
			} as Response)

			vi.mocked(getHashForString).mockReturnValueOnce('consistent-hash')

			const result = await handlerFunction({ url })

			expect(getHashForString).toHaveBeenCalledWith(url)
			expect(result.id).toBe(AssetRecordType.createId('consistent-hash'))
		})
	})
})
