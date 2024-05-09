import {
	Box,
	HTMLContainer,
	RecordProps,
	Rectangle2d,
	SVGContainer,
	ShapeUtil,
	T,
	Vec,
} from 'tldraw'
import { OrgArrowShape } from './OrgChartArrowShape'

export class OrgArrowUtil extends ShapeUtil<OrgArrowShape> {
	static override type = 'org-arrow' as const
	static override props: RecordProps<OrgArrowShape> = {
		position: T.literalEnum('left', 'right', 'top', 'bottom'),
	}

	override getDefaultProps() {
		return {
			position: 'left' as const,
		}
	}

	override canBind = () => false
	override canEdit = () => false
	override canResize = () => false

	override hideRotateHandle = () => true
	override isAspectRatioLocked = () => true

	override getGeometry(shape: OrgArrowShape) {
		const r = new Rectangle2d({ x: 0, y: 0, width: 0, height: 0, isFilled: true })
		const bindings = this.editor.getBindingsFromShape(shape, 'org-arrow')
		if (bindings.length < 2) return r

		const from = this.editor.getShapePageBounds(bindings[0].toId)
		const to = this.editor.getShapePageBounds(bindings[1].toId)
		if (!from || !to) return r
		const bounds = Box.Common([from, to])
		return new Rectangle2d({
			width: bounds.width,
			height: bounds.height,
			x: bounds.x,
			y: bounds.y,
			isFilled: true,
		})
	}
	getArrowPath(x1: number, y1: number, x2: number, y2: number) {
		return `M${x1},${y1}L${x2},${y2}`
	}

	override component(shape: OrgArrowShape) {
		const bindings = this.editor.getBindingsFromShape(shape, 'org-arrow')
		if (bindings.length < 2) return

		const from = this.editor.getShapePageBounds(bindings[0].toId)
		const to = this.editor.getShapePageBounds(bindings[1].toId)

		let firstPath: string
		let secondPath: string
		let thirdPath: string | null = null
		if (!from || !to) return null

		const breakBeforeCenterX = from.center.x > to.minX && from.center.x < to.maxX
		const breakBeforeCenterY = from.center.y > to.minY && from.center.y < to.maxY
		const diffX = Math.abs(from.center.x - to.center.x)
		const diffY = Math.abs(from.center.y - to.center.y)
		const preferVertical = diffY > diffX
		const verticalFirst = (preferVertical || breakBeforeCenterX) && !breakBeforeCenterY
		if (verticalFirst) {
			const startBelow = from.center.y < to.center.y
			const endRight = from.center.x > to.center.x
			if (breakBeforeCenterX) {
				const firstElbow = new Vec(from.center.x, from.minY + (to.maxY - from.minY) / 2)
				firstPath = this.getArrowPath(
					from.center.x,
					startBelow ? from.maxY : from.y,
					firstElbow.x,
					firstElbow.y
				)
				secondPath = this.getArrowPath(firstElbow.x, firstElbow.y, to.center.x, firstElbow.y)
				thirdPath = this.getArrowPath(
					to.center.x,
					firstElbow.y,
					to.center.x,
					startBelow ? to.minY : to.maxY
				)
			} else {
				const halfWay = new Vec(from.center.x, to.y + to.height / 2)
				firstPath = this.getArrowPath(
					from.center.x,
					startBelow ? from.maxY : from.y,
					halfWay.x,
					halfWay.y
				)
				secondPath = this.getArrowPath(
					halfWay.x,
					halfWay.y,
					endRight ? to.maxX : to.minX,
					halfWay.y
				)
			}
		} else {
			const startRight = from.center.x < to.center.x
			const endEndBelow = from.center.y > to.center.y
			if (breakBeforeCenterY) {
				const firstElbow = new Vec(from.minX + (to.maxX - from.minX) / 2, from.y + from.height / 2)
				firstPath = this.getArrowPath(
					startRight ? from.maxX : from.minX,
					from.y + from.height / 2,
					firstElbow.x,
					firstElbow.y
				)
				secondPath = this.getArrowPath(firstElbow.x, firstElbow.y, firstElbow.x, to.center.y)
				thirdPath = this.getArrowPath(
					firstElbow.x,
					to.center.y,
					startRight ? to.minX : to.maxX,
					to.center.y
				)
			} else {
				const halfWay = new Vec(to.x + to.width / 2, from.y + from.height / 2)
				firstPath = this.getArrowPath(
					startRight ? from.maxX : from.minX,
					from.y + from.height / 2,
					halfWay.x,
					halfWay.y
				)
				secondPath = this.getArrowPath(
					halfWay.x,
					halfWay.y,
					halfWay.x,
					endEndBelow ? to.maxY : to.minY
				)
			}
		}

		return (
			<HTMLContainer>
				<SVGContainer>
					{firstPath && <path d={firstPath} stroke="#3182ED" strokeWidth={3} />}
					<path d={secondPath} stroke="#3182ED" strokeWidth={3} />
					{thirdPath && <path d={thirdPath} stroke="#3182ED" strokeWidth={3} />}
				</SVGContainer>
			</HTMLContainer>
		)
	}

	override indicator() {
		return null
	}
}
