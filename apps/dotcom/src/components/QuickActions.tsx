import { useEffect, useRef, useState } from 'react'
import {
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TLTimerProps,
	TldrawUiButton,
	track,
	useEditor,
	useTimer,
	useToasts,
} from 'tldraw'
import { showTimer } from './Timer'

export const QuickActions = track(function QuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<TimerAction />
		</DefaultQuickActions>
	)
})

const TimerAction = track(function TimerAction() {
	const show = showTimer.get()
	const { timerProps } = useTimer()
	const [showedToast, setShowedToast] = useState(false)
	const { addToast } = useToasts()
	const editor = useEditor()
	const timeoutRef = useRef<number | undefined>(undefined)
	const audioRef = useRef<HTMLAudioElement | null>(null)

	useEffect(() => {
		if (!timerProps) return
		switch (timerProps.state.state) {
			case 'running':
			case 'paused':
			case 'stopped':
				if (showedToast) {
					setShowedToast(false)
				}
				break
			case 'completed': {
				if (showedToast) return
				addToast({
					id: 'timer-completed',
					severity: 'success',
					title: 'Timer Completed',
					description: 'The timer has completed',
					keepOpen: true,
				})
				audioRef.current?.play()

				timeoutRef.current = editor.timers.setTimeout(() => {
					const meta = editor.getDocumentSettings().meta
					const props = meta.timer as TLTimerProps | undefined
					if (!props || props.state.state !== 'completed') return
					editor.updateDocumentSettings({
						meta: {
							...meta,
							timer: {
								...props,
								remainingTime: props.initialTime,
								state: { state: 'stopped' },
							},
						},
					})
				}, 4000)

				break
			}
		}
		return () => {
			clearTimeout(timeoutRef.current)
		}
	}, [addToast, editor, showedToast, timerProps])

	useEffect(() => {
		if (!timerProps) return
		if (!show && timerProps.state.state === 'running') {
			showTimer.set(true)
		}
	}, [show, timerProps])
	return (
		<div
			className={`tlui-timer__quick-actions-wrapper${show ? ' tlui-timer__quick-actions-wrapper-active' : ''}`}
		>
			<TldrawUiButton
				type="icon"
				onClick={() => {
					showTimer.set(!show)
				}}
				disabled={timerProps?.state.state === 'running'}
			>
				<div>🕝</div>
			</TldrawUiButton>
			<audio ref={audioRef}>
				<source src="./Timer.mp3" type="audio/mp3" />
			</audio>
		</div>
	)
})
