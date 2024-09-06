import { useEffect } from 'react'
import {
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TldrawUiButton,
	track,
	useTimer,
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
	useEffect(() => {
		if (!show && timerProps?.state.state === 'running') {
			showTimer.set(true)
		}
	}, [show, timerProps?.state.state])
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
		</div>
	)
})
