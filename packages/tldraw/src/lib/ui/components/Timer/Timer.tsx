import {
	DefaultColorThemePalette,
	Editor,
	TLTimerShapeProps,
	TLTimerState,
	exhaustiveSwitchError,
} from '@tldraw/editor'
import { useCallback, useState } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
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

function startTimer(store: TimerProps['store']) {
	store({
		state: { state: 'running', lastStartTime: getCurrentServerTime() },
	})
}

function stopTimer(props: TLTimerShapeProps, store: TimerProps['store']) {
	store({
		remainingTime: props.initialTime,
		state: { state: 'stopped' },
	})
}

function pauseTimer(props: TLTimerShapeProps, store: TimerProps['store']) {
	if (props.state.state !== 'running') return
	const elapsed = getElapsedTime(props)
	store({
		remainingTime: Math.max(0, props.remainingTime - elapsed),
		state: { state: 'paused' },
	})
}
function getElapsedTime(props: TLTimerShapeProps) {
	if (props.state.state !== 'running') return 0
	return getCurrentServerTime() - props.state.lastStartTime
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

function getTimeRemaining(props: TLTimerShapeProps) {
	switch (props.state.state) {
		case 'running':
			return props.remainingTime - getElapsedTime(props)
		case 'stopped':
			return props.initialTime
		case 'paused':
			return props.remainingTime
		case 'completed':
			return 0
		default:
			exhaustiveSwitchError(props.state)
	}
}

/** @public */
export interface TimerProps {
	props: TLTimerShapeProps
	editor: Editor
	store(timer: Partial<TLTimerShapeProps>): void
}

/** @public @react */
export function Timer({ props, editor, store }: TimerProps) {
	const remainingTime = getTimeRemaining(props)
	const darkMode = editor.user.getIsDarkMode()
	const [isExpanded, setIsExpanded] = useState(true)
	const state = props.state
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _counter = useTimer(props.state.state)
	if (remainingTime <= 0) {
		editor.timers.setTimeout(() => {
			store({ state: { state: 'completed' } })
		}, 0)
	}
	const increaseTime = useCallback(() => {
		const newTime =
			props.initialTime < 5 * 60 * 1000
				? props.initialTime + 30 * 1000
				: props.initialTime + 60 * 1000
		store({
			initialTime: newTime,
			remainingTime: newTime,
		})
	}, [props.initialTime, store])

	const showPlay = (state.state === 'stopped' || state.state === 'paused') && remainingTime > 0
	const remainingSeconds = Math.ceil(remainingTime / 1000)
	const initialSeconds = Math.ceil(props.initialTime / 1000)
	const width =
		state.state === 'running' || state.state === 'paused'
			? `${(remainingSeconds / initialSeconds) * 100}%`
			: '100%'
	return (
		<div
			style={{
				pointerEvents: 'all',
				display: 'flex',
				alignItems: 'stretch',
				backgroundColor: 'var(--color-background)',
				boxShadow: 'var(--shadow-2)',
				borderRadius: 'var(--radius-3',
			}}
		>
			{isExpanded && (
				<>
					<TldrawUiButton
						type="icon"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => setIsExpanded(false)}
					>
						<TldrawUiButtonIcon icon="cross-2" />
					</TldrawUiButton>
					<TldrawUiButton
						type="icon"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={() => stopTimer(props, store)}
					>
						<TldrawUiButtonIcon icon="geo-rectangle" />
					</TldrawUiButton>
				</>
			)}

			{isExpanded && (
				<TldrawUiButton
					type="icon"
					onPointerDown={(e) => e.stopPropagation()}
					onClick={increaseTime}
				>
					<TldrawUiIcon icon="minus" />
				</TldrawUiButton>
			)}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					width: '60px',
					overflow: 'hidden',
					border: '1px solid black',
					borderRadius: '3px',
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
						borderRadius: '3px',
						margin: '-2px',
						zIndex: 0,
						height: 'calc(100%' + ' + 4px)',
						position: 'absolute',
						top: 0,
						left: 0,
						backgroundColor: getBackgroundColor(props.state.state, darkMode),
						border:
							props.state.state === 'running' || props.state.state === 'paused'
								? `1px solid ${DefaultColorThemePalette.lightMode.red.solid}`
								: 'none',
						width: `calc(${width} + 3px)`,
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
					<TldrawUiButton
						type="icon"
						onPointerDown={(e) => e.stopPropagation()}
						onClick={increaseTime}
					>
						<TldrawUiIcon icon="plus" />
					</TldrawUiButton>
					{showPlay && (
						<TldrawUiButton
							type="icon"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={() => startTimer(store)}
						>
							<div
								style={{
									transform: 'rotate(90deg)',
								}}
							>
								<TldrawUiIcon icon="geo-triangle" />
							</div>
						</TldrawUiButton>
					)}
					{!showPlay && (
						<TldrawUiButton
							type="icon"
							onPointerDown={(e) => e.stopPropagation()}
							onClick={() => {
								if (props.state.state === 'completed') {
									stopTimer(props, store)
								} else {
									pauseTimer(props, store)
								}
							}}
						>
							<TldrawUiButtonIcon icon="geo-arrow-up" />
						</TldrawUiButton>
					)}
				</>
			)}
		</div>
	)
}
