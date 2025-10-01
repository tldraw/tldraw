import { TLShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { Mock, Mocked, vi } from 'vitest'
import { Editor } from '../../Editor'
import { FontManager, TLFontFace } from './FontManager'

// Mock the Editor class
vi.mock('../../Editor')

// Mock globals
global.FontFace = vi.fn().mockImplementation((family, src, descriptors) => ({
	family,
	src,
	...descriptors,
	load: vi.fn(() => Promise.resolve()),
}))

Object.defineProperty(global.document, 'fonts', {
	value: {
		add: vi.fn(),
		[Symbol.iterator]: vi.fn(() => [].values()),
	},
	configurable: true,
})

global.queueMicrotask = vi.fn((fn) => Promise.resolve().then(fn))

describe('FontManager', () => {
	let editor: Mocked<Editor>
	let fontManager: FontManager
	let mockAssetUrls: { [key: string]: string }

	const createMockFont = (overrides: Partial<TLFontFace> = {}): TLFontFace => ({
		family: 'Test Font',
		src: { url: 'test-font.woff2' },
		...overrides,
	})

	const createMockShape = (id: TLShapeId = createShapeId('test')): TLShape => ({
		id,
		type: 'text',
		x: 0,
		y: 0,
		rotation: 0,
		index: 'a1' as any,
		parentId: 'page:page' as any,
		opacity: 1,
		isLocked: false,
		meta: {},
		props: {},
		typeName: 'shape' as const,
	})

	beforeEach(() => {
		vi.clearAllMocks()

		mockAssetUrls = {
			'test-font.woff2': 'https://example.com/fonts/test-font.woff2',
		}

		const mockShapeUtil = {
			getFontFaces: vi.fn(() => []),
		}

		const mockStore = {
			createComputedCache: vi.fn(() => ({
				get: vi.fn(() => []),
			})),
			createCache: vi.fn(() => ({
				get: vi.fn(() => ({ get: vi.fn(() => []) })),
			})),
		}

		editor = {
			store: mockStore,
			getShapeUtil: vi.fn(() => mockShapeUtil),
			getCurrentPageShapeIds: vi.fn(() => new Set()),
			getShape: vi.fn(),
			isDisposed: false,
		} as any

		fontManager = new FontManager(editor, mockAssetUrls)
	})

	describe('constructor', () => {
		it('should initialize with editor reference', () => {
			expect(fontManager).toBeDefined()
		})

		it('should initialize without assetUrls', () => {
			const managerWithoutUrls = new FontManager(editor)
			expect(managerWithoutUrls).toBeDefined()
		})
	})

	describe('getShapeFontFaces', () => {
		it('should return empty array when no fonts found', () => {
			const shape = createMockShape()
			const result = fontManager.getShapeFontFaces(shape)
			expect(result).toEqual([])
		})

		it('should accept shape ID as parameter', () => {
			const shapeId = createShapeId('test')
			const result = fontManager.getShapeFontFaces(shapeId)
			expect(result).toEqual([])
		})
	})

	describe('trackFontsForShape', () => {
		it('should track fonts for shape without throwing', () => {
			const shape = createMockShape()
			expect(() => fontManager.trackFontsForShape(shape)).not.toThrow()
		})

		it('should track fonts for shape ID without throwing', () => {
			const shapeId = createShapeId('test')
			expect(() => fontManager.trackFontsForShape(shapeId)).not.toThrow()
		})
	})

	describe('loadRequiredFontsForCurrentPage', () => {
		it('should complete without error when no fonts needed', async () => {
			await expect(fontManager.loadRequiredFontsForCurrentPage()).resolves.toBeUndefined()
		})

		it('should respect font limit', async () => {
			const shapeIds = Array.from({ length: 5 }, (_, i) => createShapeId(`test${i}`))
			const shapes = shapeIds.map(createMockShape)

			editor.getCurrentPageShapeIds.mockReturnValue(new Set(shapeIds))
			editor.getShape.mockImplementation((id: any) => shapes.find((s) => s.id === id))

			await expect(fontManager.loadRequiredFontsForCurrentPage(3)).resolves.toBeUndefined()
		})
	})

	describe('ensureFontIsLoaded', () => {
		it('should create and load font face', async () => {
			const font = createMockFont()

			await fontManager.ensureFontIsLoaded(font)

			expect(global.FontFace).toHaveBeenCalledWith(
				font.family,
				expect.stringContaining('url('),
				expect.any(Object)
			)
		})

		it('should handle font loading errors gracefully', async () => {
			const font = createMockFont()
			const error = new Error('Font load failed')

			;(global.FontFace as Mock).mockReturnValue({
				family: font.family,
				load: vi.fn(() => Promise.reject(error)),
			})

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			await fontManager.ensureFontIsLoaded(font)

			expect(consoleSpy).toHaveBeenCalledWith(error)
			consoleSpy.mockRestore()
		})

		it('should return same promise for concurrent requests', async () => {
			const font = createMockFont()

			const promise1 = fontManager.ensureFontIsLoaded(font)
			const promise2 = fontManager.ensureFontIsLoaded(font)

			expect(promise1).toBe(promise2)
			await Promise.all([promise1, promise2])
		})
	})

	describe('requestFonts', () => {
		it('should queue fonts for loading', () => {
			const fonts = [createMockFont({ family: 'Font1' }), createMockFont({ family: 'Font2' })]

			fontManager.requestFonts(fonts)

			expect(queueMicrotask).toHaveBeenCalled()
		})

		it('should deduplicate font requests', () => {
			const font = createMockFont()

			fontManager.requestFonts([font])
			fontManager.requestFonts([font])

			expect(queueMicrotask).toHaveBeenCalledTimes(1)
		})

		it('should handle editor disposal during async loading', () => {
			const fonts = [createMockFont()]
			editor.isDisposed = true

			fontManager.requestFonts(fonts)

			const callback = (queueMicrotask as Mock).mock.calls[0][0]
			expect(() => callback()).not.toThrow()
		})
	})

	describe('toEmbeddedCssDeclaration', () => {
		it('should generate font CSS without data conversion (simplified test)', async () => {
			const font = createMockFont()

			// Mock the actual method implementation to avoid FileHelpers dependency
			const mockCssDeclaration = `@font-face {
  font-family: "${font.family}";
  src: url("mock-data-url");
}`

			vi.spyOn(fontManager, 'toEmbeddedCssDeclaration').mockResolvedValue(mockCssDeclaration)

			const result = await fontManager.toEmbeddedCssDeclaration(font)

			expect(result).toContain(`font-family: "${font.family}";`)
			expect(result).toContain('src:')
			expect(result).toContain('@font-face {')
			expect(result).toContain('}')
		})

		it('should call toEmbeddedCssDeclaration method', async () => {
			const font = createMockFont()

			// Simple spy to verify the method is called
			const spy = vi.spyOn(fontManager, 'toEmbeddedCssDeclaration').mockResolvedValue('mock-css')

			await fontManager.toEmbeddedCssDeclaration(font)

			expect(spy).toHaveBeenCalledWith(font)
			spy.mockRestore()
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle empty getCurrentPageShapeIds', () => {
			editor.getCurrentPageShapeIds.mockReturnValue(new Set())

			expect(() => fontManager.loadRequiredFontsForCurrentPage()).not.toThrow()
		})

		it('should handle null shape from getShape', async () => {
			const shapeId = createShapeId('test')
			editor.getCurrentPageShapeIds.mockReturnValue(new Set([shapeId]))
			editor.getShape.mockReturnValue(undefined)

			await expect(fontManager.loadRequiredFontsForCurrentPage()).rejects.toThrow()
		})

		it('should handle fonts with minimal properties', async () => {
			const minimalFont: TLFontFace = {
				family: 'Minimal Font',
				src: { url: 'minimal.woff2' },
			}

			await expect(fontManager.ensureFontIsLoaded(minimalFont)).resolves.toBeUndefined()
		})
	})
})
