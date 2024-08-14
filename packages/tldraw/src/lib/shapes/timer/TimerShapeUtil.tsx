import {
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTimerShape,
	TLTimerShapeProps,
	timerShapeMigrations,
	timerShapeProps,
} from '@tldraw/editor'
import { Timer } from './Timer'

/** @public */
export class TimerShapeUtil extends ShapeUtil<TLTimerShape> {
	static override type = 'timer' as const
	static override props = timerShapeProps
	static override migrations = timerShapeMigrations
	override canResize(_shape: TLTimerShape) {
		return false
	}

	override hideRotateHandle(_shape: TLTimerShape): boolean {
		return true
	}
	override hideResizeHandles(_shape: TLTimerShape): boolean {
		return true
	}

	override getGeometry(_shape: TLTimerShape): Geometry2d {
		return new Rectangle2d({
			width: 230,
			height: 40,
			isFilled: true,
			isLabel: false,
		})
	}
	override indicator() {
		return null
	}

	getDefaultProps(): TLTimerShape['props'] {
		return {
			initialTime: 30 * 1000,
			remainingTime: 30 * 1000,
			state: { state: 'stopped' },
		}
	}

	component(shape: TLTimerShape) {
		const { editor } = this
		function store(props: TLTimerShapeProps) {
			editor.updateShape({ id: shape.id, type: shape.type, props })
		}

		return <Timer props={shape.props} editor={this.editor} store={store} />
	}
}
