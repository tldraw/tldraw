import {
	CenteredTopPanelContainer,
	DefaultToolbar,
	OfflineIndicator,
	useCollaborationStatus,
} from 'tldraw'
import './toolbar-top-panel.css'

// [1]
export const ToolbarTopPanel = function ToolbarTopPanel() {
	const isOffline = useCollaborationStatus() === 'offline'

	return (
		<CenteredTopPanelContainer>
			{/* [2] */}
			{isOffline && <OfflineIndicator />}
			{/* [3] */}
			<div
				className="toolbar-top-panel"
				style={{
					marginTop: isOffline ? '2px' : '0',
					paddingTop: '2px',
				}}
			>
				<DefaultToolbar />
			</div>
		</CenteredTopPanelContainer>
	)
}

/*
[1]
This is our custom TopPanel component that contains the default toolbar.

[2]
We preserve the offline indicator functionality from the original TopPanel.

[3]
We render the DefaultToolbar component with:
- Minimal top padding so it doesn't touch the screen edge
- A CSS class that handles:
  - Black background styling for the toolbar and lock button
  - White icons and text for visibility on the black background
  - Proper hover states for the black theme
  - Positioning the lock button absolutely to the right side of the toolbar
  - This prevents layout shifts when the button appears/disappears
  - Rotating the overflow menu chevron to point downward
  - Adding right margin to prevent the lock button from overlapping other UI
*/
