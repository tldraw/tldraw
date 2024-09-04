import { Editor, TLTimerShapeProps, useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TldrawUiButton } from '../primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../primitives/Button/TldrawUiButtonIcon'
import { TldrawUiIcon } from '../primitives/TldrawUiIcon'

function updateTimer(props: Partial<TLTimerShapeProps>, editor: Editor) {
	editor.updateDocumentSettings({ meta: { timer: props } })
}

function startTimer(props: TLTimerShapeProps, editor: Editor) {
	updateTimer(
		{
			initialTime: props.initialTime,
			remainingTime: props.remainingTime,
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
		<TldrawUiButton type="icon" onPointerDown={(e) => e.stopPropagation()} onClick={onClick}>
			<TldrawUiButtonIcon icon="chevron-left" />
		</TldrawUiButton>
	)
}

export function StopButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()

	return (
		<TldrawUiButton
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={() => stopTimer(props, editor)}
		>
			<TldrawUiButtonIcon icon="geo-rectangle" />
		</TldrawUiButton>
	)
}

export function DecreaseTimeButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()

	const state = props.state
	const decreaseTime = useCallback(() => {
		const newTime = Math.max(
			0,
			props.initialTime < 5 * 60 * 1000
				? props.initialTime - 30 * 1000
				: props.initialTime - 60 * 1000
		)
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
		<TldrawUiButton
			disabled={state.state === 'running'}
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={decreaseTime}
		>
			<TldrawUiIcon icon="minus" />
		</TldrawUiButton>
	)
}

export function IncreaseTimeButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()

	const increaseTime = useCallback(() => {
		const newTime =
			props.initialTime < 5 * 60 * 1000
				? props.initialTime + 30 * 1000
				: props.initialTime + 60 * 1000
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
		<TldrawUiButton
			disabled={state.state === 'running'}
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={increaseTime}
		>
			<TldrawUiIcon icon="plus" />
		</TldrawUiButton>
	)
}

export function PlayButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()

	return (
		<TldrawUiButton
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={() => startTimer(props, editor)}
		>
			<div
				style={{
					transform: 'rotate(90deg)',
				}}
			>
				<TldrawUiIcon icon="geo-triangle" />
			</div>
		</TldrawUiButton>
	)
}

export function ResetPauseButton({ props }: { props: TLTimerShapeProps }) {
	const editor = useEditor()
	return (
		<TldrawUiButton
			type="icon"
			onPointerDown={(e) => e.stopPropagation()}
			onClick={() => {
				if (props.state.state === 'completed') {
					stopTimer(props, editor)
				} else {
					pauseTimer(props, editor)
				}
			}}
		>
			{props.state.state === 'completed' ? 'Reset' : 'Pause'}
		</TldrawUiButton>
	)
}
