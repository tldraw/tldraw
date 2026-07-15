import {
	TLNoteShape,
	TLTextShape,
	TLTheme,
	computed,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { vi } from 'vitest'
import { ArrowShapeUtil } from '../lib/shapes/arrow/ArrowShapeUtil'
import { DrawShapeUtil } from '../lib/shapes/draw/DrawShapeUtil'
import { FrameShapeUtil } from '../lib/shapes/frame/FrameShapeUtil'
import { GeoShapeUtil } from '../lib/shapes/geo/GeoShapeUtil'
import { HighlightShapeUtil } from '../lib/shapes/highlight/HighlightShapeUtil'
import { NoteShapeUtil } from '../lib/shapes/note/NoteShapeUtil'
import { getDisplayValues } from '../lib/shapes/shared/getDisplayValues'
import { TextShapeUtil } from '../lib/shapes/text/TextShapeUtil'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
	editor.user.updateUserPreferences({ colorScheme: 'light' })
})

afterEach(() => {
	editor?.dispose()
})

/** Update the default theme definition's light colors. */
function updateLightColors(editor: TestEditor, updater: (def: TLTheme) => TLTheme) {
	editor.updateTheme(updater(editor.getTheme('default')!))
}

const noteId = createShapeId('note')
const frameId = createShapeId('frame')
const geoId = createShapeId('geo')
const arrowId = createShapeId('arrow')

describe('note shape colors', () => {
	it('resolves note background color from theme', () => {
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.noteBackgroundColor).toBe('#FCE19C')
	})

	it('resolves note border color from theme', () => {
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.borderColor).toBe('rgb(144, 144, 144)')
	})

	it('uses customized theme colors', () => {
		updateLightColors(editor, (def) => ({
			...def,
			colors: {
				...def.colors,
				light: {
					...def.colors.light,
					red: {
						...def.colors.light.red!,
						noteFill: '#CUSTOM_RED',
					},
				},
			},
		}))

		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'red' } }])
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.noteBackgroundColor).toBe('#CUSTOM_RED')
	})

	it('can be customized via theme overrides', () => {
		updateLightColors(editor, (def) => ({
			...def,
			colors: {
				...def.colors,
				light: {
					...def.colors.light,
					noteBorder: '#MYBORDER',
					black: {
						...def.colors.light.black!,
						noteFill: '#CUSTOM1',
						noteText: '#CUSTOM2',
					},
				},
			},
		}))
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.borderColor).toBe('#MYBORDER')
	})
})

describe('frame shape colors', () => {
	it('resolves frame colors from theme', () => {
		editor.createShapes([{ id: frameId, type: 'frame', x: 0, y: 0 }])
		const shape = editor.getShape(frameId)!
		const util = editor.getShapeUtil('frame') as FrameShapeUtil
		const dv = getDisplayValues(util, shape)
		// Default frame uses black color
		expect(dv.fillColor).toBe('#ffffff')
		expect(dv.strokeColor).toBe('#717171')
	})

	it('can be customized via theme overrides', () => {
		updateLightColors(editor, (def) => ({
			...def,
			colors: {
				...def.colors,
				light: {
					...def.colors.light,
					black: {
						...def.colors.light.black!,
						frameStroke: '#CCC',
						frameFill: '#DDD',
					},
				},
			},
		}))
		editor.createShapes([{ id: frameId, type: 'frame', x: 0, y: 0 }])
		const shape = editor.getShape(frameId)!
		const util = editor.getShapeUtil('frame') as FrameShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.fillColor).toBe('#DDD')
		expect(dv.strokeColor).toBe('#CCC')
	})
})

describe('highlight shape colors', () => {
	it('resolves highlight colors from theme', () => {
		const hlId = createShapeId('hl')
		editor.createShapes([
			{
				id: hlId,
				type: 'highlight',
				x: 0,
				y: 0,
				props: { color: 'blue', segments: [], size: 'm', isComplete: true },
			},
		])
		const shape = editor.getShape(hlId)!
		const util = editor.getShapeUtil('highlight') as HighlightShapeUtil
		const dv = getDisplayValues(util, shape)
		// Should be one of the blue highlight colors (srgb or p3 depending on env)
		expect(dv.strokeColor).toBeTruthy()
	})

	it('can be customized via theme overrides', () => {
		updateLightColors(editor, (def) => ({
			...def,
			colors: {
				...def.colors,
				light: {
					...def.colors.light,
					black: {
						...def.colors.light.black!,
						highlightSrgb: '#CUSTOM_HL',
						highlightP3: 'color(display-p3 1 0 0)',
					},
				},
			},
		}))
		const hlId = createShapeId('hl')
		editor.createShapes([
			{
				id: hlId,
				type: 'highlight',
				x: 0,
				y: 0,
				props: { color: 'black', segments: [], size: 'm', isComplete: true },
			},
		])
		const shape = editor.getShape(hlId)!
		const util = editor.getShapeUtil('highlight') as HighlightShapeUtil
		const dv = getDisplayValues(util, shape)
		// In test env P3 is likely not supported, so srgb is used
		expect(dv.strokeColor).toBe('#CUSTOM_HL')
	})
})

describe('arrow strokeWidth from display values', () => {
	it('uses display values for strokeWidth', () => {
		editor.createShapes([
			{ id: geoId, type: 'geo', x: 0, y: 0, props: { w: 100, h: 100 } },
			{ id: arrowId, type: 'arrow', x: 200, y: 200 },
		])
		const shape = editor.getShape(arrowId)!
		const util = editor.getShapeUtil('arrow') as ArrowShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.strokeWidth).toBeGreaterThan(0)
	})

	it('configure() override of strokeWidth flows to display values', () => {
		const ConfiguredArrow = ArrowShapeUtil.configure({
			getCustomDisplayValues() {
				return { strokeWidth: 999 }
			},
		})
		editor = new TestEditor({ shapeUtils: [ConfiguredArrow] })
		editor.createShapes([{ id: arrowId, type: 'arrow', x: 200, y: 200 }])
		const shape = editor.getShape(arrowId)!
		const util = editor.getShapeUtil('arrow') as ArrowShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.strokeWidth).toBe(999)
	})
})

describe('draw strokeWidth from display values', () => {
	it('uses display values for strokeWidth', () => {
		const drawId = createShapeId('draw')
		editor.createShapes([
			{
				id: drawId,
				type: 'draw',
				x: 0,
				y: 0,
				props: { segments: [], size: 'm', color: 'black', fill: 'none' },
			},
		])
		const shape = editor.getShape(drawId)!
		const util = editor.getShapeUtil('draw') as DrawShapeUtil
		const dv = getDisplayValues(util, shape)
		expect(dv.strokeWidth).toBeGreaterThan(0)
	})
})

describe('WeakMap cache', () => {
	it('returns same result for same shape and theme', () => {
		editor.createShapes([{ id: geoId, type: 'geo', x: 0, y: 0 }])
		const shape = editor.getShape(geoId)!
		const util = editor.getShapeUtil('geo') as GeoShapeUtil
		const dv1 = getDisplayValues(util, shape)
		const dv2 = getDisplayValues(util, shape)
		// Should be the exact same object reference (cached)
		expect(dv1).toBe(dv2)
	})

	it('returns new result when shape changes', () => {
		editor.createShapes([{ id: geoId, type: 'geo', x: 0, y: 0, props: { color: 'black' } }])
		const util = editor.getShapeUtil('geo') as GeoShapeUtil

		const shape1 = editor.getShape(geoId)!
		const dv1 = getDisplayValues(util, shape1)

		editor.updateShapes([{ id: geoId, type: 'geo', props: { color: 'red' } }])
		const shape2 = editor.getShape(geoId)!
		const dv2 = getDisplayValues(util, shape2)

		// Different shape record means different result
		expect(dv1).not.toBe(dv2)
		expect(dv1.strokeColor).not.toBe(dv2.strokeColor)
	})

	it('invalidates when theme changes', () => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'blue' } }])
		const util = editor.getShapeUtil('note') as NoteShapeUtil

		// Same shape object but different theme
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const dv1 = getDisplayValues(util, shape)
		expect(dv1.noteBackgroundColor).toBe('#8AA3FF') // light blue

		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		const dv2 = getDisplayValues(util, shape)
		expect(dv2.noteBackgroundColor).toBe('#2A3F98') // dark blue

		// Should be different objects
		expect(dv1).not.toBe(dv2)
	})
})

describe('theme changes flow to shapes', () => {
	it('switching to dark mode changes note colors', () => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const shape = editor.getShape<TLNoteShape>(noteId)!

		const lightDv = getDisplayValues(util, shape)
		expect(lightDv.noteBackgroundColor).toBe('#FCE19C')

		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		const darkDv = getDisplayValues(util, shape)
		expect(darkDv.noteBackgroundColor).toBe('#2c2c2c')
	})

	it('updating theme definition at runtime changes display values', () => {
		editor.user.updateUserPreferences({ colorScheme: 'light' })
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const util = editor.getShapeUtil('note') as NoteShapeUtil

		// Get baseline
		const shape = editor.getShape<TLNoteShape>(noteId)!
		const dv1 = getDisplayValues(util, shape)
		const originalBg = dv1.noteBackgroundColor

		// Update the default theme's fontSize (which affects label size)
		editor.updateTheme({ ...editor.getTheme('default')!, fontSize: 24 })

		// Theme object changed, so cache should miss even with same shape
		const dv2 = getDisplayValues(util, shape)
		// fontSize changed so labelFontSize should be different
		expect(dv2.labelFontSize).toBeGreaterThan(dv1.labelFontSize)
		// But note background color should be the same
		expect(dv2.noteBackgroundColor).toBe(originalBg)
	})
})

describe('color mode reactivity', () => {
	it('does not create a reactive dependency on color mode by default', () => {
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const shape = editor.getShape<TLNoteShape>(noteId)!

		let computeCount = 0
		const labelFontSize = computed('labelFontSize', () => {
			computeCount++
			return getDisplayValues(util, shape).labelFontSize
		})

		const before = labelFontSize.get()
		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		expect(labelFontSize.get()).toBe(before)
		expect(computeCount).toBe(1)
	})

	it('creates a reactive dependency when colorMode is passed from a reactive read', () => {
		editor.createShapes([{ id: noteId, type: 'note', x: 0, y: 0, props: { color: 'black' } }])
		const util = editor.getShapeUtil('note') as NoteShapeUtil
		const shape = editor.getShape<TLNoteShape>(noteId)!

		let computeCount = 0
		const backgroundColor = computed('backgroundColor', () => {
			computeCount++
			return getDisplayValues(util, shape, editor.getColorMode()).noteBackgroundColor
		})

		const lightBg = backgroundColor.get()
		editor.user.updateUserPreferences({ colorScheme: 'dark' })
		expect(backgroundColor.get()).not.toBe(lightBg)
		expect(computeCount).toBe(2)
	})

	it('does not invalidate the text shape size cache when color mode toggles', () => {
		const textId = createShapeId('text')
		editor.createShapes([
			{
				id: textId,
				type: 'text',
				x: 0,
				y: 0,
				props: { richText: toRichText('hello world') },
			},
		])

		// Prime the geometry cache and capture initial bounds.
		const initialBounds = editor.getShapeGeometry(textId).bounds.clone()

		// Spy on the underlying measurement call to detect cache misses.
		const measureSpy = vi.spyOn(editor.textMeasure, 'measureHtml')
		measureSpy.mockClear()

		editor.user.updateUserPreferences({ colorScheme: 'dark' })

		// Re-reading geometry must not trigger a new text measurement — only colors changed.
		const afterToggleBounds = editor.getShapeGeometry(textId).bounds
		expect(measureSpy).not.toHaveBeenCalled()
		expect(afterToggleBounds.width).toBe(initialBounds.width)
		expect(afterToggleBounds.height).toBe(initialBounds.height)

		// And the shape util's min dimensions should be stable too.
		const util = editor.getShapeUtil('text') as TextShapeUtil
		const shape = editor.getShape<TLTextShape>(textId)!
		const minDims = util.getMinDimensions(shape)
		expect(minDims.width).toBe(initialBounds.width)
		expect(minDims.height).toBe(initialBounds.height)
		expect(measureSpy).not.toHaveBeenCalled()
		measureSpy.mockRestore()
	})

	it('still updates dimensions when the theme definition changes font size', () => {
		const textId = createShapeId('text')
		editor.createShapes([
			{
				id: textId,
				type: 'text',
				x: 0,
				y: 0,
				props: { richText: toRichText('hello world') },
			},
		])

		const initialBounds = editor.getShapeGeometry(textId).bounds.clone()

		// Doubling the theme font size must invalidate the size cache.
		editor.updateTheme({ ...editor.getTheme('default')!, fontSize: 32 })

		const afterBounds = editor.getShapeGeometry(textId).bounds
		expect(afterBounds.height).toBeGreaterThan(initialBounds.height)
	})
})
