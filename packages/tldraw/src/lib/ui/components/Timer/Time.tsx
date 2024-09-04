import {
	DefaultColorThemePalette,
	TLTimerShapeProps,
	TLTimerState,
	exhaustiveSwitchError,
	useEditor,
	useIsDarkMode,
} from '@tldraw/editor'
import { getTimeRemaining } from './Timer'
import { useTimer } from './useTimer'

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

export function Time({
	props,
	isExpanded,
	setIsExpanded,
}: {
	props: TLTimerShapeProps
	isExpanded: boolean
	setIsExpanded(b: boolean): void
}) {
	const editor = useEditor()
	const darkMode = useIsDarkMode()
	const state = props.state
	const remainingTime = getTimeRemaining(props)
	const _counter = useTimer(props.state.state)
	if (remainingTime <= 0) {
		editor.timers.setTimeout(() => {
			editor.updateDocumentSettings({
				meta: {
					timer: {
						initialTime: props.initialTime,
						remainingTime: props.remainingTime,
						state: { state: 'completed' },
					},
				},
			})
		}, 0)
	}
	const remainingSeconds = Math.ceil(remainingTime / 1000)
	const initialSeconds = Math.ceil(props.initialTime / 1000)
	const width =
		state.state === 'running' || state.state === 'paused'
			? `${(remainingSeconds / initialSeconds) * 100}%`
			: '100%'
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				width: '60px',
				overflow: 'hidden',
				background: '#eee',
				height: '100%',
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
	)
}
