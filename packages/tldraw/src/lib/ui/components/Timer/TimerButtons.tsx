import { Editor, TLTimerShapeProps, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'

const FIVE_SECONDS = 5 * 1000
const TEN_SECONDS = 10 * 1000
const THIRTY_SECONDS = 30 * 1000
const ONE_MINUTE = 60 * 1000
const FIVE_MINUTES = 5 * ONE_MINUTE

function updateTimer(props: Partial<TLTimerShapeProps>, editor: Editor) {
	editor.updateDocumentSettings({ meta: { timer: props } })
}

function startTimer(props: TLTimerShapeProps, editor: Editor) {
	updateTimer(
		{
			initialTime: props.initialTime,
			remainingTime: props.state.state === 'completed' ? props.initialTime : props.remainingTime,
			state: { state: 'running', lastStartTime: getCurrentServerTime() },
		},
		editor
	)
}

function stopTimer(props: TLTimerShapeProps, editor: Editor) {
	updateTimer(
		{
			initialTime: props.initialTime,
			remainingTime: props.initialTime,
			state: { state: 'stopped' },
		},
		editor
	)
}

function pauseTimer(props: TLTimerShapeProps, editor: Editor) {
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
}
export function getElapsedTime(props: TLTimerShapeProps) {
	if (props.state.state !== 'running') return 0
	return getCurrentServerTime() - props.state.lastStartTime
}

function getCurrentServerTime() {
	const offset = (window as any).serverOffset ?? 0
	return Date.now() + offset
}

export function CollapseButton({ onClick }: { onClick(): void }) {
	return (
		<TldrawUiButton
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={onClick}
			title="Collapse"
		>
			<TldrawUiButtonIcon icon="chevron-left" />
		</TldrawUiButton>
	)
}

export function ResetButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()
	return <TimerButton icon="undo" onClick={() => stopTimer(props, editor)} title="Reset" />
}

export function DecreaseTimeButton({ props }: { props: TLTimerShapeProps }) {
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
				state: props.state,
			},
			editor
		)
	}, [props.initialTime, editor, props.state])

	return (
		<TimerButton
			icon="minus"
			onClick={decreaseTime}
			disabled={state.state === 'running' || props.initialTime < TEN_SECONDS}
			title="Decrease time"
			small
		/>
	)
}

export function IncreaseTimeButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()

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
				state: props.state,
			},
			editor
		)
	}, [props.initialTime, editor, props.state])
	const state = props.state

	return (
		<TimerButton
			icon="plus"
			onClick={increaseTime}
			disabled={state.state === 'running'}
			title="Increase time"
			small
		/>
	)
}

export function PlayButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()
	return <TimerButton icon="play" onClick={() => startTimer(props, editor)} title="Start" />
}

export function PauseButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()
	return <TimerButton icon="pause" onClick={() => pauseTimer(props, editor)} title="Pause" />
}

function TimerButton({
	disabled = false,
	icon,
	onClick,
	small = false,
	title,
}: {
	disabled?: boolean
	icon: string
	onClick(): void
	small?: boolean
	title: string
}) {
	return (
		<TldrawUiButton
			type="icon"
			disabled={disabled}
			onPointerDown={(e) => e.stopPropagation()}
			onClick={onClick}
			title={title}
		>
			<TldrawUiIcon icon={icon} small={small} />
		</TldrawUiButton>
	)
}
