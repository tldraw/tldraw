import { useEditor, useIsDarkMode } from '@tldraw/editor'
import { useCallback, useEffect, useState } from 'react'
import { ONE_MINUTE, ONE_SECOND, TLTimerProps } from './Timer'
import { updateTimer } from './TimerButtons'
import { formatTime, getBackgroundColor, getBorderColor } from './timerHelpers'

export function TimeInput({
	active,
	remainingTime,
	props,
	onClick,
}: {
	active: boolean
	remainingTime: number
	props: TLTimerProps
	onClick?(): void
}) {
	const editor = useEditor()

	const [inputTime, setInputTime] = useState(remainingTime)
	const [minutesFocused, setMinutesFocused] = useState(false)
	const [secondsFocused, setSecondsFocus] = useState(false)
	const darkMode = useIsDarkMode()

	useEffect(() => {
		setInputTime(remainingTime)
	}, [remainingTime])
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

	const remainingSeconds = Math.ceil(remainingTime / 1000)
	const initialSeconds = Math.ceil(props.initialTime / 1000)
	const width = active ? `${(remainingSeconds / initialSeconds) * 100}%` : '100%'
	const minutesRunning = formatTime(Math.floor(remainingSeconds / 60))
	const allInputSeconds = inputTime / 1000
	const inputMintues = Math.floor(allInputSeconds / 60)
	const secondsRunning = formatTime(remainingSeconds % 60)
	const inputSeconds = Math.floor(allInputSeconds % 60)

	let minutesString = minutesRunning
	if (minutesFocused) {
		minutesString = inputMintues.toString()
	}
	let secondsString = secondsRunning
	if (secondsFocused) {
		secondsString = inputSeconds.toString()
	}

	return (
		<>
			<div
				className="tlui-timer__time-color-background"
				style={{
					backgroundColor: getBackgroundColor(props.state.state, darkMode),
					borderRight: active ? `1px solid ${getBorderColor(props.state.state, darkMode)}` : 'none',
					width,
				}}
			/>
			<MinutesInput
				inputString={minutesString}
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
				running={minutesRunning}
				setFocused={setMinutesFocused}
				notEditable={active || onClick !== undefined}
			/>
			<div className="tlui-timer__time-separator">:</div>
			<MinutesInput
				inputString={secondsString}
				onKeyUp={handleSecondChange}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					const newValue = parseInt(e.target.value)
					const setTo = inputMintues * ONE_MINUTE + (isNaN(newValue) ? 0 : newValue * ONE_SECOND)
					setInputTime(Math.max(ONE_SECOND, setTo))
				}}
				onBlur={() => {
					setSecondsFocus(false)
					handleInputBlur()
				}}
				onFocus={() => setSecondsFocus(true)}
				running={secondsRunning}
				setFocused={setSecondsFocus}
				notEditable={active || onClick !== undefined}
			/>
		</>
	)
}

function MinutesInput({
	running,
	inputString,
	onKeyUp,
	onChange,
	onBlur,
	onFocus,
	notEditable,
}: {
	inputString: string
	running: string
	onKeyUp(e: React.KeyboardEvent<HTMLInputElement>): void
	onChange(e: React.ChangeEvent<HTMLInputElement>): void
	onBlur(): void
	onFocus(): void
	setFocused(focused: boolean): void
	notEditable: boolean
}) {
	return (
		<>
			{notEditable ? (
				<div className="tlui-timer__time-text">{running}</div>
			) : (
				<input
					inputMode="numeric"
					maxLength={2}
					onBlur={onBlur}
					onFocus={onFocus}
					onChange={onChange}
					value={inputString}
					className="tlui-timer__time-text"
					onKeyUp={onKeyUp}
				/>
			)}
		</>
	)
}
