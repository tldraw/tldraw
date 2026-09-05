import { vi } from 'vitest'
import {
	Box,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	createShapeId,
} from '../../..'
import { TestEditor } from '../../test/TestEditor'

// Bitmap rendering and content trimming need a real canvas, which jsdom does not have; the
// editor's contract with these helpers is tested through what it passes and how it handles
// their results.
vi.mock('../../exports/getSvgAsImage', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../../exports/getSvgAsImage')>()
	return {
		...actual,
		getSvgAsImageWithOptions: vi.fn(),
		trimSvgToContent: vi.fn(),
	}
})

const { getSvgAsImageWithOptions, trimSvgToContent } = vi.mocked(
	await import('../../exports/getSvgAsImage')
)

const BOX_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[BOX_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type IBoxShape = TLShape<typeof BOX_TYPE>

class BoxShapeUtil extends ShapeUtil<IBoxShape> {
	static override type = BOX_TYPE
	static override props: RecordProps<IBoxShape> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): IBoxShape['props'] {
		return { w: 100, h: 100, text: '', isFilled: true }
	}
	getGeometry(shape: IBoxShape): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	override toSvg(shape: IBoxShape) {
		return <rect data-shape-id={shape.id} width={shape.props.w} height={shape.props.h} />
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

// The export pipeline yields to the event loop with real timers
vi.useRealTimers()

let editor: TestEditor

const ids = {
	a: createShapeId('a'),
	b: createShapeId('b'),
}

function parseSvg(svg: string) {
	return new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement
}

beforeEach(() => {
	getSvgAsImageWithOptions.mockReset()
	trimSvgToContent.mockReset()
	editor = new TestEditor({ shapeUtils: [BoxShapeUtil] })
	document.body.appendChild(editor.getContainer())
	editor.createShapes([
		{ id: ids.a, type: BOX_TYPE, x: 0, y: 0, props: { w: 100, h: 100 } },
		{ id: ids.b, type: BOX_TYPE, x: 200, y: 100, props: { w: 100, h: 50 } },
	])
})

afterEach(() => {
	editor.getContainer().remove()
	editor.dispose()
})

describe('getSvgElement', () => {
	it('returns undefined when there is nothing to export', async () => {
		editor.deleteShapes([ids.a, ids.b])
		expect(await editor.getSvgElement([])).toBeUndefined()
		expect(await editor.getSvgElement([ids.a])).toBeUndefined()
	})

	it('renders the shape util svg for the given shapes', async () => {
		const result = await editor.getSvgElement([ids.a], { padding: 0 })
		expect(result).toMatchObject({ width: 100, height: 100, trimPadding: 0 })
		expect(result!.svg.getAttribute('viewBox')).toBe('0 0 100 100')
		const rects = [...result!.svg.querySelectorAll('rect[data-shape-id]')]
		expect(rects.map((r) => r.getAttribute('data-shape-id'))).toEqual([ids.a])
	})

	it('exports every shape on the page when given an empty list', async () => {
		const result = await editor.getSvgElement([], { padding: 0 })
		expect(result).toMatchObject({ width: 300, height: 150 })
		const rects = [...result!.svg.querySelectorAll('rect[data-shape-id]')]
		expect(rects.map((r) => r.getAttribute('data-shape-id'))).toEqual([ids.a, ids.b])
	})

	it('adds the default padding around the shapes and marks it as trimmable', async () => {
		const result = await editor.getSvgElement([editor.getShape(ids.a)!])
		expect(result).toMatchObject({
			width: 100 + 2 * editor.options.defaultSvgPadding,
			height: 100 + 2 * editor.options.defaultSvgPadding,
			trimPadding: editor.options.defaultSvgPadding,
		})
	})

	it('uses a fixed numeric padding without trimming', async () => {
		const result = await editor.getSvgElement([ids.a], { padding: 10 })
		expect(result).toMatchObject({ width: 120, height: 120, trimPadding: 0 })
		expect(result!.svg.getAttribute('viewBox')).toBe('-10 -10 120 120')
	})

	it('respects explicit bounds and scale', async () => {
		const result = await editor.getSvgElement([ids.a, ids.b], {
			bounds: new Box(0, 0, 400, 200),
			scale: 2,
			padding: 0,
		})
		expect(result).toMatchObject({ width: 800, height: 400 })
		expect(result!.svg.getAttribute('viewBox')).toBe('0 0 400 200')
	})
})

describe('getSvgString', () => {
	it('serializes the exported svg', async () => {
		const result = await editor.getSvgString([ids.a], { padding: 0 })
		expect(result).toMatchObject({ width: 100, height: 100, trimPadding: 0 })
		expect(result!.svg).toMatch(/^<svg/)
		const svg = parseSvg(result!.svg)
		expect(svg.getAttribute('viewBox')).toBe('0 0 100 100')
		expect(svg.querySelector(`rect[data-shape-id="${ids.a}"]`)).not.toBeNull()
	})

	it('returns undefined when there is nothing to export', async () => {
		expect(await editor.getSvgString([createShapeId('missing')])).toBeUndefined()
	})
})

describe('toImage', () => {
	it('throws when there is nothing to export', async () => {
		editor.deleteShapes([ids.a, ids.b])
		await expect(editor.toImage([], { format: 'png' })).rejects.toThrow('Could not create SVG')
	})

	it('returns an svg blob without touching the canvas when padding is fixed', async () => {
		const result = await editor.toImage([ids.a], { format: 'svg', padding: 0 })
		expect(result).toMatchObject({ width: 100, height: 100 })
		expect(result.blob.type).toBe('image/svg+xml')
		expect(await result.blob.text()).toMatch(/^<svg/)
		expect(trimSvgToContent).not.toHaveBeenCalled()
		expect(getSvgAsImageWithOptions).not.toHaveBeenCalled()
	})

	it('trims auto-padded svg exports to their content', async () => {
		trimSvgToContent.mockResolvedValue({
			svg: '<svg data-trimmed="true"></svg>',
			width: 7,
			height: 9,
		})
		const result = await editor.toImage([ids.a], { format: 'svg', scale: 2 })
		expect(trimSvgToContent).toHaveBeenCalledTimes(1)
		expect(trimSvgToContent.mock.calls[0][1]).toEqual({
			width: 328,
			height: 328,
			trimPadding: editor.options.defaultSvgPadding,
			scale: 2,
		})
		expect(result).toMatchObject({ width: 7, height: 9 })
		expect(await result.blob.text()).toBe('<svg data-trimmed="true"></svg>')
	})

	it('keeps the untrimmed svg when trimming is not possible', async () => {
		trimSvgToContent.mockResolvedValue(null)
		const result = await editor.toImage([ids.a], { format: 'svg' })
		expect(result).toMatchObject({ width: 164, height: 164 })
		expect(await result.blob.text()).toMatch(/^<svg/)
	})

	it('rasterizes png exports with a default pixel ratio of 2', async () => {
		const blob = new Blob(['png'], { type: 'image/png' })
		getSvgAsImageWithOptions.mockResolvedValue({ blob, width: 200, height: 200 })
		const result = await editor.toImage([ids.a], { padding: 0 })
		expect(getSvgAsImageWithOptions).toHaveBeenCalledTimes(1)
		expect(getSvgAsImageWithOptions.mock.calls[0][0]).toMatch(/^<svg/)
		expect(getSvgAsImageWithOptions.mock.calls[0][1]).toEqual({
			type: 'png',
			quality: undefined,
			pixelRatio: 2,
			width: 100,
			height: 100,
			trimPadding: 0,
			scale: 1,
		})
		expect(result).toEqual({ blob, width: 200, height: 200 })
	})

	it('passes the format, quality, and pixel ratio through for bitmap exports', async () => {
		getSvgAsImageWithOptions.mockResolvedValue({ blob: new Blob(), width: 1, height: 1 })
		await editor.toImage([ids.a], { format: 'jpeg', quality: 0.5, pixelRatio: 3, scale: 2 })
		expect(getSvgAsImageWithOptions.mock.calls[0][1]).toEqual({
			type: 'jpeg',
			quality: 0.5,
			pixelRatio: 3,
			width: 328,
			height: 328,
			trimPadding: editor.options.defaultSvgPadding,
			scale: 2,
		})
	})

	it('throws when the bitmap could not be constructed', async () => {
		getSvgAsImageWithOptions.mockResolvedValue(null)
		await expect(editor.toImage([ids.a], { format: 'webp' })).rejects.toThrow(
			'Could not construct image.'
		)
	})
})

describe('toImageDataUrl', () => {
	it('returns the image as a data url with its size', async () => {
		const result = await editor.toImageDataUrl([ids.a], { format: 'svg', padding: 0 })
		expect(result).toMatchObject({ width: 100, height: 100 })
		expect(result.url).toMatch(/^data:image\/svg\+xml;base64,/)
		const svg = atob(result.url.slice('data:image/svg+xml;base64,'.length))
		expect(svg).toMatch(/^<svg/)
	})

	it('encodes bitmap blobs', async () => {
		getSvgAsImageWithOptions.mockResolvedValue({
			blob: new Blob(['png-bytes'], { type: 'image/png' }),
			width: 200,
			height: 200,
		})
		const result = await editor.toImageDataUrl([ids.a])
		expect(result).toEqual({
			url: `data:image/png;base64,${btoa('png-bytes')}`,
			width: 200,
			height: 200,
		})
	})
})
