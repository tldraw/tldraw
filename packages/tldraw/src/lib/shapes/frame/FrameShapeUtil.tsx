import {
	BaseBoxShapeUtil,
	Geometry2d,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLFrameShape,
	TLGroupShape,
	TLOnResizeHandler,
	TLShape,
	canonicalizeRotation,
	frameShapeMigrations,
	frameShapeProps,
	getDefaultColorTheme,
	last,
	resizeBox,
	toDomPrecision,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { createTextJsxFromSpans } from '../shared/createTextJsxFromSpans'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { FrameHeading } from './components/FrameHeading'

export function defaultEmptyAs(str: string, dflt: string) {
	if (str.match(/^\s*$/)) {
		return dflt
	}
	return str
}

/** @public */
export class FrameShapeUtil extends BaseBoxShapeUtil<TLFrameShape> {
	static override type = 'frame' as const
	static override props = frameShapeProps
	static override migrations = frameShapeMigrations

	override canEdit = () => true

	override getDefaultProps(): TLFrameShape['props'] {
		return { w: 160 * 2, h: 90 * 2, name: '' }
	}

	override getGeometry(shape: TLFrameShape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: false,
		})
	}

	override component(shape: TLFrameShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const theme = useDefaultColorTheme()

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isCreating = useValue(
			'is creating this shape',
			() => {
				const resizingState = this.editor.getStateDescendant('select.resizing')
				if (!resizingState) return false
				if (!resizingState.getIsActive()) return false
				const info = (resizingState as typeof resizingState & { info: { isCreating: boolean } })
					?.info
				if (!info) return false
				return info.isCreating && this.editor.getOnlySelectedShapeId() === shape.id
			},
			[shape.id]
		)

		return (
			<>
				<SVGContainer>
					<rect
						className={classNames('tl-frame__body', { 'tl-frame__creating': isCreating })}
						width={bounds.width}
						height={bounds.height}
						fill={theme.solid}
						stroke={theme.text}
					/>
				</SVGContainer>
				{isCreating ? null : (
					<FrameHeading
						id={shape.id}
						name={shape.props.name}
						width={bounds.width}
						height={bounds.height}
					/>
				)}
			</>
		)
	}

	override toSvg(shape: TLFrameShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })

		// Text label
		const pageRotation = canonicalizeRotation(
			this.editor.getShapePageTransform(shape.id)!.rotation()
		)
		// rotate right 45 deg
		const offsetRotation = pageRotation + Math.PI / 4
		const scaledRotation = (offsetRotation * (2 / Math.PI) + 4) % 4
		const labelSide = Math.floor(scaledRotation)

		let labelTranslate: string
		switch (labelSide) {
			case 0: // top
				labelTranslate = ``
				break
			case 3: // right
				labelTranslate = `translate(${toDomPrecision(shape.props.w)}, 0) rotate(90)`
				break
			case 2: // bottom
				labelTranslate = `translate(${toDomPrecision(shape.props.w)}, ${toDomPrecision(
					shape.props.h
				)}) rotate(180)`
				break
			case 1: // left
				labelTranslate = `translate(0, ${toDomPrecision(shape.props.h)}) rotate(270)`
				break
			default:
				throw Error('labelSide out of bounds')
		}

		// Truncate with ellipsis
		const opts = {
			fontSize: 12,
			fontFamily: 'Inter, sans-serif',
			textAlign: 'start' as const,
			width: shape.props.w,
			height: 32,
			padding: 0,
			lineHeight: 1,
			fontStyle: 'normal',
			fontWeight: 'normal',
			overflow: 'truncate-ellipsis' as const,
			verticalTextAlign: 'middle' as const,
		}

		const spans = this.editor.textMeasure.measureTextSpans(
			defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203),
			opts
		)

		const firstSpan = spans[0]
		const lastSpan = last(spans)!
		const labelTextWidth = lastSpan.box.w + lastSpan.box.x - firstSpan.box.x
		const text = createTextJsxFromSpans(this.editor, spans, {
			offsetY: -opts.height - 2,
			...opts,
		})

		return (
			<>
				<rect
					width={shape.props.w}
					height={shape.props.h}
					fill={theme.solid}
					stroke={theme.black.solid}
					strokeWidth={1}
					rx={1}
					ry={1}
				/>
				<g transform={labelTranslate}>
					<rect
						x={-8}
						y={-opts.height - 4}
						width={labelTextWidth + 16}
						height={opts.height}
						fill={theme.background}
						rx={4}
						ry={4}
					/>
					{text}
				</g>
			</>
		)
	}

	indicator(shape: TLFrameShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds

		return (
			<rect
				width={toDomPrecision(bounds.width)}
				height={toDomPrecision(bounds.height)}
				className={`tl-frame-indicator`}
			/>
		)
	}

	override canReceiveNewChildrenOfType = (shape: TLShape, _type: TLShape['type']) => {
		return !shape.isLocked
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override canDropShapes = (shape: TLFrameShape, _shapes: TLShape[]): boolean => {
		return !shape.isLocked
	}

	override onDragShapesOver = (frame: TLFrameShape, shapes: TLShape[]) => {
		if (!shapes.every((child) => child.parentId === frame.id)) {
			this.editor.reparentShapes(shapes, frame.id)
		}
	}

	override onDragShapesOut = (_shape: TLFrameShape, shapes: TLShape[]): void => {
		const parent = this.editor.getShape(_shape.parentId)
		const isInGroup = parent && this.editor.isShapeOfType<TLGroupShape>(parent, 'group')

		// If frame is in a group, keep the shape
		// moved out in that group

		if (isInGroup) {
			this.editor.reparentShapes(shapes, parent.id)
		} else {
			this.editor.reparentShapes(shapes, this.editor.getCurrentPageId())
		}
	}

	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
