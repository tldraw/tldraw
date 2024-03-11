import {
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomQuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<div style={{ backgroundColor: 'thistle' }}>
				<TldrawUiMenuItem id="code" icon="code" onSelect={() => window.alert('code')} />
			</div>
		</DefaultQuickActions>
	)
}

const components: TLComponents = {
	QuickActions: CustomQuickActions, // null will hide the page menu instead
}

export default function CustomQuickActionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
