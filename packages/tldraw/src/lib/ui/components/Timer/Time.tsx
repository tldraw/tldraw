import {
	DefaultColorThemePalette,
	exhaustiveSwitchError,
	track,
	useEditor,
	useIsDarkMode,
} from '@tldraw/editor'
import classNames from 'classnames'
import { useCallback, useEffect, useState } from 'react'
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

export const Time = track(function Time({
	props,
	onClick,
}: {
	props: TLTimerProps
	onClick?(): void
}) {
	const editor = useEditor()
	const darkMode = useIsDarkMode()
	const remainingTime = useGetRemainingTime(props)
	const [inputTime, setInputTime] = useState(remainingTime)
	const [minutesFocused, setMinutesFocused] = useState(false)
	const [secondsFocused, setSecondsFocus] = useState(false)

	useEffect(() => {
		setInputTime(remainingTime)
	}, [remainingTime])

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

	const handleInputBlur = useCallback(() => {
		const newTime = Math.max(ONE_SECOND, inputTime)
		setInputTime(newTime)
		updateTimer(
			{
				...props,
				initialTime: newTime,
				remainingTime: newTime,
				state: newTime === 0 ? { state: 'completed' } : props.state,
			},
			editor
		)
	}, [editor, inputTime, props])

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
			} else if (e.key === 'Enter') {
				handleInputBlur()
			}

			if (!change) return
			setInputTime((prev) => Math.max(ONE_SECOND, prev + change))
		},
		[active, handleInputBlur]
	)
	const handleMinuteChange = (e: React.KeyboardEvent<HTMLInputElement>) =>
		handleKeyUp(e, ONE_MINUTE)
	const handleSecondChange = (e: React.KeyboardEvent<HTMLInputElement>) =>
		handleKeyUp(e, ONE_SECOND)

	const minutesRunning = formatTime(Math.floor(remainingSeconds / 60))
	const allInputSeconds = inputTime / 1000
	const inputMintues = Math.floor(allInputSeconds / 60)
	const secondsRunning = formatTime(remainingSeconds % 60)
	const inputSeconds = Math.floor(allInputSeconds % 60)
	const editingInputs = minutesFocused || secondsFocused
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
				<div className="tlui-timer__time-text">{minutesRunning}</div>
			) : (
				<Input
					value={editingInputs ? inputMintues.toString() : minutesRunning}
					onKeyUp={handleMinuteChange}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
						const newValue = parseInt(e.target.value)
						const setTo = (isNaN(newValue) ? 0 : newValue * ONE_MINUTE) + inputSeconds * ONE_SECOND
						setInputTime(Math.max(ONE_SECOND, setTo))
					}}
					onBlur={() => {
						setMinutesFocused(false)
						handleInputBlur()
					}}
					onFocus={() => setMinutesFocused(true)}
				/>
			)}
			<div className="tlui-timer__time-separator">:</div>
			{active || onClick ? (
				<div className="tlui-timer__time-text">{secondsRunning}</div>
			) : (
				<Input
					value={editingInputs ? (inputSeconds ? inputSeconds.toString() : '') : secondsRunning}
					onKeyUp={handleSecondChange}
					onBlur={() => {
						setSecondsFocus(false)
						handleInputBlur()
					}}
					onFocus={() => {
						setSecondsFocus(true)
						handleInputBlur()
					}}
					onChange={(e) => {
						const newValue = parseInt(e.target.value)
						const setTo = (isNaN(newValue) ? 0 : newValue * ONE_SECOND) + inputMintues * ONE_MINUTE
						setInputTime(Math.max(ONE_SECOND, setTo))
					}}
				/>
			)}
		</div>
	)
})

function Input({
	value,
	onBlur,
	onChange,
	onFocus,
	onKeyUp,
}: {
	value: string
	onBlur(): void
	onChange(e: React.ChangeEvent<HTMLInputElement>): void
	onFocus(): void
	onKeyUp(e: React.KeyboardEvent<HTMLInputElement>): void
}) {
	return (
		<input
			inputMode="numeric"
			maxLength={2}
			onBlur={onBlur}
			onFocus={onFocus}
			onChange={onChange}
			value={value}
			// disabled={active}
			className="tlui-timer__time-text"
			onKeyUp={onKeyUp}
		/>
	)
}
