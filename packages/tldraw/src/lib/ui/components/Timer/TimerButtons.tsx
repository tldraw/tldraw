import { Editor, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { useTimer } from '../../hooks/useTimer'
import { TLUiTranslationKey } from '../../hooks/useTranslation/TLUiTranslationKey'
import { useTranslation } from '../../hooks/useTranslation/useTranslation'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'
import {
	FIVE_MINUTES,
	FIVE_SECONDS,
	ONE_MINUTE,
	TEN_SECONDS,
	THIRTY_SECONDS,
	TLTimerProps,
} from './Timer'

/** @internal */
export function updateTimer(props: TLTimerProps, editor: Editor) {
	editor.updateDocumentSettings({ meta: { timer: props as any } })
}

export function CollapseButton({ onClick }: { onClick(): void }) {
	return <TimerButton icon="chevrons-sw" onClick={onClick} title="timer.collapse" />
}

export function ResetButton({ props }: { props: TLTimerProps }) {
	const editor = useEditor()
	const disabled = props.state.state === 'stopped'
	const handleClick = useCallback(() => {
		updateTimer(
			{
				initialTime: props.initialTime,
				remainingTime: props.initialTime,
				state: { state: 'stopped' },
			},
			editor
		)
	}, [editor, props.initialTime])

	return <TimerButton disabled={disabled} icon="undo" onClick={handleClick} title="timer.reset" />
}

export function DecreaseTimeButton({ props }: { props: TLTimerProps }) {
	const editor = useEditor()

	const state = props.state
	const decreaseTime = useCallback(() => {
		let newTime: number
		if (props.initialTime <= THIRTY_SECONDS) {
			newTime = props.initialTime - FIVE_SECONDS
		} else if (props.initialTime <= FIVE_MINUTES) {
			newTime = props.initialTime - THIRTY_SECONDS
		} else {
			newTime = props.initialTime - ONE_MINUTE
		}
		updateTimer(
			{
				initialTime: newTime,
				remainingTime: newTime,
				state: state.state === 'completed' ? { state: 'stopped' } : state,
			},
			editor
		)
	}, [props.initialTime, state, editor])

	return (
		<TimerButton
			icon="minus"
			onClick={decreaseTime}
			disabled={state.state === 'running' || props.initialTime < TEN_SECONDS}
			title="timer.decrease-time"
		/>
	)
}

export function IncreaseTimeButton({ props }: { props: TLTimerProps }) {
	const editor = useEditor()
	const state = props.state

	const increaseTime = useCallback(() => {
		let newTime: number
		if (props.initialTime < THIRTY_SECONDS) {
			newTime = props.initialTime + FIVE_SECONDS
		} else if (props.initialTime < FIVE_MINUTES) {
			newTime = props.initialTime + THIRTY_SECONDS
		} else {
			newTime = props.initialTime + ONE_MINUTE
		}
		updateTimer(
			{
				initialTime: newTime,
				remainingTime: newTime,
				state: state.state === 'completed' ? { state: 'stopped' } : state,
			},
			editor
		)
	}, [props.initialTime, state, editor])

	return (
		<TimerButton
			icon="plus"
			onClick={increaseTime}
			disabled={state.state === 'running'}
			title="timer.increase-time"
		/>
	)
}

export function PlayButton({ props }: { props: TLTimerProps }) {
	const editor = useEditor()
	const { getCurrentServerTime } = useTimer()
	const handleClick = useCallback(() => {
		updateTimer(
			{
				initialTime: props.initialTime,
				remainingTime: props.state.state === 'completed' ? props.initialTime : props.remainingTime,
				state: { state: 'running', lastStartTime: getCurrentServerTime() },
			},
			editor
		)
	}, [editor, props, getCurrentServerTime])
	return <TimerButton icon="play" onClick={handleClick} title="timer.start" />
}

export function PauseButton({ props }: { props: TLTimerProps }) {
	const editor = useEditor()
	const { getElapsedTime } = useTimer()
	const handleClick = useCallback(() => {
		if (props.state.state !== 'running') return
		const elapsed = getElapsedTime(props)
		updateTimer(
			{
				initialTime: props.initialTime,
				remainingTime: Math.max(0, props.remainingTime - elapsed),
				state: { state: 'paused' },
			},
			editor
		)
	}, [editor, props, getElapsedTime])

	return <TimerButton icon="pause" onClick={handleClick} title="timer.pause" />
}

function TimerButton({
	disabled = false,
	icon,
	onClick,
	title,
}: {
	disabled?: boolean
	icon: string
	onClick(): void
	title: TLUiTranslationKey
}) {
	const msg = useTranslation()
	return (
		<TldrawUiButton
			type="icon"
			disabled={disabled}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={onClick}
			title={msg(title)}
		>
			<TldrawUiIcon icon={icon} small={true} />
		</TldrawUiButton>
	)
}
