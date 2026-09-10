import { vi } from 'vitest'
import { Editor } from '../../Editor'
import { TextManager, TLMeasureTextSpanOpts } from './TextManager'

// Create a simple mock DOM environment
function createMockStyle() {
	const properties = new Map<string, string>()

	return {
		setProperty: vi.fn((key: string, value: string) => {
			properties.set(key, value)
		}),
		getPropertyValue: vi.fn((key: string) => properties.get(key) ?? ''),
		removeProperty: vi.fn((key: string) => {
			const previous = properties.get(key) ?? ''
			properties.delete(key)
			return previous
		}),
	}
}

const mockElement = {
	classList: { add: vi.fn() },
	tabIndex: -1,
	cloneNode: vi.fn(),
	innerHTML: '',
	textContent: '',
	setAttribute: vi.fn(),
	style: createMockStyle(),
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
	element.style = createMockStyle()
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
const mockDocument = {
	createElement: mockCreateElement,
}
const mockEditor = {
	getContainer: vi.fn(() => ({
		appendChild: vi.fn(),
	})),
	getContainerDocument: vi.fn(() => mockDocument),
} as unknown as Editor

global.Range = vi.fn(function () {
	return {
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
	}
}) as any

describe('TextManager', () => {
	let textManager: TextManager

	beforeEach(() => {
		vi.clearAllMocks()
		textManager = new TextManager(mockEditor)
	})

	describe('constructor', () => {
		it('should create a TextManager instance', () => {
			expect(textManager).toBeInstanceOf(TextManager)
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

		it('should skip characters that produce no layout rectangles', () => {
			const RangeMock = global.Range as unknown as ReturnType<typeof vi.fn>
			RangeMock.mockImplementationOnce(function () {
				return {
					setStart: vi.fn(),
					setEnd: vi.fn(),
					// simulate a browser returning no rects for a measured character,
					// which previously crashed with "Cannot read properties of
					// undefined (reading 'top')". See issue #9112.
					getClientRects: vi.fn(() => []),
				}
			})

			const mockTextNode = {
				nodeType: 3, // TEXT_NODE
				textContent: 'Hello',
			}

			const mockElementWithText = {
				childNodes: [mockTextNode],
				getBoundingClientRect: () => ({ left: 0, top: 0 }),
			}

			let result
			expect(() => {
				result = textManager.measureElementTextNodeSpans(mockElementWithText as any)
			}).not.toThrow()

			expect(result!.spans).toHaveLength(0)
			expect(result!.didTruncate).toBe(false)
		})

		it('should measure grapheme clusters as a single unit', () => {
			const startOffsets: number[] = []
			const RangeMock = global.Range as unknown as ReturnType<typeof vi.fn>
			RangeMock.mockImplementationOnce(function () {
				return {
					setStart: vi.fn((_node: any, offset: number) => startOffsets.push(offset)),
					setEnd: vi.fn(),
					getClientRects: vi.fn(() => [
						{ width: 10, height: 16, left: 0, top: 0, right: 10, bottom: 16 },
					]),
				}
			})

			// 👨‍👩‍👧 is 5 code points (8 UTF-16 units) joined by zero-width joiners
			const family = '\u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467}'
			const mockTextNode = { nodeType: 3, textContent: `a${family}b` }
			const mockElementWithText = {
				childNodes: [mockTextNode],
				getBoundingClientRect: () => ({ left: 0, top: 0 }),
			}

			const result = textManager.measureElementTextNodeSpans(mockElementWithText as any)

			// the emoji is measured as one grapheme, so the index jumps over all 8 units
			expect(startOffsets).toEqual([0, 1, 9])
			// and its code points are kept together in the span text
			expect(result.spans[0].text).toBe(`a${family}b`)
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

		it('should not throw when the truncated remeasure yields no spans', () => {
			// The text truncates on the first pass, but once we narrow the width
			// to make room for the ellipsis, nothing measurable remains (e.g. the
			// measurement element can't be laid out). This must not crash.
			vi.spyOn(textManager, 'measureElementTextNodeSpans')
				.mockReturnValueOnce({
					spans: [{ text: 'Hello Wo', box: { x: 0, y: 0, w: 80, h: 16 } }],
					didTruncate: true,
				})
				.mockReturnValueOnce({
					spans: [{ text: '…', box: { x: 0, y: 0, w: 10, h: 16 } }],
					didTruncate: false,
				})
				.mockReturnValueOnce({
					spans: [],
					didTruncate: false,
				})

			const opts = { ...defaultOpts, overflow: 'truncate-ellipsis' as const }
			let result: ReturnType<typeof textManager.measureTextSpans> | undefined
			expect(() => (result = textManager.measureTextSpans('Hello World', opts))).not.toThrow()
			expect(result).toEqual([])
		})

		it('should not throw when the ellipsis itself cannot be measured', () => {
			// If measuring the ellipsis returns no spans, fall back to a zero width
			// rather than dereferencing a missing span.
			vi.spyOn(textManager, 'measureElementTextNodeSpans')
				.mockReturnValueOnce({
					spans: [{ text: 'Hello Wo', box: { x: 0, y: 0, w: 80, h: 16 } }],
					didTruncate: true,
				})
				.mockReturnValueOnce({ spans: [], didTruncate: false })
				.mockReturnValueOnce({
					spans: [{ text: 'Hello Wo', box: { x: 0, y: 0, w: 80, h: 16 } }],
					didTruncate: false,
				})

			const opts = { ...defaultOpts, overflow: 'truncate-ellipsis' as const }
			expect(() => textManager.measureTextSpans('Hello World', opts)).not.toThrow()
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
