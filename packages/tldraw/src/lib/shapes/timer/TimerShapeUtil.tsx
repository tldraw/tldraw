import {
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTimerShape,
	TLTimerState,
	timerShapeMigrations,
	timerShapeProps,
} from '@tldraw/editor'
import { useTimer } from './useTimer'

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
			width: 150,
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

	formatTime(time: number) {
		const seconds = time / 1000
		// format time with leading zeros if needed
		const minutesString = Math.floor(seconds / 60)
			.toString()
			.padStart(2, '0')
		const secondsString = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0')
		return `${minutesString}:${secondsString}`
	}

	startTimer(shape: TLTimerShape) {
		this.editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				state: { state: 'running', lastStartTime: Date.now() },
			},
		})
	}

	stopTimer(shape: TLTimerShape) {
		this.editor.updateShape<TLTimerShape>({
			id: shape.id,
			type: shape.type,
			props: {
				remainingTime: shape.props.initialTime,
				state: { state: 'stopped' },
			},
		})
	}

	pauseTimer(shape: TLTimerShape) {
		if (shape.props.state.state !== 'running') return
		const elapsed = Date.now() - shape.props.state.lastStartTime
		this.editor.updateShape<TLTimerShape>({
			id: shape.id,
			type: shape.type,
			props: {
				remainingTime: Math.max(0, shape.props.remainingTime - elapsed),
				state: { state: 'paused' },
			},
		})
	}

	getTimeRemaining(shape: TLTimerShape) {
		const now = Date.now()
		switch (shape.props.state.state) {
			case 'running':
				return shape.props.remainingTime - (now - shape.props.state.lastStartTime)
			case 'stopped':
			case 'paused':
				return shape.props.remainingTime
		}
	}

	getBackgroundColor(state: TLTimerState) {
		switch (state) {
			case 'running':
				return 'green'
			case 'paused':
				return 'yellow'
			case 'stopped':
				return 'red'
		}
	}

	component(shape: TLTimerShape) {
		const remainingTime = this.getTimeRemaining(shape)
		const state = shape.props.state
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks
		const _counter = useTimer(shape.props.state.state)
		if (remainingTime <= 0) {
			this.editor.timers.setTimeout(() => {
				this.editor.updateShape({
					id: shape.id,
					type: shape.type,
					props: {
						state: { state: 'stopped' },
					},
				})
			}, 0)
		}
		const showPlay = (state.state === 'stopped' || state.state === 'paused') && remainingTime > 0
		return (
			<div
				style={{
					pointerEvents: 'all',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					backgroundColor: this.getBackgroundColor(shape.props.state.state),
				}}
			>
				<button onPointerDown={(e) => e.stopPropagation()} onClick={() => this.stopTimer(shape)}>
					Stop
				</button>
				<div>{this.formatTime(remainingTime)}</div>
				{showPlay && (
					<button onPointerDown={(e) => e.stopPropagation()} onClick={() => this.startTimer(shape)}>
						Play
					</button>
				)}
				{!showPlay && (
					<button onPointerDown={(e) => e.stopPropagation()} onClick={() => this.pauseTimer(shape)}>
						Pause
					</button>
				)}
			</div>
		)
	}
}
