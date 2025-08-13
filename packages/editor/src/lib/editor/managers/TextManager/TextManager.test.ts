import { vi } from 'vitest'
import { Editor } from '../../Editor'
import { TextManager, TLMeasureTextSpanOpts } from './TextManager'

// Create a simple mock DOM environment
const mockElement = {
	classList: { add: vi.fn() },
	tabIndex: -1,
	cloneNode: vi.fn(),
	innerHTML: '',
	textContent: '',
	setAttribute: vi.fn(),
	style: {
		setProperty: vi.fn(),
		getPropertyValue: vi.fn(() => ''),
	},
	scrollWidth: 100,
	getBoundingClientRect: vi.fn(() => ({
		width: 100,
		height: 20,
		left: 0,
		top: 0,
		right: 100,
		bottom: 20,
	})),
	remove: vi.fn(),
	insertAdjacentElement: vi.fn(),
	childNodes: [],
}

// Mock document.createElement to return our mock element
const mockCreateElement = vi.fn(() => {
	const element = { ...mockElement }
	element.cloneNode = vi.fn(() => ({ ...element }))

	// Make textContent and innerHTML reactive like real DOM elements
	let _textContent = ''
	let _innerHTML = ''

	Object.defineProperty(element, 'textContent', {
		get: () => _textContent,
		set: (value) => {
			_textContent = value || ''
			// When textContent is set, innerHTML should be the escaped version
			_innerHTML = _textContent
		},
	})

	Object.defineProperty(element, 'innerHTML', {
		get: () => _innerHTML,
		set: (value) => {
			_innerHTML = value || ''
			_textContent = _innerHTML // Simple approximation
		},
	})

	return element
})

// Mock editor
const mockEditor = {
	getContainer: vi.fn(() => ({
		appendChild: vi.fn(),
	})),
} as unknown as Editor

// Setup global mocks
global.document = {
	createElement: mockCreateElement,
} as any

global.Range = vi.fn(() => ({
	setStart: vi.fn(),
	setEnd: vi.fn(),
	getClientRects: vi.fn(() => [
		{
			width: 10,
			height: 16,
			left: 0,
			top: 0,
			right: 10,
			bottom: 16,
		},
	]),
})) as any

describe('TextManager', () => {
	let textManager: TextManager

	beforeEach(() => {
		vi.clearAllMocks()
		textManager = new TextManager(mockEditor)
	})

	describe('constructor', () => {
		it('should create a TextManager instance', () => {
			expect(textManager).toBeInstanceOf(TextManager)
			expect(textManager.editor).toBe(mockEditor)
		})
	})

	describe('measureText', () => {
		const defaultOpts = {
			fontStyle: 'normal',
			fontWeight: '400',
			fontFamily: 'Arial',
			fontSize: 16,
			lineHeight: 1.2,
			maxWidth: 200,
			minWidth: null,
			padding: '0px',
		}

		it('should call measureHtml with normalized text', () => {
			const spy = vi.spyOn(textManager, 'measureHtml')
			textManager.measureText('Hello World', defaultOpts)
			expect(spy).toHaveBeenCalledWith('Hello World', defaultOpts)
		})

		it('should normalize line breaks', () => {
			const spy = vi.spyOn(textManager, 'measureHtml')
			textManager.measureText('Hello\nWorld\r\nTest', defaultOpts)
			// The text should be normalized to use consistent line breaks
			expect(spy).toHaveBeenCalled()
		})

		it('should handle empty text', () => {
			const result = textManager.measureText('', { ...defaultOpts, measureScrollWidth: true })
			expect(result).toHaveProperty('x', 0)
			expect(result).toHaveProperty('y', 0)
			expect(result).toHaveProperty('w')
			expect(result).toHaveProperty('h')
			expect(result).toHaveProperty('scrollWidth')
		})
	})

	describe('measureHtml', () => {
		const defaultOpts = {
			fontStyle: 'normal',
			fontWeight: '400',
			fontFamily: 'Arial',
			fontSize: 16,
			lineHeight: 1.2,
			maxWidth: 200,
			minWidth: null,
			padding: '0px',
		}

		it('should return measurement object with correct structure', () => {
			const result = textManager.measureHtml('<span>Test</span>', defaultOpts)

			expect(result).toMatchObject({
				x: 0,
				y: 0,
				w: expect.any(Number),
				h: expect.any(Number),
			})
		})

		it('should handle null maxWidth', () => {
			const opts = { ...defaultOpts, maxWidth: null }
			const result = textManager.measureHtml('Test', opts)

			expect(result).toMatchObject({
				x: 0,
				y: 0,
				w: expect.any(Number),
				h: expect.any(Number),
			})
		})

		it('should handle overflow wrap breaking', () => {
			const opts = { ...defaultOpts, disableOverflowWrapBreaking: true }
			const result = textManager.measureHtml('Test', opts)

			expect(result).toMatchObject({
				x: 0,
				y: 0,
				w: expect.any(Number),
				h: expect.any(Number),
			})
		})

		it('should handle other styles', () => {
			const opts = {
				...defaultOpts,
				otherStyles: {
					'text-decoration': 'underline',
					color: 'red',
				},
			}

			const result = textManager.measureHtml('Test', opts)
			expect(result).toMatchObject({
				x: 0,
				y: 0,
				w: expect.any(Number),
				h: expect.any(Number),
			})
		})
	})

	describe('measureElementTextNodeSpans', () => {
		it('should handle elements with text nodes', () => {
			const mockTextNode = {
				nodeType: 3, // TEXT_NODE
				textContent: 'Hello',
			}

			const mockElementWithText = {
				childNodes: [mockTextNode],
				getBoundingClientRect: () => ({ left: 0, top: 0 }),
			}

			const result = textManager.measureElementTextNodeSpans(mockElementWithText as any)

			expect(result).toHaveProperty('spans')
			expect(result).toHaveProperty('didTruncate')
			expect(Array.isArray(result.spans)).toBe(true)
			expect(typeof result.didTruncate).toBe('boolean')
		})

		it('should handle empty elements', () => {
			const mockEmptyElement = {
				childNodes: [],
				getBoundingClientRect: () => ({ left: 0, top: 0 }),
			}

			const result = textManager.measureElementTextNodeSpans(mockEmptyElement as any)

			expect(result.didTruncate).toBe(false)
			expect(result.spans).toHaveLength(0)
		})

		it('should handle truncation option', () => {
			const mockTextNode = {
				nodeType: 3, // TEXT_NODE
				textContent: 'Hello World',
			}

			const mockElementWithText = {
				childNodes: [mockTextNode],
				getBoundingClientRect: () => ({ left: 0, top: 0 }),
			}

			const result = textManager.measureElementTextNodeSpans(mockElementWithText as any, {
				shouldTruncateToFirstLine: true,
			})

			expect(result).toHaveProperty('spans')
			expect(result).toHaveProperty('didTruncate')
		})
	})

	describe('measureTextSpans', () => {
		const defaultOpts: TLMeasureTextSpanOpts = {
			overflow: 'wrap',
			width: 200,
			height: 100,
			padding: 10,
			fontSize: 16,
			fontWeight: '400',
			fontFamily: 'Arial',
			fontStyle: 'normal',
			lineHeight: 1.2,
			textAlign: 'start',
		}

		it('should return empty array for empty text', () => {
			const result = textManager.measureTextSpans('', defaultOpts)
			expect(result).toEqual([])
		})

		it('should return array of text spans for non-empty text', () => {
			// Mock measureElementTextNodeSpans to return some spans
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Hello World',
						box: { x: 0, y: 0, w: 100, h: 16 },
					},
				],
				didTruncate: false,
			})

			const result = textManager.measureTextSpans('Hello World', defaultOpts)

			expect(Array.isArray(result)).toBe(true)
			expect(result.length).toBeGreaterThan(0)
			expect(result[0]).toHaveProperty('text')
			expect(result[0]).toHaveProperty('box')
		})

		it('should handle wrap overflow', () => {
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Hello World',
						box: { x: 0, y: 0, w: 100, h: 16 },
					},
				],
				didTruncate: false,
			})

			const opts = { ...defaultOpts, overflow: 'wrap' as const }
			const result = textManager.measureTextSpans('Hello World', opts)

			expect(Array.isArray(result)).toBe(true)
		})

		it('should handle truncate-ellipsis overflow', () => {
			// Mock the calls for ellipsis handling
			vi.spyOn(textManager, 'measureElementTextNodeSpans')
				.mockReturnValueOnce({
					spans: [
						{
							text: 'Hello Wo',
							box: { x: 0, y: 0, w: 80, h: 16 },
						},
					],
					didTruncate: true,
				})
				.mockReturnValueOnce({
					spans: [
						{
							text: '…',
							box: { x: 0, y: 0, w: 10, h: 16 },
						},
					],
					didTruncate: false,
				})
				.mockReturnValueOnce({
					spans: [
						{
							text: 'Hello W',
							box: { x: 0, y: 0, w: 70, h: 16 },
						},
					],
					didTruncate: false,
				})

			const opts = { ...defaultOpts, overflow: 'truncate-ellipsis' as const }
			const result = textManager.measureTextSpans('Hello World', opts)

			expect(Array.isArray(result)).toBe(true)
		})

		it('should handle truncate-clip overflow', () => {
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Hello Wo',
						box: { x: 0, y: 0, w: 80, h: 16 },
					},
				],
				didTruncate: true,
			})

			const opts = { ...defaultOpts, overflow: 'truncate-clip' as const }
			const result = textManager.measureTextSpans('Hello World', opts)

			expect(Array.isArray(result)).toBe(true)
		})

		it('should handle different text alignments', () => {
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Test',
						box: { x: 0, y: 0, w: 40, h: 16 },
					},
				],
				didTruncate: false,
			})

			const alignments: Array<TLMeasureTextSpanOpts['textAlign']> = ['start', 'middle', 'end']

			alignments.forEach((textAlign) => {
				const opts = { ...defaultOpts, textAlign }
				const result = textManager.measureTextSpans('Test', opts)
				expect(Array.isArray(result)).toBe(true)
			})
		})

		it('should handle custom font properties', () => {
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Test',
						box: { x: 0, y: 0, w: 40, h: 16 },
					},
				],
				didTruncate: false,
			})

			const opts = {
				...defaultOpts,
				fontSize: 18,
				fontFamily: 'Times',
				fontWeight: 'bold',
				fontStyle: 'italic',
				lineHeight: 1.5,
			}

			const result = textManager.measureTextSpans('Test', opts)
			expect(Array.isArray(result)).toBe(true)
		})

		it('should handle other styles', () => {
			vi.spyOn(textManager, 'measureElementTextNodeSpans').mockReturnValue({
				spans: [
					{
						text: 'Test',
						box: { x: 0, y: 0, w: 40, h: 16 },
					},
				],
				didTruncate: false,
			})

			const opts = {
				...defaultOpts,
				otherStyles: {
					'text-shadow': '1px 1px 1px black',
					'letter-spacing': '1px',
				},
			}

			const result = textManager.measureTextSpans('Test', opts)
			expect(Array.isArray(result)).toBe(true)
		})
	})
})
