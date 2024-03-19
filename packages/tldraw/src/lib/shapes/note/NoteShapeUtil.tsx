import * as Tooltip from '@radix-ui/react-tooltip'
import {
	DefaultFontFamilies,
	Editor,
	Rectangle2d,
	ShapeUtil,
	SvgExportContext,
	TLNoteShape,
	TLOnEditEndHandler,
	getDefaultColorTheme,
	noteShapeMigrations,
	noteShapeProps,
	toDomPrecision,
	uniq,
} from '@tldraw/editor'
import { FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react'
import { Root, createRoot } from 'react-dom/client'
import { HyperlinkButton } from '../shared/HyperlinkButton'
import { useDefaultColorTheme } from '../shared/ShapeFill'
import { TextLabel } from '../shared/TextLabel'
import { FONT_FAMILIES, LABEL_FONT_SIZES, TEXT_PROPS } from '../shared/default-shape-constants'
import { getFontDefForExport } from '../shared/defaultStyleDefs'
import EmojiDialog from '../shared/emojis'
import { getTextLabelSvgElement } from '../shared/getTextLabelSvgElement'

const NOTE_SIZE = 200

/** @public */
export class NoteShapeUtil extends ShapeUtil<TLNoteShape> {
	static override type = 'note' as const
	static override props = noteShapeProps
	static override migrations = noteShapeMigrations

	override canEdit = () => true
	override hideResizeHandles = () => true
	override hideSelectionBoundsFg = () => true

	getDefaultProps(): TLNoteShape['props'] {
		return {
			color: 'black',
			size: 'm',
			text: '',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			growY: 0,
			url: '',
			reacji: {},
		}
	}

	getHeight(shape: TLNoteShape) {
		return NOTE_SIZE + shape.props.growY
	}

	getGeometry(shape: TLNoteShape) {
		const height = this.getHeight(shape)
		return new Rectangle2d({ width: NOTE_SIZE, height, isFilled: true })
	}

	component(shape: TLNoteShape) {
		const {
			id,
			type,
			props: { color, font, size, align, text, verticalAlign, reacji },
		} = shape

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()
		const adjustedColor = color === 'black' ? 'yellow' : color

		return (
			<>
				<div
					style={{
						position: 'absolute',
						width: NOTE_SIZE,
						height: this.getHeight(shape),
					}}
				>
					<div
						className="tl-note__container"
						style={{
							color: theme[adjustedColor].solid,
							backgroundColor: theme[adjustedColor].solid,
						}}
					>
						<div className="tl-note__scrim" />
						<TextLabel
							id={id}
							type={type}
							font={font}
							size={size}
							align={align}
							verticalAlign={verticalAlign}
							text={text}
							labelColor="black"
							wrap
						/>
					</div>
					<Reacji
						editor={this.editor}
						reacji={reacji}
						onSelect={(emoji, name) => this.onReacjiSelect(shape, emoji, name)}
					/>
				</div>
				{'url' in shape.props && shape.props.url && (
					<HyperlinkButton url={shape.props.url} zoomLevel={this.editor.getZoomLevel()} />
				)}
			</>
		)
	}

	onReacjiSelect = (shape: TLNoteShape, emoji: string, name: string) => {
		const reacji = Object.assign({}, shape.props.reacji)
		const includesPersonAlready = reacji[emoji]?.includes(name)
		reacji[emoji] = includesPersonAlready
			? reacji[emoji].filter((n) => n !== name)
			: uniq([...(reacji[emoji] || []), name])
		if (!reacji[emoji].length) {
			delete reacji[emoji]
		}

		this.editor.updateShapes([
			{
				...shape,
				props: {
					...shape.props,
					reacji,
				},
			},
		])
	}

	indicator(shape: TLNoteShape) {
		return (
			<rect
				rx="6"
				width={toDomPrecision(NOTE_SIZE)}
				height={toDomPrecision(this.getHeight(shape))}
			/>
		)
	}

	override toSvg(shape: TLNoteShape, ctx: SvgExportContext) {
		ctx.addExportDef(getFontDefForExport(shape.props.font))
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })
		const bounds = this.editor.getShapeGeometry(shape).bounds

		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

		const adjustedColor = shape.props.color === 'black' ? 'yellow' : shape.props.color

		const rect1 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect1.setAttribute('rx', '10')
		rect1.setAttribute('width', NOTE_SIZE.toString())
		rect1.setAttribute('height', bounds.height.toString())
		rect1.setAttribute('fill', theme[adjustedColor].solid)
		rect1.setAttribute('stroke', theme[adjustedColor].solid)
		rect1.setAttribute('stroke-width', '1')
		g.appendChild(rect1)

		const rect2 = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
		rect2.setAttribute('rx', '10')
		rect2.setAttribute('width', NOTE_SIZE.toString())
		rect2.setAttribute('height', bounds.height.toString())
		rect2.setAttribute('fill', theme.background)
		rect2.setAttribute('opacity', '.28')
		g.appendChild(rect2)

		const textElm = getTextLabelSvgElement({
			editor: this.editor,
			shape,
			font: DefaultFontFamilies[shape.props.font],
			bounds,
		})

		textElm.setAttribute('fill', theme.text)
		textElm.setAttribute('stroke', 'none')
		g.appendChild(textElm)

		return g
	}

	override onBeforeCreate = (next: TLNoteShape) => {
		return getGrowY(this.editor, next, next.props.growY)
	}

	override onBeforeUpdate = (prev: TLNoteShape, next: TLNoteShape) => {
		if (
			prev.props.text === next.props.text &&
			prev.props.font === next.props.font &&
			prev.props.size === next.props.size
		) {
			return
		}

		return getGrowY(this.editor, next, prev.props.growY)
	}

	override onEditEnd: TLOnEditEndHandler<TLNoteShape> = (shape) => {
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

type ReacjiBagType = { [key: string]: string[] }

function Reacji({
	editor,
	reacji,
	onSelect,
}: {
	editor: Editor
	reacji: ReacjiBagType | undefined
	onSelect: (emoji: string, name: string) => void
}) {
	const [renderRoot, setRenderRoot] = useState<Root>()
	const addButtonRef = useRef<HTMLButtonElement>(null)
	const name = editor.user?.getName() || 'Me'

	useEffect(() => {
		const div = document.createElement('div')
		div.id = 'tl-emoji-menu-root'
		document.body.appendChild(div)
		const root = createRoot(div)
		setRenderRoot(root)

		return () => {
			root.unmount()
			document.body.removeChild(div)
		}
	}, [])

	const onEmojiSelect = async (emoji: any) => {
		onSelect(emoji.native, name)
		closeMenu()
	}

	const onEmojiRetract = (emoji: string) => {
		onSelect(emoji, name)
	}

	const closeMenu = () => {
		renderRoot?.render(null)
	}

	const handleOpen = () => {
		const coords = addButtonRef.current?.getBoundingClientRect()

		renderRoot?.render(
			<EmojiDialog
				editor={editor}
				onEmojiSelect={onEmojiSelect}
				onClickOutside={closeMenu}
				top={(coords?.top || 0) + 24}
				left={(coords?.left || 0) + 24}
			/>
		)
	}

	return (
		<div className="tl-note__reacji">
			{reacji &&
				Object.entries(reacji).map(([reacji, people]) => (
					<TooltipWrapper tooltip={people.join(', ')}>
						<button key={reacji} onMouseDown={() => onEmojiRetract(reacji)}>
							{reacji} <span className="tl-note__reacji-count">{people.length}</span>
						</button>
					</TooltipWrapper>
				))}
			<TooltipWrapper tooltip="Add emoji">
				<button className="tl-note__reacji-add" ref={addButtonRef} onMouseDown={handleOpen}>
					+
				</button>
			</TooltipWrapper>
		</div>
	)
}

const TooltipWrapper: FC<PropsWithChildren<{ tooltip: string | ReactNode }>> = ({
	children,
	tooltip,
}) => {
	return (
		<Tooltip.Provider delayDuration={200}>
			<Tooltip.Root>
				<Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
				<Tooltip.Portal>
					<Tooltip.Content className="TooltipContent" sideOffset={5}>
						{tooltip}
						<Tooltip.Arrow className="TooltipArrow" />
					</Tooltip.Content>
				</Tooltip.Portal>
			</Tooltip.Root>
		</Tooltip.Provider>
	)
}

function getGrowY(editor: Editor, shape: TLNoteShape, prevGrowY = 0) {
	const PADDING = 17

	const nextTextSize = editor.textMeasure.measureText(shape.props.text, {
		...TEXT_PROPS,
		fontFamily: FONT_FAMILIES[shape.props.font],
		fontSize: LABEL_FONT_SIZES[shape.props.size],
		maxWidth: NOTE_SIZE - PADDING * 2,
	})

	const nextHeight = nextTextSize.h + PADDING * 2

	let growY: number | null = null

	if (nextHeight > NOTE_SIZE) {
		growY = nextHeight - NOTE_SIZE
	} else {
		if (prevGrowY) {
			growY = 0
		}
	}

	if (growY !== null) {
		return {
			...shape,
			props: {
				...shape.props,
				growY,
			},
		}
	}
}
