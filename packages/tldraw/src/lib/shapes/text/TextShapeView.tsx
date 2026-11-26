/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	TLShapeId,
	TLShapeView,
	TLTextShape,
	definePlugin,
	shapeViewSlot,
	useColorMode,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback } from 'react'
import { getDisplayValues } from '../shared/getDisplayValues'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import type { TextShapeUtil } from './TextShapeUtil'

// Export-only slack (as a fraction of font size) added around a text shape's advance box in `toSvg`,
// so italic/cursive glyph ink that spills past the box — side bearings, slanted ascenders — isn't
// clipped at the <foreignObject> edge on export (#8802). The text still renders in the same place;
// the export's auto-trim crops the extra room back to the real pixels, so the PNG stays tight. This
// is deliberately export-only: the shape's geometry (selection, hit-testing, the text-edit cursor)
// stays the advance box, which is the right box for those.
const TEXT_EXPORT_INK_MARGIN = 0.3

/** @public */
export const textShapeView: TLShapeView<TLTextShape, TextShapeUtil> = {
	type: 'text',
	component(shape, util) {
		const {
			id,
			props: { richText, scale, textAlign },
		} = shape

		const { width, height } = util.getMinDimensions(shape)
		const isSelected = useValue('isSelected', () => id === util.editor.getOnlySelectedShapeId(), [
			util.editor,
			id,
		])
		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)
		const handleKeyDown = useTextShapeKeydownHandler(id)

		return (
			<RichTextLabel
				shapeId={id}
				classNamePrefix="tl-text-shape"
				type="text"
				fontFamily={dv.fontFamily}
				checkboxStyle={dv.checkboxStyle}
				fontSize={dv.fontSize}
				lineHeight={dv.lineHeight}
				textAlign={textAlign === 'middle' ? 'center' : textAlign}
				verticalAlign="middle"
				richText={richText}
				labelColor={dv.color}
				isSelected={isSelected}
				textWidth={width}
				textHeight={height}
				showTextOutline={util.options.showTextOutline}
				style={{
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
				}}
				wrap
				onKeyDown={handleKeyDown}
			/>
		)
	},

	toSvg(shape, ctx, util) {
		const bounds = util.editor.getShapeGeometry(shape).bounds
		const width = bounds.width / (shape.props.scale ?? 1)
		const height = bounds.height / (shape.props.scale ?? 1)

		const dv = getDisplayValues(util, shape, ctx.colorMode)

		// Pad the exported foreignObject by a margin so glyph ink can spill past the advance box
		// without being clipped at its edge; the text is inset by the same margin so it renders in the
		// same place, and the export's trim crops the slack back to content. See TEXT_EXPORT_INK_MARGIN.
		const inkMargin = Math.ceil(dv.fontSize * TEXT_EXPORT_INK_MARGIN)
		const exportBounds = new Box(
			-inkMargin,
			-inkMargin,
			width + inkMargin * 2,
			height + inkMargin * 2
		)
		return (
			<RichTextSVG
				fontSize={dv.fontSize}
				fontFamily={dv.fontFamily}
				checkboxStyle={dv.checkboxStyle}
				lineHeight={dv.lineHeight}
				textAlign={shape.props.textAlign === 'middle' ? 'center' : shape.props.textAlign}
				verticalAlign="middle"
				richText={shape.props.richText}
				labelColor={dv.color}
				bounds={exportBounds}
				padding={inkMargin}
				showTextOutline={util.options.showTextOutline}
			/>
		)
	},
}

/**
 * Draws text shapes with {@link textShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const textShapeViewPlugin = definePlugin({
	id: 'textShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, textShapeView),
})

function useTextShapeKeydownHandler(id: TLShapeId) {
	const editor = useEditor()

	return useCallback(
		(e: KeyboardEvent) => {
			if (editor.getEditingShapeId() !== id) return

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
			}
		},
		[editor, id]
	)
}
