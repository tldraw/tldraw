import {
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTimerShape,
	timerShapeMigrations,
	timerShapeProps,
	toDomPrecision,
} from '@tldraw/editor'

/** @public */
export class TimerShapeUtil extends ShapeUtil<TLTimerShape> {
	static override type = 'timer' as const
	static override props = timerShapeProps
	static override migrations = timerShapeMigrations
	override getGeometry(_shape: TLTimerShape): Geometry2d {
		return new Rectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			isLabel: false,
		})
	}
	override indicator(shape: TLTimerShape) {
		const bounds = this.editor.getShapeGeometry(shape).bounds
		return <rect width={toDomPrecision(bounds.width)} height={toDomPrecision(bounds.height)} />
	}

	getDefaultProps(): TLTimerShape['props'] {
		return {
			color: 'black',
		}
	}

	component(_shape: TLTimerShape) {
		return <div>Timer</div>
	}
}
