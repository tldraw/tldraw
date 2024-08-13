import {
	DefaultColorThemePalette,
	Editor,
	TLTimerShape,
	TLTimerState,
	exhaustiveSwitchError,
} from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { useTimer } from './useTimer'

function formatTime(time: number) {
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

function startTimer(shape: TLTimerShape, editor: Editor) {
	editor.updateShape({
		id: shape.id,
		type: shape.type,
		props: {
			state: { state: 'running', lastStartTime: getCurrentServerTime() },
		},
	})
}

function stopTimer(shape: TLTimerShape, editor: Editor) {
	editor.updateShape<TLTimerShape>({
		id: shape.id,
		type: shape.type,
		props: {
			remainingTime: shape.props.initialTime,
			state: { state: 'stopped' },
		},
	})
}

function pauseTimer(shape: TLTimerShape, editor: Editor) {
	if (shape.props.state.state !== 'running') return
	const elapsed = getElapsedTime(shape)
	editor.updateShape<TLTimerShape>({
		id: shape.id,
		type: shape.type,
		props: {
			remainingTime: Math.max(0, shape.props.remainingTime - elapsed),
			state: { state: 'paused' },
		},
	})
}
function getElapsedTime(shape: TLTimerShape) {
	if (shape.props.state.state !== 'running') return 0
	return getCurrentServerTime() - shape.props.state.lastStartTime
}

function getCurrentServerTime() {
	const offset = (window as any).serverOffset ?? 0
	return Date.now() + offset
}

function getBackgroundColor(state: TLTimerState, darkMode: boolean) {
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

function getTimeRemaining(shape: TLTimerShape) {
	switch (shape.props.state.state) {
		case 'running':
			return shape.props.remainingTime - getElapsedTime(shape)
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

/** @public */
export interface TimerProps {
	shape: TLTimerShape
	editor: Editor
}

/** @public @react */
export function Timer({ shape, editor }: TimerProps) {
	const remainingTime = getTimeRemaining(shape)
	const darkMode = editor.user.getIsDarkMode()
	const [isExpanded, setIsExpanded] = useState(true)
	const state = shape.props.state
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _counter = useTimer(shape.props.state.state)
	if (remainingTime <= 0) {
		editor.timers.setTimeout(() => {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				props: {
					state: { state: 'completed' },
				},
			})
		}, 0)
	}
	const increaseTime = useCallback(() => {
		const newTime =
			shape.props.initialTime < 5 * 60 * 1000
				? shape.props.initialTime + 30 * 1000
				: shape.props.initialTime + 60 * 1000
		editor.updateShape<TLTimerShape>({
			id: shape.id,
			type: shape.type,
			props: {
				initialTime: newTime,
				remainingTime: newTime,
			},
		})
	}, [editor, shape.id, shape.props.initialTime, shape.type])

	const showPlay = (state.state === 'stopped' || state.state === 'paused') && remainingTime > 0
	const remainingSeconds = Math.ceil(remainingTime / 1000)
	const initialSeconds = Math.ceil(shape.props.initialTime / 1000)
	const width = state.state === 'running' ? `${(remainingSeconds / initialSeconds) * 100}%` : '100%'
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
						onClick={() => stopTimer(shape, editor)}
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
						borderRadius: '5px',
						margin: '-2px',
						zIndex: 0,
						height: 'calc(100%' + ' + 4px)',
						position: 'absolute',
						top: 0,
						left: 0,
						backgroundColor: getBackgroundColor(shape.props.state.state, darkMode),
						border:
							shape.props.state.state === 'running'
								? `1px solid ${DefaultColorThemePalette.lightMode.red.solid}`
								: 'none',
						width,
					}}
				/>
				<div
					style={{
						zIndex: 1,
					}}
				>
					{formatTime(remainingTime)}
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
							onClick={() => startTimer(shape, editor)}
						>
							Play
						</button>
					)}
					{!showPlay && (
						<button
							onPointerDown={(e) => e.stopPropagation()}
							onClick={() => pauseTimer(shape, editor)}
						>
							Pause
						</button>
					)}
				</>
			)}
		</div>
	)
}
