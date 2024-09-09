import {
	DefaultColorThemePalette,
	exhaustiveSwitchError,
	useEditor,
	useIsDarkMode,
} from '@tldraw/editor'
import classNames from 'classnames'
import { useCallback } from 'react'
import { ONE_MINUTE, ONE_SECOND, TLTimerProps, TLTimerState } from './Timer'
import { updateTimer } from './TimerButtons'
import { useGetRemainingTime } from './useGetRemainingTime'
import { useTimerCounter } from './useTimerCounter'

function getBackgroundColor(state: TLTimerState, darkMode: boolean) {
	const scheme = darkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode

	switch (state) {
		case 'running':
			return scheme.red.semi
		case 'paused':
			return scheme.orange.semi
		case 'stopped':
			return undefined
		case 'completed':
			return scheme.green.semi
		default:
			exhaustiveSwitchError(state)
	}
}

function getBorderColor(state: TLTimerState, darkMode: boolean) {
	const scheme = darkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode

	switch (state) {
		case 'running':
			return scheme.red.solid
		case 'paused':
			return scheme.orange.solid
		case 'stopped':
		case 'completed':
			return undefined
		default:
			exhaustiveSwitchError(state)
	}
}

function formatTime(time: number) {
	return time.toString().padStart(2, '0')
}

export function Time({ props, onClick }: { props: TLTimerProps; onClick?(): void }) {
	const editor = useEditor()
	const darkMode = useIsDarkMode()
	const remainingTime = useGetRemainingTime(props)
	const state = props.state.state
	const _counter = useTimerCounter(state)
	if (remainingTime <= 0) {
		// Might be a better way to do this
		editor.timers.setTimeout(() => {
			editor.updateDocumentSettings({
				meta: {
					timer: {
						initialTime: props.initialTime,
						remainingTime: 0,
						state: { state: 'completed' },
					},
				},
			})
		}, 0)
	}
	const remainingSeconds = Math.ceil(remainingTime / 1000)
	const initialSeconds = Math.ceil(props.initialTime / 1000)
	const active = state === 'running' || state === 'paused'
	const width = active ? `${(remainingSeconds / initialSeconds) * 100}%` : '100%'

	const handleKeyUp = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>, diff: number) => {
			if (active) return
			let change: number | undefined = undefined
			if (e.key === 'ArrowUp') {
				change = diff
				e.preventDefault()
				e.stopPropagation()
			} else if (e.key === 'ArrowDown') {
				change = -diff
				e.preventDefault()
				e.stopPropagation()
			}

			if (!change) return
			const newTime = Math.max(ONE_SECOND, props.initialTime + change)
			updateTimer(
				{
					...props,
					initialTime: newTime,
					remainingTime: newTime,
					state: newTime === 0 ? { state: 'completed' } : props.state,
				},
				editor
			)
		},
		[active, editor, props]
	)
	const handleMinuteChange = (e: React.KeyboardEvent<HTMLInputElement>) =>
		handleKeyUp(e, ONE_MINUTE)
	const handleSecondChange = (e: React.KeyboardEvent<HTMLInputElement>) =>
		handleKeyUp(e, ONE_SECOND)

	const minutesText = formatTime(Math.floor(remainingSeconds / 60))
	const secondsText = formatTime(remainingSeconds % 60)
	return (
		<div
			className={classNames('tlui-timer__time-wrapper', {
				'tlui-timer__time-wrapper-clickable': onClick,
				'tlui-timer__time-wrapper-active': active && !onClick,
			})}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={() => {
				onClick?.()
			}}
		>
			<div
				className="tlui-timer__time-color-background"
				style={{
					backgroundColor: getBackgroundColor(props.state.state, darkMode),
					borderRight: active ? `1px solid ${getBorderColor(props.state.state, darkMode)}` : 'none',
					width,
				}}
			/>
			{active || onClick ? (
				<div className="tlui-timer__time-text">{minutesText}</div>
			) : (
				<input
					onChange={(e) => {
						console.log(e)
					}}
					value={minutesText}
					// disabled={active}
					className="tlui-timer__time-text"
					onKeyUp={handleMinuteChange}
				/>
			)}
			<div className="tlui-timer__time-text">:</div>
			{active || onClick ? (
				<div className="tlui-timer__time-text">{secondsText}</div>
			) : (
				<input
					disabled={active}
					className="tlui-timer__time-text"
					value={secondsText}
					onChange={(e) => {
						console.log(e.target.value)
					}}
					onKeyUp={handleSecondChange}
				/>
			)}
		</div>
	)
}
