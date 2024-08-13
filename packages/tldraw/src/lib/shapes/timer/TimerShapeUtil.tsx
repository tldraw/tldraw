import {
	DefaultColorThemePalette,
	Geometry2d,
	Rectangle2d,
	ShapeUtil,
	TLTimerShape,
	TLTimerState,
	exhaustiveSwitchError,
	timerShapeMigrations,
	timerShapeProps,
} from '@tldraw/editor'
import { useCallback, useState } from 'react'
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

	formatTime(time: number) {
		const seconds = Math.ceil(time / 1000)
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
				state: { state: 'running', lastStartTime: this.getCurrentServerTime() },
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
		const elapsed = this.getElapsedTime(shape)
		this.editor.updateShape<TLTimerShape>({
			id: shape.id,
			type: shape.type,
			props: {
				remainingTime: Math.max(0, shape.props.remainingTime - elapsed),
				state: { state: 'paused' },
			},
		})
	}

	getElapsedTime(shape: TLTimerShape) {
		if (shape.props.state.state !== 'running') return 0
		return this.getCurrentServerTime() - shape.props.state.lastStartTime
	}

	getCurrentServerTime() {
		const offset = (window as any).serverOffset ?? 0
		return Date.now() + offset
	}

	getTimeRemaining(shape: TLTimerShape) {
		switch (shape.props.state.state) {
			case 'running':
				return shape.props.remainingTime - this.getElapsedTime(shape)
			case 'stopped':
				return shape.props.initialTime
			case 'paused':
				return shape.props.remainingTime
			case 'completed':
				return 0
			default:
				exhaustiveSwitchError(shape.props.state)
		}
	}

	getBackgroundColor(state: TLTimerState, darkMode: boolean) {
		const scheme = darkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode

		switch (state) {
			case 'running':
				return scheme.red.semi
			case 'paused':
				return scheme.orange.semi
			case 'stopped':
				return scheme.background
			case 'completed':
				return scheme.green.semi
			default:
				exhaustiveSwitchError(state)
		}
	}

	component(shape: TLTimerShape) {
		const remainingTime = this.getTimeRemaining(shape)
		const darkMode = this.editor.user.getIsDarkMode()
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [isExpanded, setIsExpanded] = useState(true)
		const state = shape.props.state
		// eslint-disable-next-line @typescript-eslint/no-unused-vars, react-hooks/rules-of-hooks
		const _counter = useTimer(shape.props.state.state)
		if (remainingTime <= 0) {
			this.editor.timers.setTimeout(() => {
				this.editor.updateShape({
					id: shape.id,
					type: shape.type,
					props: {
						state: { state: 'completed' },
					},
				})
			}, 0)
		}
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const increaseTime = useCallback(() => {
			const newTime =
				shape.props.initialTime < 5 * 60 * 1000
					? shape.props.initialTime + 30 * 1000
					: shape.props.initialTime + 60 * 1000
			this.editor.updateShape<TLTimerShape>({
				id: shape.id,
				type: shape.type,
				props: {
					initialTime: newTime,
					remainingTime: newTime,
				},
			})
		}, [shape])

		const showPlay = (state.state === 'stopped' || state.state === 'paused') && remainingTime > 0
		const remainingSeconds = Math.ceil(remainingTime / 1000)
		const initialSeconds = Math.ceil(shape.props.initialTime / 1000)
		const width =
			state.state === 'running' ? `${(remainingSeconds / initialSeconds) * 100}%` : '100%'
		return (
			<div
				style={{
					pointerEvents: 'all',
					display: 'flex',
					borderRadius: '5px',
					border: '1px solid black',
					padding: '5px',
					gap: '5px',
					alignItems: 'stretch',
				}}
			>
				{isExpanded && (
					<>
						<button onPointerDown={(e) => e.stopPropagation()} onClick={() => setIsExpanded(false)}>
							X
						</button>
						<button
							onPointerDown={(e) => e.stopPropagation()}
							onClick={() => this.stopTimer(shape)}
						>
							Stop
						</button>
					</>
				)}
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						width: '60px',
						overflow: 'hidden',
						border: '1px solid black',
						borderRadius: '5px',
						position: 'relative',
						justifyContent: 'center',
					}}
					onPointerDown={(e) => e.stopPropagation()}
					onClick={() => {
						if (!isExpanded) {
							setIsExpanded(true)
						}
					}}
				>
					<div
						style={{
							zIndex: 0,
							height: '100%',
							position: 'absolute',
							top: 0,
							left: 0,
							backgroundColor: this.getBackgroundColor(shape.props.state.state, darkMode),
							width,
						}}
					/>
					<div
						style={{
							zIndex: 1,
						}}
					>
						{this.formatTime(remainingTime)}
					</div>
				</div>
				{isExpanded && (
					<>
						<button onPointerDown={(e) => e.stopPropagation()} onClick={increaseTime}>
							+
						</button>
						{showPlay && (
							<button
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => this.startTimer(shape)}
							>
								Play
							</button>
						)}
						{!showPlay && (
							<button
								onPointerDown={(e) => e.stopPropagation()}
								onClick={() => this.pauseTimer(shape)}
							>
								Pause
							</button>
						)}
					</>
				)}
			</div>
		)
	}
}
