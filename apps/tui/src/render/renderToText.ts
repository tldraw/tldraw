import { Box, Editor, TLShape } from '@tldraw/editor'
import type { ExportTextRequest, RenderToText } from '../file/tldrFile'
import { Screen } from '../terminal/Screen'
import { RenderOptions, ShapeRenderCache, renderShapes } from './renderShapes'
import { getThemeColors, paletteRgb } from './theme'

export type RenderToTextOptions = Pick<
	RenderOptions,
	'glyphs' | 'colorMode' | 'stroke' | 'ambiguousWide'
>

function shapesInBounds(editor: Editor, bounds: Box): TLShape[] {
	const shapes: TLShape[] = []
	for (const shape of editor.getCurrentPageShapesSorted()) {
		if (shape.type === 'group' || editor.isShapeHidden(shape)) continue
		const pageBounds = editor.getShapeMaskedPageBounds(shape)
		if (pageBounds && bounds.includes(pageBounds)) shapes.push(shape)
	}
	return shapes
}

/**
 * Builds the text exporter `file/tldrFile.ts` expects: the request's page bounds are drawn
 * shapes-only into an offscreen screen at the request's zoom and dumped as plain text. Culling
 * ignores the live viewport, so everything inside the bounds is exported.
 */
export function createRenderToText(opts: RenderToTextOptions): RenderToText {
	return (editor: Editor, request: ExportTextRequest): string => {
		const screen = new Screen(request.cols, request.rows, {
			glyphs: opts.glyphs.tier,
			ambiguousWide: opts.ambiguousWide,
			syncOutput: false,
		})
		const colors = getThemeColors(editor, opts.colorMode)
		renderShapes(
			editor,
			screen,
			{ x: 0, y: 0, w: request.cols, h: request.rows },
			{
				glyphs: opts.glyphs,
				colorMode: opts.colorMode,
				stroke: opts.stroke,
				ambiguousWide: opts.ambiguousWide,
				background: paletteRgb(colors, 'background'),
				camera: { x: -request.bounds.x, y: -request.bounds.y, z: request.zoom },
				shapes: shapesInBounds(editor, request.bounds),
				cache: new ShapeRenderCache(),
			}
		)
		return screen.toText()
	}
}
