import {
	BaseBoxShapeUtil,
	Geometry2d,
	Group2d,
	Rectangle2d,
	SVGContainer,
	SvgExportContext,
	TLFrameShape,
	TLFrameShapeProps,
	TLGroupShape,
	TLResizeInfo,
	TLShape,
	frameShapeMigrations,
	frameShapeProps,
	getDefaultColorTheme,
	lerp,
	resizeBox,
	toDomPrecision,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'

import {
	TLCreateTextJsxFromSpansOpts,
	createTextJsxFromSpans,
} from '../shared/createTextJsxFromSpans'
import { useDefaultColorTheme } from '../shared/useDefaultColorTheme'
import { FrameHeading } from './components/FrameHeading'
import {
	getFrameHeadingOpts,
	getFrameHeadingSide,
	getFrameHeadingSize,
	getFrameHeadingTranslation,
} from './frameHelpers'

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

	override canEdit() {
		return true
	}

	override getDefaultProps(): TLFrameShape['props'] {
		return { w: 160 * 2, h: 90 * 2, name: '' }
	}

	override getGeometry(shape: TLFrameShape): Geometry2d {
		const { editor } = this
		const z = editor.getZoomLevel()
		const opts = getFrameHeadingOpts(shape, 'black')
		const box = getFrameHeadingSize(editor, shape, opts)
		const labelSide = getFrameHeadingSide(editor, shape)

		// wow this fucking sucks!!!
		let x: number, y: number, w: number, h: number

		const { w: hw, h: hh } = box
		const scaledW = Math.min(hw, shape.props.w * z)
		const scaledH = Math.min(hh, shape.props.h * z)

		switch (labelSide) {
			case 0: {
				x = -8 / z
				y = (-hh - 4) / z
				w = (scaledW + 16) / z
				h = hh / z
				break
			}
			case 1: {
				x = (-hh - 4) / z
				h = (scaledH + 16) / z
				y = shape.props.h - h + 8 / z
				w = hh / z
				break
			}
			case 2: {
				x = shape.props.w - (scaledW + 8) / z
				y = shape.props.h + 4 / z
				w = (scaledH + 16) / z
				h = hh / z
				break
			}
			case 3: {
				x = shape.props.w + 4 / z
				h = (scaledH + 16) / z
				y = -8 / z
				w = hh / z
				break
			}
		}

		return new Group2d({
			children: [
				new Rectangle2d({
					width: shape.props.w,
					height: shape.props.h,
					isFilled: false,
				}),
				new Rectangle2d({
					x,
					y,
					width: w,
					height: h,
					isFilled: true,
					isLabel: true,
				}),
			],
		})
	}

	override getText(shape: TLFrameShape): string | undefined {
		return shape.props.name
	}

	override component(shape: TLFrameShape) {
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
						width={shape.props.w}
						height={shape.props.h}
						fill={theme.solid}
						stroke={theme.text}
					/>
				</SVGContainer>
				{isCreating ? null : (
					<FrameHeading
						id={shape.id}
						name={shape.props.name}
						width={shape.props.w}
						height={shape.props.h}
					/>
				)}
			</>
		)
	}

	override toSvg(shape: TLFrameShape, ctx: SvgExportContext) {
		const theme = getDefaultColorTheme({ isDarkMode: ctx.isDarkMode })

		// rotate right 45 deg
		const labelSide = getFrameHeadingSide(this.editor, shape)
		const labelTranslate = getFrameHeadingTranslation(shape, labelSide, true)

		// Truncate with ellipsis
		const opts: TLCreateTextJsxFromSpansOpts = getFrameHeadingOpts(shape, theme.text)

		const frameTitle = defaultEmptyAs(shape.props.name, 'Frame') + String.fromCharCode(8203)
		const labelBounds = getFrameHeadingSize(this.editor, shape, opts)
		const spans = this.editor.textMeasure.measureTextSpans(frameTitle, opts)
		const text = createTextJsxFromSpans(this.editor, spans, opts)

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
						x={labelBounds.x - 8}
						y={labelBounds.y - 4}
						width={labelBounds.width + 20}
						height={labelBounds.height}
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
		return (
			<rect
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				className={`tl-frame-indicator`}
			/>
		)
	}

	override canReceiveNewChildrenOfType(shape: TLShape, _type: TLShape['type']) {
		return !shape.isLocked
	}

	override providesBackgroundForChildren(): boolean {
		return true
	}

	override canDropShapes(shape: TLFrameShape, _shapes: TLShape[]): boolean {
		return !shape.isLocked
	}

	override onDragShapesOver(frame: TLFrameShape, shapes: TLShape[]) {
		if (!shapes.every((child) => child.parentId === frame.id)) {
			this.editor.reparentShapes(shapes, frame.id)
		}
	}

	override onDragShapesOut(_shape: TLFrameShape, shapes: TLShape[]): void {
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

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}
	override getInterpolatedProps(
		startShape: TLFrameShape,
		endShape: TLFrameShape,
		t: number
	): TLFrameShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}
