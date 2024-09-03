import { DefaultQuickActions, DefaultQuickActionsContent, track } from 'tldraw'
import { showTimer } from './Timer'

export const QuickActions = track(function QuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<div
				style={{
					backgroundColor: showTimer.get() ? '#ddd' : '',
				}}
			>
				<div
					style={{
						margin: '0 5px',
						height: '100%',
						display: 'flex',
						alignItems: 'center',
						pointerEvents: 'all',
					}}
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
