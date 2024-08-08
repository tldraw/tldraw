import {
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTimerShape,
	timerShapeMigrations,
	timerShapeProps,
} from '@tldraw/editor'

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

	intervalId: number | null = null
	override getGeometry(_shape: TLTimerShape): Geometry2d {
		return new Rectangle2d({
			width: 100,
			height: 100,
			isFilled: true,
			isLabel: false,
		})
	}
	override indicator() {
		return null
		// const bounds = this.editor.getShapeGeometry(shape).bounds
		// return <rect width={toDomPrecision(bounds.width)} height={toDomPrecision(bounds.height)} />
	}

	getDefaultProps(): TLTimerShape['props'] {
		return {
			time: 300,
			state: 'idle',
		}
	}

	formatTime(time: number) {
		return `${Math.floor(time / 60)}:${time % 60}`
	}

	startTimer(shape: TLTimerShape) {
		this.editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				state: 'running',
			},
		})
		this.intervalId = this.editor.timers.setInterval(() => {
			const s = this.editor.getShape<TLTimerShape>(shape.id)
			if (!s) return
			this.editor.updateShape({
				id: shape.id,
				type: shape.type,
				props: {
					time: s.props.time - 1,
				},
			})
		}, 1000)
	}

	stopTimer(shape: TLTimerShape) {
		if (this.intervalId) {
			clearInterval(this.intervalId)
			this.intervalId = null
		}
		this.editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				state: 'idle',
			},
		})
	}

	override onClick(shape: TLTimerShape) {
		switch (shape.props.state) {
			case 'idle':
				this.startTimer(shape)
				break
			case 'running':
				this.stopTimer(shape)
				break
		}
	}

	component(shape: TLTimerShape) {
		return (
			<div
				style={{
					backgroundColor: shape.props.state === 'running' ? 'red' : 'green',
				}}
			>
				{this.formatTime(shape.props.time)}
			</div>
		)
	}
}
