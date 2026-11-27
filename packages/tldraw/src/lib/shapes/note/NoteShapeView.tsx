/* eslint-disable react-hooks/rules-of-hooks */
import {
	Box,
	SafeId,
	TLNoteShape,
	TLShapeId,
	TLShapeView,
	Vec,
	definePlugin,
	rng,
	shapeViewSlot,
	useColorMode,
	useEditor,
	useValue,
} from '@tldraw/editor'
import { useCallback, useContext } from 'react'
import { TranslationsContext } from '../../ui/hooks/useTranslation/useTranslation'
import {
	isEditingRichTextList,
	isEmptyRichText,
	renderPlaintextFromRichText,
} from '../../utils/text/richText'
import { isRightToLeftLanguage } from '../../utils/text/text'
import { getDisplayValues } from '../shared/getDisplayValues'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { RichTextLabel, RichTextSVG } from '../shared/RichTextLabel'
import { useIsReadyForEditing } from '../shared/useEditablePlainText'
import { useEfficientZoomThreshold } from '../shared/useEfficientZoomThreshold'
import { DefaultNoteShapeAttribution } from './DefaultNoteShapeAttribution'
import type { TLNoteShapeAttributionComponent } from './noteAttribution'
import {
	getNoteHeight,
	getNoteShapeForAdjacentPosition,
	startEditingAdjacentNote,
} from './noteHelpers'
import type { NoteShapeUtil } from './NoteShapeUtil'

/** @public */
export const noteShapeView: TLShapeView<TLNoteShape, NoteShapeUtil> = {
	type: 'note',
	component(shape, util) {
		const { id, type, props } = shape
		const { scale, richText, fontSizeAdjustment, textLastEditedBy } = props

		const handleKeyDown = useNoteKeydownHandler(id)

		const rotation = useValue(
			'shape rotation',
			() => util.editor.getShapePageTransform(id)?.rotation() ?? 0,
			[util.editor]
		)

		const colorMode = useColorMode()
		const dv = getDisplayValues(util, shape, colorMode)

		const nw = dv.noteWidth * scale
		const nh = getNoteHeight(shape, dv.noteHeight)

		// Shadows are hidden when zoomed out far enough; the cheap borderBottom takes over.
		const hideShadows = useEfficientZoomThreshold(0.25 / scale)

		const isSelected = useValue('isSelected', () => id === util.editor.getOnlySelectedShapeId(), [
			util.editor,
			id,
		])

		const isReadyForEditing = useIsReadyForEditing(util.editor, shape.id)
		const isEmpty = isEmptyRichText(richText)

		const NoteShapeAttribution = getAttributionComponent(util)
		const attribution = useValue(
			'attribution',
			() => {
				if (!textLastEditedBy || isEmpty) return null
				const name = util.editor.getAttributionDisplayName(textLastEditedBy)
				if (!name) return null
				return { short: name.split(' ')[0], full: name }
			},
			[textLastEditedBy, isEmpty, util.editor]
		)

		return (
			<>
				<div
					id={id}
					className="tl-note__container"
					style={{
						width: nw,
						height: nh,
						backgroundColor: dv.noteBackgroundColor,
						borderBottom: hideShadows
							? `${dv.borderWidth * scale}px solid ${dv.borderColor}`
							: 'none',
						boxShadow: hideShadows ? 'none' : getNoteShadow(shape.id, rotation, scale),
					}}
				>
					{attribution && NoteShapeAttribution && (
						<NoteShapeAttribution
							shape={shape}
							name={attribution.full}
							firstName={attribution.short}
							color={dv.labelColor}
							scale={scale}
							variant="canvas"
						/>
					)}
					{(isSelected || isReadyForEditing || !isEmpty) && (
						<RichTextLabel
							shapeId={id}
							type={type}
							fontFamily={dv.labelFontFamily}
							checkboxStyle={dv.labelCheckboxStyle}
							fontSize={(fontSizeAdjustment ?? 1) * dv.labelFontSize}
							lineHeight={dv.labelLineHeight}
							textAlign={dv.labelHorizontalAlign}
							verticalAlign={dv.labelVerticalAlign}
							richText={richText}
							isSelected={isSelected}
							labelColor={dv.labelColor}
							wrap
							padding={dv.labelPadding}
							hasCustomTabBehavior
							showTextOutline={false}
							onKeyDown={handleKeyDown}
							style={
								scale !== 1
									? {
											transform: `scale(${scale})`,
											transformOrigin: 'top left',
											width: dv.noteWidth,
											height: dv.noteHeight + shape.props.growY,
										}
									: undefined
							}
						/>
					)}
				</div>
				{'url' in shape.props && shape.props.url && <HyperlinkButton url={shape.props.url} />}
			</>
		)
	},

	toSvg(shape, ctx, util) {
		const dv = getDisplayValues(util, shape, ctx.colorMode)
		const bounds = new Box(0, 0, dv.noteWidth, dv.noteHeight + shape.props.growY)

		const filterId = `note-shadow-${shape.id.replace(/:/g, '_')}` as SafeId

		ctx.addExportDef({
			key: filterId,
			getElement: () => (
				<filter id={filterId} x="-10%" y="-10%" width="130%" height="150%">
					<feMorphology in="SourceAlpha" operator="erode" radius="3" result="erode1" />
					<feGaussianBlur in="erode1" stdDeviation="3" result="blur1" />
					<feOffset in="blur1" dy="3" result="offsetBlur1" />
					<feComponentTransfer in="offsetBlur1" result="shadow1">
						<feFuncA type="linear" slope="0.5" />
					</feComponentTransfer>
					<feMorphology in="SourceAlpha" operator="erode" radius="10" result="erode2" />
					<feGaussianBlur in="erode2" stdDeviation="6" result="blur2" />
					<feOffset in="blur2" dy="6" result="offsetBlur2" />
					<feComponentTransfer in="offsetBlur2" result="shadow2">
						<feFuncA type="linear" slope="0.5" />
					</feComponentTransfer>
					<feMerge>
						<feMergeNode in="shadow1" />
						<feMergeNode in="shadow2" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			),
		})

		const { textLastEditedBy } = shape.props
		const attributionFullName =
			textLastEditedBy && !isEmptyRichText(shape.props.richText)
				? (util.editor.getAttributionDisplayName(textLastEditedBy) ?? null)
				: null
		const attributionFirstName = attributionFullName?.split(' ')[0] ?? null
		const NoteShapeAttribution = getAttributionComponent(util)

		return (
			<>
				{ctx.isDarkMode ? null : (
					<rect
						rx={1}
						width={dv.noteWidth}
						height={bounds.h}
						fill={dv.noteBackgroundColor}
						filter={`url(#${filterId})`}
					/>
				)}
				<rect rx={1} width={dv.noteWidth} height={bounds.h} fill={dv.noteBackgroundColor} />
				<RichTextSVG
					fontSize={(shape.props.fontSizeAdjustment ?? 1) * dv.labelFontSize}
					fontFamily={dv.labelFontFamily}
					checkboxStyle={dv.labelCheckboxStyle}
					lineHeight={dv.labelLineHeight}
					textAlign={dv.labelHorizontalAlign}
					verticalAlign={dv.labelVerticalAlign}
					richText={shape.props.richText}
					labelColor={dv.labelColor}
					bounds={bounds}
					padding={dv.labelPadding}
					showTextOutline={false}
				/>
				{attributionFirstName && attributionFullName && NoteShapeAttribution && (
					<foreignObject
						x={0}
						y={0}
						width={dv.noteWidth}
						height={bounds.h}
						className="tl-export-embed-styles"
					>
						<div style={{ position: 'relative', width: '100%', height: '100%' }}>
							<NoteShapeAttribution
								shape={shape}
								name={attributionFullName}
								firstName={attributionFirstName}
								color={dv.labelColor}
								scale={1}
								variant="export"
							/>
						</div>
					</foreignObject>
				)}
			</>
		)
	},
}

/**
 * Draws note shapes with {@link noteShapeView}. Importing `tldraw` adds it to
 * `createDefaultPlugins()`, see {@link defaultShapeViewPlugins}.
 *
 * @public
 */
export const noteShapeViewPlugin = definePlugin({
	id: 'noteShapeView',
	setup: (ctx) => void ctx.contribute(shapeViewSlot, noteShapeView),
})

// An unset `AttributionComponent` option draws the default badge, and `null` hides it.
function getAttributionComponent(util: NoteShapeUtil): TLNoteShapeAttributionComponent {
	const { AttributionComponent } = util.options
	return AttributionComponent === undefined ? DefaultNoteShapeAttribution : AttributionComponent
}

function useNoteKeydownHandler(id: TLShapeId) {
	const editor = useEditor()
	// Try to get the translation context, but fallback to ltr if it doesn't exist
	const translation = useContext(TranslationsContext)

	return useCallback(
		(e: KeyboardEvent) => {
			const shape = editor.getShape<TLNoteShape>(id)
			if (!shape) return

			const isTab = e.key === 'Tab'
			const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === 'Enter'

			if (isTab && isEditingRichTextList(editor)) {
				// In a list, let the rich text editor indent the item instead of
				// creating a new note. Prevent default so Tab doesn't move focus out
				// of the editor when the item can't be indented (e.g. the first item).
				e.preventDefault()
				return
			}

			if (isTab || isCmdEnter) {
				e.preventDefault()

				const pageTransform = editor.getShapePageTransform(id)
				const pageRotation = pageTransform.rotation()

				// Based on the inputs, calculate the offset to the next note
				// tab controls x axis (shift inverts direction set by RTL)
				// cmd enter is the y axis (shift inverts direction)
				const isRTL = !!(
					translation?.dir === 'rtl' ||
					// todo: can we check a partial of the text, so that we don't have to render the whole thing?
					isRightToLeftLanguage(renderPlaintextFromRichText(editor, shape.props.richText))
				)

				const noteUtil = editor.getShapeUtil(shape) as NoteShapeUtil
				const dv = getDisplayValues(noteUtil, shape)

				const noteOffset = isTab
					? dv.noteWidth + editor.options.adjacentShapeMargin
					: dv.noteHeight +
						editor.options.adjacentShapeMargin +
						// If we're growing down, we need to account for the current shape's growY
						(isCmdEnter && !e.shiftKey ? shape.props.growY : 0)
				const offsetLength = noteOffset * shape.props.scale

				const adjacentCenter = new Vec(
					isTab ? (e.shiftKey != isRTL ? -1 : 1) : 0,
					isCmdEnter ? (e.shiftKey ? -1 : 1) : 0
				)
					.mul(offsetLength)
					.add(new Vec(dv.noteWidth / 2, dv.noteHeight / 2).mul(shape.props.scale))
					.rot(pageRotation)
					.add(pageTransform.point())

				const newNote = getNoteShapeForAdjacentPosition(editor, {
					shape,
					center: adjacentCenter,
					pageRotation,
					noteWidth: dv.noteWidth,
					noteHeight: dv.noteHeight,
				})

				if (newNote) {
					startEditingAdjacentNote(editor, newNote)
				}
			}
		},
		[id, editor, translation?.dir]
	)
}

function getNoteShadow(id: string, rotation: number, scale: number) {
	const random = rng(id) // seeded based on id
	const lift = Math.abs(random()) + 0.5 // 0 to 1.5
	const oy = Math.cos(rotation)
	const a = 5 * scale
	const b = 4 * scale
	const c = 6 * scale
	const d = 7 * scale
	// Clamped so shadow never goes above the note at small scales (e.g. dynamic size mode at high zoom)
	return `0px ${Math.max(0, a - lift)}px ${a}px -${a}px rgba(15, 23, 31, .6),
	0px ${(b + lift * d) * Math.max(0, oy)}px ${c + lift * d}px -${b + lift * c}px rgba(15, 23, 31, ${(0.3 + lift * 0.1).toFixed(2)}),
	0px ${48 * scale}px ${10 * scale}px -${10 * scale}px inset rgba(15, 23, 44, ${((0.022 + random() * 0.005) * ((1 + oy) / 2)).toFixed(2)})`
}
