import {
	DefaultColorThemePalette,
	exhaustiveSwitchError,
	useEditor,
	useIsDarkMode,
} from '@tldraw/editor'
import classNames from 'classnames'
import { TLTimerProps, TLTimerState, getTimeRemaining } from './Timer'
import { useTimer } from './useTimer'

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

export function Time({ props, onClick }: { props: TLTimerProps; onClick?(): void }) {
	const editor = useEditor()
	const darkMode = useIsDarkMode()
	const state = props.state.state
	const remainingTime = getTimeRemaining(props)
	const _counter = useTimer(props.state.state)
	if (remainingTime <= 0) {
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
			<div className="tlui-timer__time-text">{formatTime(remainingTime)}</div>
		</div>
	)
}
