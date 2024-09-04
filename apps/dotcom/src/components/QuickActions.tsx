import { DefaultQuickActions, DefaultQuickActionsContent, track } from 'tldraw'
import { showTimer } from './Timer'

export const QuickActions = track(function QuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<div className={showTimer.get() ? 'tlui-timer__quick-actions-wrapper-active' : undefined}>
				<div
					className="tlui-timer__quick-actions-icon-wrapper"
					onClick={() => {
						showTimer.set(!showTimer.get())
					}}
				>
					<div>🕝</div>
				</div>
			</div>
		</DefaultQuickActions>
	)
})
