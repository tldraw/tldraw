import {
	Editor,
	Group2d,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLCodeShape,
	TLOnEditEndHandler,
	TLShape,
	WeakCache,
	codeShapeMigrations,
	codeShapeProps,
	toDomPrecision,
	DefaultColorThemePalette,
} from '@tldraw/editor'
import { SvgTextLabel } from '../shared/SvgTextLabel'
import { TextLabel } from '../shared/TextLabel'
import {
	FONT_FAMILIES,
	LABEL_FONT_SIZES,
	LABEL_PADDING,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import {EditorState} from "@codemirror/state"
import {EditorView,keymap, basicSetup} from "codemirror"
import {javascript} from "@codemirror/lang-javascript"
import {defaultKeymap} from "@codemirror/commands"

import { useForceSolid } from '../shared/useForceSolid'
import { useEffect, useRef } from 'react'

const CODE_SIZE = 200
const FONT = "mono"
const BG_COLOR = DefaultColorThemePalette.lightMode.codeBg
const FG_COLOR = DefaultColorThemePalette.lightMode.codeText

/** @public */
export class CodeShapeUtil extends ShapeUtil<TLCodeShape> {
	static override type = 'code' as const
	static override props = codeShapeProps
	static override migrations = codeShapeMigrations

	override canEdit = () => true
	override hideResizeHandles = () => true
	override hideSelectionBoundsFg = () => false

	getDefaultProps(): TLCodeShape['props'] {
		return {
			size: 's',
			text: '',
			growY: 0,
		}
	}

	getGeometry(shape: TLCodeShape) {
		const codeHeight = getCodeHeight(shape)
		const { labelHeight, labelWidth } = getLabelSize(this.editor, shape)

		return new Group2d({
			children: [
				new Rectangle2d({ width: CODE_SIZE * 2, height: codeHeight, isFilled: true }),
				new Rectangle2d({
					x: 0,
					y: 0,
					width: labelWidth,
					height: labelHeight,
					isFilled: true,
					isLabel: true,
				}),
			],
		})
	}

	component(shape: TLCodeShape) {
		const {
			id,
			type,
			props: { size, text, },
		} = shape
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const ref = useRef(null)

		// eslint-disable-next-line react-hooks/rules-of-hooks
		useEffect(() => {
			const startState = EditorState.create({
				doc: "Hello World",
				// extensions: [keymap.of(defaultKeymap)]
				// extensions: [javascript()]
			})
			
			const view = new EditorView({
				state: startState,
				parent: ref.current!
			})
			console.log(view)
		}, [])

		const codeHeight = getCodeHeight(shape)

		// todo: consider hiding shadows on dark mode if they're invisible anyway
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const hideShadows = useForceSolid()

		const isSelected = shape.id === this.editor.getOnlySelectedShapeId()

		return (
			<>
				<div
					id={id}
					className="tl-code__container"
					style={{
						width: CODE_SIZE * 2,
						height: codeHeight,
						backgroundColor: BG_COLOR,
						borderBottom: hideShadows ? `3px solid rgb(15, 23, 31, .2)` : `none`,
					}}
				>

		<div
			className={`tl-text-label tl-text-wrapper`}
			data-font={FONT}
			data-align="start"
			data-hastext="true"
			// data-isediting={isEditing}
			// data-iseditinganything={isEditingAnything}
			// data-textwrap={!!wrap}
			data-isselected={isSelected}
			style={{
				justifyContent: "start",
				alignItems: "start",
				// ...style,
			}}
		>
			<div
				className={`tl-text-label__inner tl-text-content__wrapper`}
				style={{
					fontSize: LABEL_FONT_SIZES[size],
					lineHeight: LABEL_FONT_SIZES[size] * TEXT_PROPS.lineHeight + 'px',
					minHeight: TEXT_PROPS.lineHeight + 32,
					minWidth:  0,
					color: FG_COLOR,
				}}
			>
				<div className={`tl-text tl-text-content`} dir="auto">
					<div ref={ref} />
					</div></div></div>
					{/* <TextLabel
						id={id}
						type={type}
						font={FONT}
						fontSize={LABEL_FONT_SIZES[size]}
						lineHeight={TEXT_PROPS.lineHeight}
						align="start"
						verticalAlign="start"
						text={text}
						isSelected={isSelected}
						labelColor={FG_COLOR}
						wrap
					/> */}
				</div>
			</>
		)
	}

	indicator(shape: TLCodeShape) {
		return (
			<rect
				rx="1"
				width={toDomPrecision(CODE_SIZE * 2)}
				height={toDomPrecision(getCodeHeight(shape))}
			/>
		)
	}

	override toSvg(shape: TLCodeShape, ctx: SvgExportContext) {
		const font = FONT
		ctx.addExportDef(getFontDefForExport(font))
		if (shape.props.text) ctx.addExportDef(getFontDefForExport(font))
		const bounds = this.editor.getShapeGeometry(shape).bounds
		return (
			<>
				<rect x={5} y={5} rx={1} width={CODE_SIZE * 2 - 10} height={bounds.h} fill="rgba(0,0,0,.1)" />
				<rect
					rx={1}
					width={CODE_SIZE * 2}
					height={bounds.h}
					fill={BG_COLOR}
				/>
				<SvgTextLabel
					fontSize={LABEL_FONT_SIZES[shape.props.size]}
					font={font}
					align="start"
					verticalAlign="start"
					text={shape.props.text}
					labelColor={FG_COLOR}
					bounds={bounds}
					stroke={false}
				/>
			</>
		)
	}

	override onBeforeCreate = (next: TLCodeShape) => {
		return getCodeSizeAdjustments(this.editor, next)
	}

	override onBeforeUpdate = (prev: TLCodeShape, next: TLCodeShape) => {
		if (
			prev.props.text === next.props.text &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getCodeSizeAdjustments(this.editor, next)
	}

	override onEditEnd: TLOnEditEndHandler<TLCodeShape> = (shape) => {
		const {
			id,
			type,
			props: { text },
		} = shape

		if (text.trimEnd() !== shape.props.text) {
			this.editor.updateShapes([
				{
					id,
					type,
					props: {
						text: text.trimEnd(),
					},
				},
			])
		}
	}
}

/**
 * Get the growY for a shape.
 */
function getCodeSizeAdjustments(editor: Editor, shape: TLCodeShape) {
	const { labelHeight } = getLabelSize(editor, shape)
	// When the label height is more than the height of the shape, we add extra height to it
	const growY = Math.max(0, labelHeight - CODE_SIZE)

	if (growY !== shape.props.growY) {
		return {
			...shape,
			props: {
				...shape.props,
				growY,
			},
		}
	}
}

/**
 * Get the label size for a code block.
 */
function getCodeLabelSize(editor: Editor, shape: TLCodeShape) {
	const text = shape.props.text

	if (!text) {
		const minHeight = LABEL_FONT_SIZES[shape.props.size] * TEXT_PROPS.lineHeight + LABEL_PADDING * 2
		return { labelHeight: minHeight, labelWidth: 100 }
	}

	let labelHeight = CODE_SIZE
	let labelWidth = CODE_SIZE * 2

	const nextTextSize = editor.textMeasure.measureText(text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[FONT],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: CODE_SIZE * 2 - LABEL_PADDING * 2,
		disableOverflowWrapBreaking: true,
	})

	labelHeight = nextTextSize.h + LABEL_PADDING * 2
	labelWidth = nextTextSize.w + LABEL_PADDING * 2

	return {
		labelHeight,
		labelWidth,
	}
}

const labelSizesForCodeBlock = new WeakCache<TLShape, ReturnType<typeof getCodeLabelSize>>()

function getLabelSize(editor: Editor, shape: TLCodeShape) {
	return labelSizesForCodeBlock.get(shape, () => getCodeLabelSize(editor, shape))
}

function getCodeHeight(shape: TLCodeShape) {
	return CODE_SIZE + shape.props.growY
}
