import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	ArrowShapeKindStyle,
	DefaultFillStyle,
	DefaultVerticalAlignStyle,
	GeoShapeGeoStyle,
	LineShapeSplineStyle,
} from '@tldraw/editor'
import { describe, expect, it } from 'vitest'
import { STYLES } from '../styles'
import { styleMessages } from './styleMessages'

// The style pickers compose their key from two interpolations, so nothing links these messages to
// the values they label and the extractor can't check it. These tests are that link: add a style
// value without a label and they fail, rather than the picker quietly rendering a raw key.

/**
 * Styles whose picker shows a label for the *current* value, not just for the items it lists
 * (`StylePanelDropdownPicker` and the double one). Any value of these can end up on screen, so
 * every value needs a label — including values `STYLES` never offers.
 */
const CURRENT_VALUE_LABELLED = {
	fill: DefaultFillStyle,
	verticalAlign: DefaultVerticalAlignStyle,
	geo: GeoShapeGeoStyle,
	'arrow-kind': ArrowShapeKindStyle,
	spline: LineShapeSplineStyle,
	arrowheadStart: ArrowShapeArrowheadStartStyle,
	arrowheadEnd: ArrowShapeArrowheadEndStyle,
} as const

/** Which `uiType` each `STYLES` list is rendered under; several lists share one. */
const UI_TYPE_BY_STYLES_KEY: Record<keyof typeof STYLES, string> = {
	fill: 'fill',
	fillExtra: 'fill',
	dash: 'dash',
	size: 'size',
	font: 'font',
	textAlign: 'align',
	horizontalAlign: 'align',
	verticalAlign: 'verticalAlign',
	arrowKind: 'arrow-kind',
	arrowheadStart: 'arrowheadStart',
	arrowheadEnd: 'arrowheadEnd',
	spline: 'spline',
}

describe('styleMessages', () => {
	it('labels every value a dropdown picker can display', () => {
		const missing: string[] = []
		for (const [uiType, style] of Object.entries(CURRENT_VALUE_LABELLED)) {
			for (const value of style.values) {
				const id = `${uiType}-style.${value}`
				if (!(id in styleMessages)) missing.push(id)
			}
		}
		expect(missing).toEqual([])
	})

	// STYLES drives what the pickers iterate, so a value here with no label renders as its key.
	it('labels every value in STYLES', () => {
		const missing: string[] = []
		for (const [key, items] of Object.entries(STYLES)) {
			const uiType = UI_TYPE_BY_STYLES_KEY[key as keyof typeof STYLES]
			for (const item of items) {
				const id = `${uiType}-style.${item.value}`
				if (!(id in styleMessages)) missing.push(id)
			}
		}
		expect(missing).toEqual([])
	})

	it('covers every STYLES list, so a new one has to be mapped here', () => {
		expect(Object.keys(STYLES).sort()).toEqual(Object.keys(UI_TYPE_BY_STYLES_KEY).sort())
	})

	it('gives every message an id matching its key', () => {
		for (const [key, message] of Object.entries(styleMessages)) {
			expect(message.id).toBe(key)
		}
	})
})
