import { DefaultQuickActions, DefaultQuickActionsContent, track, useTimer } from 'tldraw'
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

	return (
		<div
			className={`tlui-timer__quick-actions-wrapper${show ? ' tlui-timer__quick-actions-wrapper-active' : ''}`}
		>
			<div
				className="tlui-timer__quick-actions-icon-wrapper"
				onClick={() => {
					showTimer.set(!show)
				}}
			>
				<div>🕝</div>
			</div>

			{!show && timerProps && timerProps.state.state === 'running' && (
				<div className="tlui-timer__quick-actions-icon-notification"></div>
			)}
		</div>
	)
})
