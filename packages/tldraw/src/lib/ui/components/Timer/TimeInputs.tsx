import { useEditor, useIsDarkMode } from '@tldraw/editor'
import { useCallback, useEffect, useState } from 'react'
import { ONE_MINUTE, ONE_SECOND, TLTimerProps } from './Timer'
import { updateTimer } from './TimerButtons'
import {
	formatTime,
	getBackgroundColor,
	getBorderColor,
	getMinutesAndSeconds,
} from './timerHelpers'

export function TimeInputs({
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
	const darkMode = useIsDarkMode()
	const [inputTime, setInputTime] = useState(remainingTime)

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

	const {
		allSeconds: allSecondsRemaining,
		seconds: secondsRemaining,
		minutes: minutesRemaining,
	} = getMinutesAndSeconds(remainingTime)

	const { seconds: inputSeconds, minutes: inputMintues } = getMinutesAndSeconds(inputTime)

	const { allSeconds: allInitialSeconds } = getMinutesAndSeconds(props.initialTime)
	const width = active ? `${(allSecondsRemaining / allInitialSeconds) * 100}%` : '100%'
	const canEdit = !active && !onClick
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
			<TimeInput
				remainingTime={minutesRemaining}
				inputTime={inputMintues}
				onKeyUp={handleMinuteChange}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					const newValue = parseInt(e.target.value)
					const setTo = (isNaN(newValue) ? 0 : newValue * ONE_MINUTE) + inputSeconds * ONE_SECOND
					setInputTime(Math.max(ONE_SECOND, setTo))
				}}
				onBlur={() => handleInputBlur()}
				canEdit={canEdit}
			/>
			<div className="tlui-timer__time-separator">:</div>
			<TimeInput
				remainingTime={secondsRemaining}
				inputTime={inputSeconds}
				onKeyUp={handleSecondChange}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
					const newValue = parseInt(e.target.value)
					const setTo = inputMintues * ONE_MINUTE + (isNaN(newValue) ? 0 : newValue * ONE_SECOND)
					setInputTime(Math.max(ONE_SECOND, setTo))
				}}
				onBlur={() => handleInputBlur()}
				canEdit={canEdit}
			/>
		</>
	)
}

function TimeInput({
	canEdit,
	remainingTime,
	inputTime,
	onKeyUp,
	onChange,
	onBlur,
}: {
	canEdit: boolean
	remainingTime: number
	inputTime: number
	onKeyUp(e: React.KeyboardEvent<HTMLInputElement>): void
	onChange(e: React.ChangeEvent<HTMLInputElement>): void
	onBlur(): void
}) {
	const [focused, setFocused] = useState(false)
	const value = focused ? inputTime.toString() : formatTime(remainingTime)
	return (
		<>
			{canEdit ? (
				<input
					inputMode="numeric"
					maxLength={2}
					onBlur={() => {
						setFocused(false)
						onBlur()
					}}
					onFocus={() => setFocused(true)}
					onChange={onChange}
					value={value}
					className="tlui-timer__time-text"
					onKeyUp={onKeyUp}
				/>
			) : (
				<div className="tlui-timer__time-text">{value}</div>
			)}
		</>
	)
}
